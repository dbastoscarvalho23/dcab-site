/* DCAB Consulting — Cloud Functions da área reservada (região: Bélgica, europe-west1) */
"use strict";
const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { beforeUserCreated } = require("firebase-functions/v2/identity");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const L = require("./logica");
const V = require("./vigilancia");
const F = require("./fontes");

// Segredo: HIBP_API_KEY é o mesmo do Observatório (mesmo projeto Firebase). A Hudson Rock e o ransomware.live não usam chave.
const HIBP_API_KEY = defineSecret("HIBP_API_KEY");

setGlobalOptions({ region: "europe-west1", maxInstances: 5 });
initializeApp();

/* Erros nos registos sem emails nem endereços IP */
const limparRegisto = (v) => String((v && v.message) || v || "")
  .replace(/[^\s@<>"']+@[^\s@<>"']+/g, "[email]")
  .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[ip]")
  .replace(/\b[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}\b/gi, (m) => (/[0-9a-f]/i.test(m) ? "[ip]" : m))
  .slice(0, 500);
const registarErro = (contexto, e) => console.error(JSON.stringify({ severity: "ERROR", evento: "erro_funcao", contexto, message: limparRegisto(e) }));

const PROJETO = "ai4cybersecurity";
const db = () => getFirestore();

const contexto = {
  agora: () => new Date().toISOString(),
  async lerAcesso(email) {
    const s = await db().collection("acessos").doc(email).get();
    return s.exists ? s.data() : null;
  },
  async gravarAcesso(email, dados, juntar) {
    await db().collection("acessos").doc(email).set(dados, { merge: !!juntar });
  },
  async listarAcessos() {
    const s = await db().collection("acessos").get();
    return s.docs.map((d) => ({ email: d.id, ...d.data() }));
  },
  async contarAdminsAtivos() {
    const s = await db().collection("acessos").where("papel", "==", "admin").where("ativo", "==", true).get();
    return s.size;
  },
  async obterUtilizador(email) {
    try {
      const u = await getAuth().getUserByEmail(email);
      return {
        uid: u.uid, desativada: u.disabled,
        mfa: !!(u.multiFactor && u.multiFactor.enrolledFactors && u.multiFactor.enrolledFactors.length),
        ultimoAcesso: u.metadata && u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
      };
    } catch (e) {
      if (e.code === "auth/user-not-found") return null;
      throw e;
    }
  },
  async criarUtilizador(email, nome, senha) {
    await getAuth().createUser({ email, password: senha, displayName: nome || undefined, emailVerified: false });
  },
  async atualizarUtilizador(uid, props) { await getAuth().updateUser(uid, props); },
  async revogarSessoes(uid) { await getAuth().revokeRefreshTokens(uid); },
  async auditar(r) {
    await db().collection("projetos").doc(PROJETO).collection("auditoria").add({
      acao: r.acao, colecao: r.colecao, docId: r.docId, resumo: String(r.resumo).slice(0, 200), por: r.por, em: FieldValue.serverTimestamp(),
    });
  },
};

// Converte erros da lógica em erros que o navegador entende
const executar = (fn) => async (request) => {
  try {
    return await fn(contexto, request.auth, request.data);
  } catch (e) {
    if (e instanceof L.ErroAcesso) throw new HttpsError(e.codigo, e.message);
    registarErro("acessos", e);
    throw new HttpsError("internal", "Erro no servidor. Tente novamente.");
  }
};

exports.convidar = onCall(executar(L.convidar));
exports.listarAcessos = onCall(executar(L.listar));
exports.alterarAcesso = onCall(executar(L.alterar));

// Bloqueia a criação de contas sem convite (Google ou email)
exports.antesDeCriarConta = beforeUserCreated(async (event) => {
  try {
    await L.permitirCriacao(contexto, event.data);
  } catch (e) {
    if (e instanceof L.ErroAcesso) throw new HttpsError("permission-denied", "Acesso apenas por convite.");
    registarErro("acessos", e);
    throw new HttpsError("internal", "Erro ao validar o convite.");
  }
});

/* ================= Vigilância de exposição (Hudson Rock, ransomware.live, HIBP) =================
 * clientes/{cliente}: { nome, ativo, ultimaRecolha, ultimosNovos }                    — equipa e cliente
 * clientes/{cliente}/interno/config: { dominios[], nomes[], hibp, hudson{}, hibpUltimaFuga, ultimoErro } — só a equipa
 * clientes/{cliente}/alertas/{id}: alertas sem palavras-passe, cookies nem IP (ver vigilancia.js)
 * clientes/{cliente}/alertas_fonte/{id}: identificador do registo na fonte — só a equipa
 * A recolha corre de 6 em 6 horas e pode ser pedida pelo administrador.
 */
const DIA = 86400000;
const mesAtual = () => new Date().toISOString().slice(0, 7);

async function gravarAlerta(ref, a) {
  const expira = new Date(Date.now() + 1095 * DIA);
  try {
    await ref.collection("alertas").doc(a.id).create({
      ...a.dados, criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: "sistema", expira,
    });
    await ref.collection("alertas_fonte").doc(a.id).set({ ...a.interno, fonte: a.dados.fonte, expira });
    return 1;
  } catch (e) {
    if (e.code === 6) return 0; // já existe: mantém o estado que a equipa ou o cliente definiram
    throw e;
  }
}

async function recolherCliente(id, chaves, contexto) {
  const ref = db().collection("clientes").doc(id);
  const refCfg = ref.collection("interno").doc("config");
  const cfg = (await refCfg.get()).data() || {};
  const dominios = (cfg.dominios || []).map((d) => String(d).trim().toLowerCase()).filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)).slice(0, 10);
  const nomes = (cfg.nomes || []).map((n) => String(n).trim()).filter(Boolean).slice(0, 5);
  if (!dominios.length) return "sem domínios";
  const novaCfg = {};
  const erros = [];
  let novos = 0;

  // 1. Hudson Rock (estatísticas públicas, sem chave): alerta quando um total sobe face à recolha anterior
  const hudsonAnterior = cfg.hudson || {};
  const hudsonAtual = {};
  for (const d of dominios) {
    try {
      const atual = await F.hudsonResumo(d);
      hudsonAtual[d.replace(/\./g, "_")] = atual;
      for (const a of V.alertasHudson(atual, hudsonAnterior[d.replace(/\./g, "_")] || null, d, mesAtual())) {
        if (await gravarAlerta(ref, a)) { novos++; continue; }
        if (a.incremento) {
          // O alerta do mês de clientes do serviço já existe: soma os novos ao total, sem tocar no estado nem nas notas
          const refA = ref.collection("alertas").doc(a.id);
          const n = ((((await refA.get()).data() || {}).detalhes || {}).total || 0) + a.incremento;
          await refA.update({ "detalhes.total": n, titulo: `${n} clientes do serviço com credenciais roubadas (${mesAtual()})`, atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: "sistema" });
        }
      }
    } catch (e) { erros.push("Hudson Rock " + d + ": " + e.message); }
  }
  if (Object.keys(hudsonAtual).length) novaCfg.hudson = { ...hudsonAnterior, ...hudsonAtual };

  // 2. ransomware.live: vítimas publicadas com o domínio ou o nome do cliente
  for (const termo of [...dominios, ...nomes]) {
    try {
      const vitimas = await F.ransomwareProcurar(termo);
      for (const v of vitimas) if (V.corresponde(v, dominios, nomes)) novos += await gravarAlerta(ref, V.alertaRansomware(v, termo));
    } catch (e) { erros.push("ransomware.live " + termo + ": " + e.message); }
  }

  // 3. HIBP: só domínios verificados no painel da DCAB e só quando há fuga nova (ou na primeira vez)
  if (chaves.hibp && cfg.hibp === true && contexto.ultimaFuga) {
    if (cfg.hibpUltimaFuga !== contexto.ultimaFuga) {
      for (const d of dominios) {
        try {
          if (!(await F.hibpDominioVerificado(chaves.hibp, d))) { erros.push("HIBP: " + d + " não está verificado no painel"); continue; }
          const mapa = (await F.hibpDominio(chaves.hibp, d)) || {};
          const porFuga = {};
          for (const [alias, fugas] of Object.entries(mapa)) for (const n of fugas) (porFuga[n] ||= []).push(`${alias}@${d}`);
          for (const [nome, enderecos] of Object.entries(porFuga)) {
            const f = contexto.catalogo[nome];
            if (!f || f.IsSpamList || f.IsFabricated || f.IsRetired || f.IsMalware) continue;
            novos += await gravarAlerta(ref, V.alertaFugaHibp(f, enderecos, d));
          }
        } catch (e) { erros.push("HIBP " + d + ": " + e.message); }
      }
      if (!erros.some((x) => x.startsWith("HIBP"))) novaCfg.hibpUltimaFuga = contexto.ultimaFuga;
    }
  }

  await refCfg.set({ ...novaCfg, ultimoErro: erros.join(" · ").slice(0, 500) }, { merge: true });
  await ref.set({ ultimaRecolha: FieldValue.serverTimestamp(), ultimosNovos: novos }, { merge: true });
  return novos;
}

async function recolherTodos(chaves, { apenas = null, segundos = 480, paginas = 10 } = {}) {
  const ate = Date.now() + segundos * 1000;
  const contexto = { paginas, ultimaFuga: null, catalogo: {} };
  if (chaves.hibp) {
    try {
      const u = await F.hibpUltimaFuga();
      contexto.ultimaFuga = u && u.Name;
      contexto.catalogo = Object.fromEntries(((await F.hibpCatalogo()) || []).map((b) => [b.Name, b]));
    } catch (e) { console.warn("HIBP catálogo", e.message); }
  }
  const s = await db().collection("clientes").where("ativo", "==", true).get();
  const resultado = {};
  for (const d of s.docs) {
    if (apenas && d.id !== apenas) continue;
    if (Date.now() >= ate) { resultado[d.id] = "adiado"; continue; } // continua na recolha seguinte
    try { resultado[d.id] = await recolherCliente(d.id, chaves, contexto); } catch (e) {
      registarErro("recolha:" + d.id, e);
      await d.ref.collection("interno").doc("config").set({ ultimoErro: String(e.message).slice(0, 300) }, { merge: true });
      await d.ref.set({ ultimaRecolha: FieldValue.serverTimestamp() }, { merge: true });
      resultado[d.id] = "erro";
    }
  }
  return resultado;
}

// O valor «-» no segredo desliga o HIBP na vigilância
const chave = (s) => { const v = String(s.value() || "").trim(); return v && v !== "-" ? v : null; };
const chavesAtuais = () => ({ hibp: chave(HIBP_API_KEY) });

exports.recolherAlertas = onSchedule({ schedule: "every 6 hours", timeZone: "Europe/Lisbon", secrets: [HIBP_API_KEY], timeoutSeconds: 540, memory: "512MiB" },
  async () => { await recolherTodos(chavesAtuais(), { segundos: 480 }); });

exports.recolherAgora = onCall({ secrets: [HIBP_API_KEY], timeoutSeconds: 300 }, executar(async (ctx, auth, dados) => {
  const por = await L.verificarAdmin(ctx, auth);
  const cliente = String((dados && dados.cliente) || "");
  if (!/^[a-z0-9-]{2,40}$/.test(cliente)) throw new L.ErroAcesso("invalid-argument", "Cliente inválido.");
  const r = await recolherTodos(chavesAtuais(), { apenas: cliente, segundos: 240, paginas: 5 });
  await ctx.auditar({ acao: "recolher", colecao: "clientes", docId: cliente, resumo: "recolha manual: " + JSON.stringify(r), por });
  return r;
}));

/* ================= Incidentes: pedidos do formulário, tarefas de 15 em 15 minutos, abertura pelo CRM =================
 * POST /api/incidentes/pedido     ← Apps Script, quando o formulário traz o assunto «Incidente: pedido de apoio urgente»
 * POST /api/incidentes/tarefas    ← Apps Script, de 15 em 15 minutos: devolve as ações (pastas no Drive, partilhas, emails)
 * POST /api/incidentes/resultados ← Apps Script: resultado de cada ação (pastas criadas, ficheiros entregues, emails enviados)
 * POST /api/incidentes/abrir      ← CRM: abrir um incidente a partir da ficha de uma empresa
 * Assinatura HMAC-SHA256 (ver incidentes-api.js); cada identificador de pedido só é aceite uma vez (api_pedidos, TTL em «expira»).
 */
const { onRequest } = require("firebase-functions/v2/https");
const IA = require("./incidentes-api");
// Um segredo por origem: o Apps Script não pode abrir incidentes como o CRM, nem o CRM pedir as tarefas do Apps Script
const INCIDENTES_SEGREDO = defineSecret("INCIDENTES_SEGREDO");
const INCIDENTES_SEGREDO_CRM = defineSecret("INCIDENTES_SEGREDO_CRM");
let modPrazos = null;
const prazosMod = async () => (modPrazos ||= await import("./incidentes-prazos.mjs"));
const ESTADOS_ABERTOS = ["Por triar", "Aberto", "Contido", "Erradicado", "Recuperado"];
const carimboServidor = () => ({ criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
const idOk = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v);

async function configIncidentes() {
  return (await db().collection("config").doc("incidentes").get()).data() || {};
}

// Pessoas do cliente com a secção Incidentes (os acessos de cliente sem lista ficam só com a vigilância)
async function contactosCliente(cliente) {
  const s = await db().collection("acessos").where("clientes", "array-contains", cliente).get();
  return s.docs.filter((d) => { const a = d.data(); return a.ativo === true && a.papel === "cliente" && Array.isArray(a.seccoes) && a.seccoes.includes("incidentes"); }).map((d) => d.id);
}

async function evento(incRef, texto) {
  await incRef.collection("eventos").add({ texto: String(texto).slice(0, 1000), por: "sistema", em: FieldValue.serverTimestamp() });
}

// A referência é o identificador do documento: duas criações em simultâneo não ficam com o mesmo número
async function criarIncidente(cliRef, construir) {
  for (let t = 0; t < 3; t++) {
    try {
      return await db().runTransaction(async (tx) => {
        const s = await tx.get(cliRef.collection("incidentes").select("referencia"));
        const referencia = IA.proximaReferencia(new Date().getFullYear(), s.docs.map((d) => d.get("referencia")));
        const ref = cliRef.collection("incidentes").doc(referencia);
        tx.create(ref, construir(referencia));
        return { ref, referencia };
      });
    } catch (e) { if (e.code === 6 && t < 2) continue; throw e; }
  }
  throw new Error("Não foi possível reservar a referência do incidente.");
}

async function apiPedido(dados, idPedido) {
  const p = IA.lerPedidoFormulario(dados);
  const acesso = await db().collection("acessos").doc(p.email).get();
  const dom = IA.dominioDe(p.email);
  let porDominio = [];
  if (dom && !IA.DOMINIOS_GRATUITOS.includes(dom)) {
    porDominio = (await db().collection("clientes").where("dominiosEmail", "array-contains", dom).limit(2).get()).docs.map((d) => d.id);
  }
  let cliente = IA.identificarCliente(p.email, acesso.exists ? acesso.data() : null, porDominio);
  const cfg = await configIncidentes();
  const equipa = IA.unicos([cfg.responsavelPadrao, ...(cfg.equipaEmails || [])]);
  // O endereço do formulário não é verificado: limite de incidentes automáticos por cliente e por hora
  let motivo = cliente ? "" : "remetente não reconhecido";
  if (cliente) {
    const recentes = await db().collection("clientes").doc(cliente).collection("incidentes")
      .where("criadoEm", ">=", new Date(Date.now() - 3600000)).get();
    if (recentes.docs.filter((d) => d.get("origem") === "formulario").length >= IA.LIMITE_FORMULARIO_HORA) { motivo = "limite de pedidos automáticos por hora"; cliente = null; }
  }
  if (!cliente) {
    await db().collection("pedidosIncidente").doc(idPedido).set({
      ...p, estado: "Por triar", motivo, alertado: false, origem: "formulario", criadoEm: FieldValue.serverTimestamp(), expira: new Date(Date.now() + 365 * DIA),
    });
    return { resultado: "triagem" };
  }
  const cliRef = db().collection("clientes").doc(cliente);
  const cli = (await cliRef.get()).data() || {};
  const contactos = await contactosCliente(cliente);
  const { ref, referencia } = await criarIncidente(cliRef, (referencia) => IA.novoIncidente({
    // Título fixo: o texto do remetente (empresa, mensagem) não entra nos emails automáticos
    referencia, titulo: "Pedido de apoio pelo formulário do site", descricao: p.mensagem, detetadoEm: p.recebidoEm, entidadeNome: cli.nome || p.empresa,
    nipc: cli.nipc || "", pontoContacto: [p.nome, p.email, p.telefone].filter(Boolean).join(" · "), origem: "formulario",
    responsavelDcab: cfg.responsavelPadrao || "", contactosEmail: [p.email], criadoPor: "sistema",
  }, { ...carimboServidor(), resumoEm: IA.diaLisboa(Date.now()) }));
  const b = db().batch();
  const provas = IA.provasIniciais(p.email, Date.now(), "sistema", carimboServidor());
  for (const pr of provas) b.set(ref.collection("provas").doc(pr.id), pr.dados);
  b.set(ref.collection("eventos").doc(), { texto: `Pedido de apoio recebido pelo formulário do site (${p.nome}, ${p.email}). Provas P01 a P03 pedidas com prazo de 24 horas.`, por: "sistema", em: FieldValue.serverTimestamp() });
  await b.commit();
  return { resultado: "incidente", cliente, incidente: ref.id, referencia, clienteNome: cli.nome || cliente, nomePasta: IA.nomePasta(referencia, cli.nome || cliente),
    equipa, contactos: IA.unicos([p.email, ...contactos]),
    provas: provas.map((x) => ({ id: x.id, numero: x.dados.numero, descricao: x.dados.descricao, prazo: x.dados.prazo })) };
}

async function apiTarefas() {
  const cfg = await configIncidentes();
  const incidentes = [];
  for (const c of (await db().collection("clientes").get()).docs) {
    const abertos = await c.ref.collection("incidentes").where("estado", "in", ESTADOS_ABERTOS).get();
    if (abertos.empty) continue;
    const contactos = await contactosCliente(c.id);
    for (const i of abertos.docs) {
      const provas = (await i.ref.collection("provas").get()).docs.map((p) => ({ id: p.id, dados: p.data() }));
      const ficheirosIds = (await i.ref.collection("ficheiros").select().get()).docs.map((f) => f.id);
      const criado = i.get("criadoEm");
      incidentes.push({ cliente: c.id, clienteNome: c.get("nome") || c.id, id: i.id, dados: i.data(), provas, contactos, ficheirosIds,
        criadoMs: criado && criado.toMillis ? criado.toMillis() : 0 });
    }
  }
  // Só os pedidos ainda sem aviso (igualdades em dois campos: não precisa de índice composto)
  const triagem = (await db().collection("pedidosIncidente").where("estado", "==", "Por triar").where("alertado", "==", false).limit(50).get())
    .docs.map((d) => ({ id: d.id, dados: d.data() }));
  const P = await prazosMod();
  const acoes = IA.calcularAcoes({ config: cfg, incidentes, triagem }, Date.now(), P.calcularPrazos);
  // Alertas de vulnerabilidades: uma falha aqui não impede as ações dos incidentes
  try { acoes.push(...(await acoesVulnerabilidades(cfg))); } catch (e) { registarErro("tarefas:cve", e); }
  return { acoes };
}

async function apiResultados(dados) {
  const lista = Array.isArray(dados.resultados) ? dados.resultados.slice(0, 300) : [];
  let aplicados = 0;
  for (const { acao, resultado } of lista) {
    if (!acao || typeof acao.tipo !== "string") continue;
    if (acao.tipo.startsWith("cve-")) { aplicados += await aplicarResultadoCve(acao, resultado); continue; }
    const alteracoes = IA.resultadoParaAlteracoes(acao, resultado, Date.now());
    if (!alteracoes.length) continue;
    if (acao.tipo === "triagem") {
      if (!idOk(acao.pedido)) continue;
      try { await db().collection("pedidosIncidente").doc(acao.pedido).update(alteracoes[0].campos); aplicados++; } catch (e) { if (e.code !== 5) throw e; }
      continue;
    }
    if (!idOk(acao.cliente) || !idOk(acao.incidente)) continue;
    const incRef = db().collection("clientes").doc(acao.cliente).collection("incidentes").doc(acao.incidente);
    if (!(await incRef.get()).exists) continue;
    for (const a of alteracoes) {
      if (a.alvo === "incidente") await incRef.set(a.campos, { merge: true });
      else if (a.alvo === "prova" && idOk(acao.prova)) await incRef.collection("provas").doc(acao.prova).set(a.campos, { merge: true });
      else if (a.alvo === "ficheiro") {
        try { await incRef.collection("ficheiros").doc(a.id).create(a.campos); } catch (e) { if (e.code === 6) continue; throw e; }
        let prova = null;
        if (a.pastaId) {
          const s = await incRef.collection("provas").where("pastaId", "==", a.pastaId).limit(1).get();
          if (!s.empty) prova = s.docs[0];
        }
        if (prova && prova.get("estado") === "Pedida") {
          await prova.ref.set({ estado: "Recebida", recebidaEm: new Date().toISOString(), atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: "sistema" }, { merge: true });
        }
        await evento(incRef, `Ficheiro recebido no Google Drive: ${a.campos.nome} (${Math.round(a.campos.tamanho / 1024)} KB, SHA-256 ${a.campos.sha256 ? a.campos.sha256.slice(0, 16) + "…" : "por calcular"})` + (prova ? ` · prova ${prova.get("numero")}` : ""));
        aplicados++; continue;
      }
      if (a.evento) await evento(incRef, a.evento);
      aplicados++;
    }
  }
  return { aplicados };
}

async function apiAbrir(dados) {
  const nome = String(dados.nome || "").trim().slice(0, 150);
  const nipc = /^\d{9}$/.test(String(dados.nipc || "")) ? String(dados.nipc) : "";
  const entidadeId = String(dados.entidadeId || "").slice(0, 80);
  if (!nome || !/^[A-Za-z0-9_-]{4,80}$/.test(entidadeId)) throw new IA.ErroApi(400, "Indique o nome e o identificador da empresa no CRM.");
  const clientes = db().collection("clientes");
  let cli = (await clientes.where("crmEntidadeId", "==", entidadeId).limit(1).get()).docs[0];
  if (!cli && nipc) cli = (await clientes.where("nipc", "==", nipc).limit(1).get()).docs[0];
  let cliRef;
  if (cli) {
    cliRef = cli.ref;
    if (!cli.get("crmEntidadeId")) await cliRef.set({ crmEntidadeId: entidadeId }, { merge: true });
  } else {
    const ids = (await clientes.select().get()).docs.map((d) => d.id);
    cliRef = clientes.doc(IA.slugCliente(nome, ids));
    await cliRef.create({ nome, nipc, dominiosEmail: [], crmEntidadeId: entidadeId, ativo: false, criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: "crm" });
  }
  const cfg = await configIncidentes();
  const solicitante = IA.normEmail(dados.solicitante || "");
  const detetado = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dados.detetadoEm || "") ? dados.detetadoEm : new Date().toISOString();
  const contactos = (Array.isArray(dados.contactos) ? dados.contactos : []).map((c) => (c && c.email) || c);
  const { ref, referencia } = await criarIncidente(cliRef, (referencia) => IA.novoIncidente({
    referencia, titulo: dados.titulo || "Pedido de apoio: " + nome, descricao: dados.descricao || "", detetadoEm: detetado, entidadeNome: nome, nipc,
    origem: "crm", responsavelDcab: IA.emailOk(solicitante) ? solicitante : cfg.responsavelPadrao || "", contactosEmail: contactos,
    crm: { entidadeId }, criadoPor: "crm",
  }, { ...carimboServidor(), resumoEm: IA.diaLisboa(Date.now()) }));
  await evento(ref, "Incidente aberto a partir do CRM" + (IA.emailOk(solicitante) ? ` por ${solicitante}` : "") + ".");
  return { cliente: cliRef.id, incidente: ref.id, referencia, url: IA.URL_AREA };
}

exports.incidentesApi = onRequest({ secrets: [INCIDENTES_SEGREDO, INCIDENTES_SEGREDO_CRM], timeoutSeconds: 300, memory: "512MiB", invoker: "public", maxInstances: 2 }, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    if (req.method !== "POST") throw new IA.ErroApi(405, "Método não permitido.");
    const corpo = req.rawBody ? req.rawBody.toString("utf8") : "";
    if (corpo.length > 500000) throw new IA.ErroApi(413, "Pedido demasiado grande.");
    const rota = req.path.split("/").filter(Boolean).pop();
    if (!["pedido", "tarefas", "resultados", "abrir"].includes(rota)) throw new IA.ErroApi(404, "Rota desconhecida.");
    const segredo = rota === "abrir" ? INCIDENTES_SEGREDO_CRM : INCIDENTES_SEGREDO;
    const idPedido = IA.verificarAssinatura(String(segredo.value() || "").trim(), req.headers, corpo);
    try {
      await db().collection("api_pedidos").doc(idPedido).create({ em: FieldValue.serverTimestamp(), expira: new Date(Date.now() + 2 * DIA) });
    } catch (e) { if (e.code === 6) throw new IA.ErroApi(409, "Pedido repetido."); throw e; }
    let dados;
    try { dados = JSON.parse(corpo || "{}"); } catch (_) { throw new IA.ErroApi(400, "JSON inválido."); }
    let r;
    if (rota === "pedido") r = await apiPedido(dados, idPedido);
    else if (rota === "tarefas") r = await apiTarefas();
    else if (rota === "resultados") r = await apiResultados(dados);
    else if (rota === "abrir") r = await apiAbrir(dados);
    else throw new IA.ErroApi(404, "Rota desconhecida.");
    res.status(200).json({ ok: true, ...r });
  } catch (e) {
    const estado = e instanceof IA.ErroApi ? e.estado : 500;
    if (estado >= 500) registarErro("incidentesApi", e);
    res.status(estado).json({ ok: false, erro: estado >= 500 ? "Erro interno." : e.message });
  }
});

/* ================= Alertas de vulnerabilidades por fabricante =================
 * Global (só o servidor):  cve_estado/{recolha, kev, euvd}: cursores e catálogos em cache
 * Por cliente:             clientes/{c}.servicoCve (ligado pelo administrador), .cveVerificadoEm, .cveResumoEm
 *                          clientes/{c}/ativos/{id}: { fabricante, produto, versao, designacao }
 *                          clientes/{c}/preferencias/vulnerabilidades: avisos por email
 *                          clientes/{c}/cves/{CVE}: um alerta por vulnerabilidade (TTL em «expira», 36 meses)
 * Os emails seguem pelo Apps Script dos incidentes (tarefas de 15 em 15 minutos), sem a lista de ativos.
 */
let modCve = null;
const cveMod = async () => (modCve ||= { S: await import("./cve-servidor.mjs"), C: await import("./cve-logica.mjs") });
const FC = require("./fontes-cve");

// Pessoas do cliente com a secção Vulnerabilidades
async function contactosCve(cliente) {
  const s = await db().collection("acessos").where("clientes", "array-contains", cliente).get();
  return s.docs.filter((d) => { const a = d.data(); return a.ativo === true && a.papel === "cliente" && Array.isArray(a.seccoes) && a.seccoes.includes("vulnerabilidades"); }).map((d) => d.id);
}
async function prefsCve(ref) {
  return { emailImediato: true, resumoDiario: true, omitirProduto: false, imediatoCriticas: false, ...(((await ref.collection("preferencias").doc("vulnerabilidades").get()).data()) || {}) };
}

async function acoesVulnerabilidades(cfg) {
  const { S } = await cveMod();
  const equipa = IA.unicos([cfg.responsavelPadrao, ...(cfg.equipaEmails || [])]);
  const entrada = [];
  for (const c of (await db().collection("clientes").where("servicoCve", "==", true).get()).docs) {
    const imediatos = (await c.ref.collection("cves").where("avisoPendente", "==", "imediato").limit(20).get()).docs.map((d) => d.data());
    const diarios = (await c.ref.collection("cves").where("avisoPendente", "==", "diario").limit(200).get()).docs.map((d) => d.data());
    if (!imediatos.length && !diarios.length) continue;
    const contactos = await contactosCve(c.id);
    // Sem pessoas do cliente com a secção: o aviso vai só para a equipa da DCAB, que o encaminha
    entrada.push({ cliente: c.id, clienteNome: c.get("nome") || c.id, prefs: await prefsCve(c.ref), para: contactos.length ? contactos : equipa,
      cc: contactos.length ? equipa : [], imediatos, diarios, resumoEm: c.get("cveResumoEm") || "" });
  }
  return S.acoesCve(entrada, Date.now());
}

async function aplicarResultadoCve(acao, resultado) {
  const { S } = await cveMod();
  if (!idOk(acao.cliente)) return 0;
  const ref = db().collection("clientes").doc(acao.cliente);
  let n = 0;
  for (const a of S.resultadoCve(acao, resultado, Date.now())) {
    if (a.alvo === "cliente") { await ref.set(a.campos, { merge: true }); continue; }
    const r = ref.collection("cves").doc(a.id);
    // O resumo só limpa o aviso diário: se entretanto passou a imediato, o aviso imediato mantém-se
    await db().runTransaction(async (tx) => {
      const d = await tx.get(r);
      if (!d.exists) return;
      if (acao.tipo === "cve-resumo" && d.get("avisoPendente") !== "diario") return;
      tx.update(r, a.campos);
      n++;
    });
  }
  return n;
}

/* ---------- Recolha de 15 em 15 minutos ----------
 * Fila persistente (cve_estado/fila): cada CVE a analisar entra na fila antes de o cursor avançar e só sai depois de
 * cruzado com todos os clientes. Uma falha da fonte, o fim do tempo ou um erro deixam-no na fila para a execução seguinte
 * (até 4 tentativas). As entradas novas no KEV ou na EUVD ficam marcadas na fila, para o aviso imediato não se perder.
 * Uma só execução de cada vez (cve_estado/recolha.emExecucaoAte). Os mapas grandes são guardados como texto JSON,
 * para o Firestore não criar um índice por chave.
 */
const NOVO_DIAS = 30;           // registos publicados há mais tempo só atualizam alertas existentes, salvo se forem explorados agora
const HISTORICO_KEV_DIAS = 365; // ao registar ou alterar um ativo, mostra as exploradas (KEV) do último ano, sem email
const MAX_FILA = 6000;
const MAX_ATIVOS_LIDOS = 500;
// Datas das fontes: «2026-10-21», «2026-10-21T10:15:00.000» (NVD, UTC sem fuso) ou com «Z»
const msDe = (v) => { const t = String(v || ""); return Date.parse(/^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(t) ? t + "Z" : t); };
const lerJson = (snap) => { try { return JSON.parse((snap.data() || {}).json || "{}"); } catch (_) { return {}; } };
const msCampo = (d, c) => (d.get(c) && d.get(c).toMillis ? d.get(c).toMillis() : 0);

async function clientesCve() {
  const out = [];
  for (const d of (await db().collection("clientes").where("servicoCve", "==", true).get()).docs) {
    const ativos = (await d.ref.collection("ativos").limit(MAX_ATIVOS_LIDOS).get()).docs
      .map((a) => ({ id: a.id, ...a.data(), alteradoMs: Math.max(msCampo(a, "criadoEm"), msCampo(a, "atualizadoEm")) }));
    out.push({ id: d.id, ref: d.ref, dados: d.data(), ativos, prefs: await prefsCve(d.ref) });
  }
  return out;
}

// Grava ou atualiza o alerta de um cliente. Devolve 1 quando cria um alerta novo.
async function gravarCve(cli, registo, contexto, agora, opcoes = {}) {
  const { S, C } = await cveMod();
  const corr = C.correspondencias({ ...registo, kev: contexto.kev ? { fabricante: contexto.kev[1], produto: contexto.kev[2] } : null }, cli.ativos);
  if (!corr.length) return 0;
  const novo = S.construirAlerta(registo, corr, cli.prefs, contexto, agora, { historico: !!opcoes.historico });
  const ref = cli.ref.collection("cves").doc(registo.cve);
  return db().runTransaction(async (tx) => {
    const d = await tx.get(ref);
    if (!d.exists) {
      if (opcoes.soAtualizar) return 0;
      tx.create(ref, { ...novo, atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: "sistema" });
      return 1;
    }
    const campos = S.atualizarAlerta(d.data(), novo, cli.prefs);
    if (campos) tx.update(ref, { ...campos, atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: "sistema" });
    return 0;
  });
}

// Executa tarefas com um número máximo em paralelo; pára de começar tarefas novas depois de «ate»
async function emParalelo(lista, n, ate, fn) {
  const out = new Array(lista.length).fill(undefined);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => {
    while (i < lista.length && Date.now() < ate) { const k = i++; try { out[k] = await fn(lista[k]); } catch (e) { out[k] = { erro: e }; } }
  }));
  return out;
}

// Reserva a execução (uma de cada vez). Devolve false se outra estiver a correr.
async function reservarRecolha(ref, ms) {
  return db().runTransaction(async (tx) => {
    const d = await tx.get(ref);
    if ((d.get("emExecucaoAte") || 0) > Date.now()) return false;
    tx.set(ref, { emExecucaoAte: Date.now() + ms }, { merge: true });
    return true;
  });
}

async function recolherCves({ segundos = 420 } = {}) {
  const { S } = await cveMod();
  const inicio = Date.now(), ate = inicio + segundos * 1000;
  const est0 = db().collection("cve_estado");
  const refEstado = est0.doc("recolha"), refFila = est0.doc("fila"), refKev = est0.doc("kev"), refEuvd = est0.doc("euvd");
  if (!(await reservarRecolha(refEstado, (segundos + 90) * 1000))) return { emCurso: true };
  const resumo = { registos: 0, novos: 0, exploradasNovas: 0, historico: 0, epss: 0, naFila: 0 };
  const erros = [];
  try {
    const est = (await refEstado.get()).data() || {};
    const clientes = (await clientesCve()).filter((c) => c.ativos.length);
    if (!clientes.length) return resumo;
    const fila = lerJson(await refFila.get()); // { CVE: { t: tentativas, e: 1 se explorada agora } }
    const porNaFila = (id, explorada) => {
      if (fila[id]) { if (explorada) fila[id].e = 1; return true; }
      if (Object.keys(fila).length >= MAX_FILA && !explorada) return false;
      fila[id] = { t: 0, e: explorada ? 1 : 0 };
      return true;
    };
    const gravarFila = (extra = {}) => db().batch().set(refFila, { json: JSON.stringify(fila), em: new Date().toISOString() }).set(refEstado, extra, { merge: true }).commit();

    // 1. KEV e EUVD exploradas, de hora a hora. As entradas novas vão para a fila antes de o catálogo em cache mudar.
    let kevMapa = lerJson(await refKev.get());
    let euvdMapa = lerJson(await refEuvd.get());
    if (!est.kevEm || inicio - Date.parse(est.kevEm) >= 3600000) {
      try {
        const m = S.lerKev(await FC.kev());
        if (Object.keys(m).length > 500) { // proteção contra uma resposta truncada
          const primeira = !Object.keys(kevMapa).length;
          if (!primeira) for (const id of Object.keys(m)) if (!kevMapa[id]) porNaFila(id, true);
          await gravarFila({ kevEm: new Date(inicio).toISOString() });
          await refKev.set({ json: JSON.stringify(m), em: new Date(inicio).toISOString() });
          kevMapa = m;
        }
      } catch (e) { erros.push("KEV: " + e.message); }
      try {
        const m = await FC.euvdExploradas();
        if (Object.keys(m).length) {
          const primeira = !Object.keys(euvdMapa).length;
          if (!primeira) for (const id of Object.keys(m)) if (!euvdMapa[id] && !kevMapa[id]) porNaFila(id, true);
          await gravarFila();
          euvdMapa = { ...euvdMapa, ...m };
          await refEuvd.set({ json: JSON.stringify(euvdMapa), em: new Date(inicio).toISOString() });
        }
      } catch (e) { erros.push("EUVD: " + e.message); }
    }
    const contextoDe = (id) => ({ kev: kevMapa[id] || null, euvd: euvdMapa[id] ? { id: euvdMapa[id], explorada: true } : null, epss: null });

    // 2. Lista CVE: registos novos e atualizados desde o cursor (na primeira execução, as últimas 2 horas).
    //    Só os de este ano e do anterior; o cursor só avança até onde a fila os aceitou.
    try {
      const desde = est.cursorCve || new Date(inicio - 2 * 3600000).toISOString();
      const anoMin = new Date(inicio).getUTCFullYear() - 1;
      let cursor = desde;
      for (const e of await FC.deltaCve(desde)) {
        const ids = e.ids.filter((id) => Number(id.slice(4, 8)) >= anoMin);
        if (!ids.every((id) => porNaFila(id, false))) break;
        cursor = e.fetchTime;
      }
      await gravarFila({ cursorCve: cursor });
    } catch (e) { erros.push("Lista CVE: " + e.message); }

    // 3. NVD: CPE e CVSS do NIST dos publicados nos últimos 30 dias e alterados desde o cursor (todas as páginas)
    const nvdMapa = {};
    try {
      const minimo = new Date(inicio - NOVO_DIAS * 86400000).toISOString();
      const desdeNvd = est.cursorNvd && est.cursorNvd > minimo ? est.cursorNvd : (est.cursorNvd ? minimo : new Date(inicio - 2 * 3600000).toISOString());
      const ateNvd = new Date(inicio).toISOString();
      const r = await FC.nvdAlterados(desdeNvd, ateNvd, null, ate - 120000);
      for (const c of r.registos) {
        const n = S.deNvd(c);
        if (n && inicio - msDe(n.publicado) <= NOVO_DIAS * 86400000 && porNaFila(n.cve, false)) nvdMapa[n.cve] = n;
      }
      await gravarFila(r.completo ? { cursorNvd: ateNvd } : {});
      if (!r.completo) erros.push(`NVD: ${r.registos.length} de ${r.total} registos lidos; o resto na execução seguinte`);
    } catch (e) { erros.push("NVD: " + e.message); }

    // 4. Fila: primeiro as exploradas agora, depois as restantes
    const ids = Object.keys(fila).sort((a, b) => (fila[b].e - fila[a].e) || a.localeCompare(b));
    const regs = await emParalelo(ids, 8, ate - 90000, async (id) => {
      let c5 = null, falhou = false;
      try { const j = await FC.registoCve(id); c5 = j ? S.deCve5(j) : null; } catch (_) { falhou = true; }
      if (falhou && !nvdMapa[id]) return { falhou: true };
      return { reg: S.juntar(c5, nvdMapa[id] || null) || (kevMapa[id] ? { cve: id, estado: "publicado", publicado: kevMapa[id][0], afetados: [], cpes: [], cvss: null, descricao: "" } : null) };
    });
    for (let k = 0; k < ids.length; k++) {
      const id = ids[k], r = regs[k];
      if (r === undefined) continue; // sem tempo: fica na fila
      if (r.erro || r.falhou) { if (++fila[id].t >= 4) { delete fila[id]; erros.push(id + ": retirado da fila ao fim de 4 tentativas"); } continue; }
      const reg = r.reg;
      if (!reg || reg.estado === "rejeitado") { delete fila[id]; continue; }
      resumo.registos++;
      const explorada = fila[id].e === 1;
      const recente = !!reg.publicado && inicio - msDe(reg.publicado) <= NOVO_DIAS * 86400000;
      let ok = true;
      for (const cli of clientes) {
        try {
          const n = await gravarCve(cli, reg, contextoDe(id), inicio, recente || explorada ? {} : { soAtualizar: true });
          resumo.novos += n; if (n && explorada) resumo.exploradasNovas++;
        } catch (e) { ok = false; erros.push(cli.id + " " + id + ": " + e.message); }
      }
      if (ok) delete fila[id]; else if (++fila[id].t >= 4) delete fila[id];
    }
    resumo.naFila = Object.keys(fila).length;
    await gravarFila();

    // 5. Ativos registados ou alterados desde a última passagem: exploradas (KEV) do último ano, sem email
    for (const cli of clientes) {
      if (Date.now() > ate - 60000) break;
      const desde = cli.dados.cveHistoricoEm ? Date.parse(cli.dados.cveHistoricoEm) : 0;
      const alterados = cli.ativos.filter((a) => a.alteradoMs > desde);
      if (!alterados.length || !Object.keys(kevMapa).length) continue;
      const parcial = { ...cli, ativos: alterados };
      let completo = true;
      for (const [id, k] of Object.entries(kevMapa)) {
        if (Date.now() > ate - 60000) { completo = false; break; }
        if (inicio - msDe(k[0]) > HISTORICO_KEV_DIAS * 86400000) continue;
        try { resumo.historico += await gravarCve(parcial, { cve: id, estado: "publicado", publicado: k[0], afetados: [], cpes: [], cvss: null, descricao: "" }, contextoDe(id), inicio, { historico: true }); }
        catch (e) { erros.push(cli.id + " " + id + ": " + e.message); }
      }
      if (completo) await cli.ref.set({ cveHistoricoEm: new Date(inicio).toISOString() }, { merge: true });
    }

    // 6. EPSS uma vez por dia: ficheiro completo do dia, consultado aqui (não se enviam identificadores ao FIRST)
    const hoje = new Date(inicio).toISOString().slice(0, 10);
    if (est.epssDia !== hoje && new Date(inicio).getUTCHours() >= 6 && Date.now() < ate - 120000) {
      try {
        const porCliente = await Promise.all(clientes.map(async (cli) => ({ cli, docs: (await cli.ref.collection("cves").where("estado", "in", ["Novo", "Em análise"]).get()).docs })));
        const precisos = new Set(porCliente.flatMap((x) => x.docs.map((d) => d.id)));
        const mapa = await FC.epssDia(precisos);
        let completo = true;
        for (const { cli, docs } of porCliente) for (const d of docs) {
          if (Date.now() > ate - 30000) { completo = false; break; }
          const e = mapa[d.id];
          if (!e) continue;
          const n = await db().runTransaction(async (tx) => {
            const atual = await tx.get(d.ref);
            if (!atual.exists) return 0;
            const campos = S.atualizarAlerta(atual.data(), { epss: e.epss, epssPercentil: e.percentil, ativos: atual.get("ativos") || [] }, cli.prefs);
            if (campos) tx.update(d.ref, { ...campos, atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: "sistema" });
            return campos ? 1 : 0;
          });
          resumo.epss += n;
        }
        if (completo && Object.keys(mapa).length) await refEstado.set({ epssDia: hoje }, { merge: true });
      } catch (e) { erros.push("EPSS: " + e.message); }
    }

    for (const cli of clientes) await cli.ref.set({ cveVerificadoEm: FieldValue.serverTimestamp() }, { merge: true });
    return resumo;
  } catch (e) {
    erros.push(e.message);
    throw e;
  } finally {
    await refEstado.set({ emExecucaoAte: 0, ultimaExecucao: new Date().toISOString(), resumo, ultimoErro: erros.slice(0, 10).join(" · ").slice(0, 1000) }, { merge: true }).catch(() => {});
    if (erros.length) console.warn(JSON.stringify({ severity: "WARNING", evento: "cve_recolha", message: limparRegisto(erros.slice(0, 5).join(" · ")) }));
  }
}

exports.recolherCves = onSchedule({ schedule: "every 15 minutes", timeZone: "Europe/Lisbon", timeoutSeconds: 540, memory: "1GiB", maxInstances: 1 },
  async () => { await recolherCves({ segundos: 420 }); });

// Botão «Verificar agora» (só administradores)
exports.recolherCvesAgora = onCall({ timeoutSeconds: 300, memory: "1GiB" }, executar(async (ctx, auth) => {
  const por = await L.verificarAdmin(ctx, auth);
  const r = await recolherCves({ segundos: 200 });
  if (r.emCurso) throw new L.ErroAcesso("failed-precondition", "Já está a decorrer uma verificação. Tente dentro de alguns minutos.");
  await ctx.auditar({ acao: "recolher-cve", colecao: "cve_estado", docId: "recolha", resumo: "verificação manual: " + JSON.stringify(r), por });
  return r;
}));
