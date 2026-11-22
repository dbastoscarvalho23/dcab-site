/* Área reservada DCAB Consulting
 * Autenticação por email e palavra-passe (só por convite) ou Google + segundo fator TOTP
 * (Firebase Authentication com Identity Platform)
 * Dados em Cloud Firestore, protegidos por regras que exigem MFA e autorização explícita.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, setPersistence, browserSessionPersistence, onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail, getMultiFactorResolver, multiFactor, TotpMultiFactorGenerator,
  sendEmailVerification, reload,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, collection, getDoc, getDocs, onSnapshot, writeBatch, serverTimestamp, query, orderBy, limit, where, deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { getStorage, ref as refStorage, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { CONFIG } from "./config.js";
import * as M from "./modelo.js";
import * as I from "./incidentes.js";
import * as C from "./cve.js";
import { montarLote } from "./lote.js";

/* ---------- Utilitários ---------- */

const $ = (id) => document.getElementById(id);

// Constrói elementos sem innerHTML: todo o texto entra como textContent
function el(tag, props = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "texto") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat()) if (f !== null && f !== undefined && f !== false) e.append(f instanceof Node ? f : String(f));
  return e;
}

const fmtEur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const fmtPct = new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 1 });
const eur = (v) => (v === null || v === undefined ? "—" : fmtEur.format(v));
const pct = (v) => fmtPct.format(v || 0);
const dataPt = (s) => (s ? s.split("-").reverse().join("/") : "—");
const mesPt = (s) => (s ? new Intl.DateTimeFormat("pt-PT", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(s + "-01T00:00:00Z")) : "—");
const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
const texto = (v, max) => String(v ?? "").trim().slice(0, max);

// Aceita "2 500,00", "2500.00", "2.500,00 €"
function lerValor(s) {
  let t = String(s ?? "").replace(/[\s€\u00a0]/g, "");
  if (t === "") return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const v = Number(t);
  return isFinite(v) ? Math.round(v * 100) / 100 : NaN;
}
const valorParaCampo = (v) => (typeof v === "number" ? String(v).replace(".", ",") : "");

let temporizadorAviso;
function aviso(msg, tipo = "info") {
  const a = $("aviso");
  a.textContent = msg;
  a.className = "aviso aviso--" + tipo;
  a.hidden = false;
  clearTimeout(temporizadorAviso);
  // Os erros ficam visíveis até à ação seguinte; as restantes mensagens desaparecem sozinhas
  if (tipo !== "erro") temporizadorAviso = setTimeout(() => { a.hidden = true; }, 8000);
}

function mensagemErro(e) {
  if (e && /apenas por convite/i.test(e.message || "")) return "Este email não tem convite ativo. Peça acesso ao administrador.";
  if (e && /^functions\//.test(e.code || "") && e.code !== "functions/internal" && e.message) return e.message;
  const c = e && e.code ? e.code.replace(/^firestore\//, "") : "";
  const m = {
    "auth/popup-closed-by-user": "A janela de autenticação foi fechada antes de concluir.",
    "auth/cancelled-popup-request": "A janela de autenticação foi fechada antes de concluir.",
    "auth/popup-blocked": "O navegador bloqueou a janela de autenticação. Permita janelas pop-up para este site.",
    "auth/account-exists-with-different-credential": "Este endereço de email já está associado a outro método de entrada. Use o método da primeira entrada.",
    "auth/invalid-credential": "Email ou palavra-passe incorretos.",
    "auth/wrong-password": "Email ou palavra-passe incorretos.",
    "auth/user-not-found": "Email ou palavra-passe incorretos.",
    "auth/invalid-email": "O endereço de email não é válido.",
    "auth/admin-restricted-operation": "O acesso é apenas por convite e esta conta ainda não foi criada. Peça ao administrador para a ativar (código: auth/admin-restricted-operation).",
    "auth/operation-not-allowed": "A autenticação multifator ainda não está ativa no projeto (código: auth/operation-not-allowed).",
    "auth/invalid-verification-code": "Código inválido ou expirado. Confirme a hora do telemóvel e tente novamente.",
    "auth/unauthorized-domain": "Este domínio não está autorizado na configuração de autenticação.",
    "auth/too-many-requests": "Demasiadas tentativas. Aguarde alguns minutos.",
    "auth/network-request-failed": "Sem ligação à Internet.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "permission-denied": "Operação não autorizada. O pedido de pagamento associado pode estar fechado, ou a sua conta não tem esta permissão.",
    "unavailable": "Sem ligação ao servidor. Tente novamente.",
  };
  if (!m[c]) console.error(e);
  return m[c] || "Ocorreu um erro inesperado" + (c ? " (código: " + c + ")" : "") + ". Tente novamente ou envie este código ao administrador.";
}

/* ---------- Firebase ---------- */

// Configuração incompleta: mostra a causa em vez de falhar em silêncio
const emFalta = ["apiKey", "projectId", "appId", "authDomain"].filter((k) => !CONFIG.firebase[k] || String(CONFIG.firebase[k]).startsWith("COLAR"));
if (emFalta.length) {
  window.__falhaArranque && window.__falhaArranque(
    "Configuração incompleta",
    "O ficheiro reservado/config.js ainda não tem os dados do projeto Firebase (passos 64 a 66 do guia).",
    "Campos por preencher: " + emFalta.join(", "));
  throw new Error("config.js incompleto: " + emFalta.join(", "));
}

const app = initializeApp(CONFIG.firebase);
const auth = getAuth(app);
auth.languageCode = "pt";
const db = getFirestore(app);
const funcoes = getFunctions(app, "europe-west1");
const chamar = (nome, dados) => httpsCallable(funcoes, nome)(dados).then((r) => r.data);
const raiz = () => doc(db, "projetos", CONFIG.projetoId);

const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account", hd: CONFIG.dominioGoogle });

const estado = {
  papel: null, seccoes: null, seccao: "inicio", parametros: {}, despesas: [], pedidos: {}, separador: "resumo",
  ligacoes: [], subLigacoes: null, incidentes: null, subIncidentes: null, incidenteSel: "", eventos: null, subEventos: null,
  provas: null, ficheiros: null, subProvas: null, pedidosTriar: [], configInc: {}, subEquipaInc: null,
  filtros: { linha: "", pedido: "", alertas: false }, resolver: null, segredo: null,
  subscricoes: [], emailEnviado: false, aoGravar: null, prontos: 0,
  // Vigilância de exposição
  clientesAcesso: [], clientes: {}, clienteSel: "", alertas: null, subAlertas: null, subClientes: null, interno: {}, subInterno: null,
  filtrosVig: { estado: "abertos", gravidade: "", categoria: "" },
  // Alertas de vulnerabilidades por fabricante
  ativos: null, prefsCve: null, cves: null, subCve: [], filtrosCve: { estado: "abertos", prioridade: "", fabricante: "" },
};
const eCliente = () => estado.papel === "cliente";
const podeEditar = () => ["admin", "editor"].includes(estado.papel);
const eAdmin = () => estado.papel === "admin";
const emailAtual = () => (auth.currentUser ? auth.currentUser.email.toLowerCase() : "");

function mostrar(id) {
  for (const e of document.querySelectorAll(".ecra, #app")) e.hidden = e.id !== id;
  const foco = document.querySelector("#" + id + " h1");
  if (foco) { foco.setAttribute("tabindex", "-1"); foco.focus({ preventScroll: true }); }
}

/* ---------- Autenticação ---------- */

async function entrar(fornecedor) {
  return tentarEntrada(() => signInWithPopup(auth, fornecedor));
}

async function entrarComEmail(ev) {
  ev.preventDefault();
  const email = $("entrar-email").value.trim();
  const senha = $("entrar-senha").value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !senha) return aviso("Indique o email e a palavra-passe.", "erro");
  $("botao-entrar").disabled = true;
  await tentarEntrada(() => signInWithEmailAndPassword(auth, email, senha));
  $("botao-entrar").disabled = false;
  $("entrar-senha").value = "";
}

// Primeiro acesso (convite) e recuperação usam a mesma ligação de definição de palavra-passe.
// A resposta é sempre igual, exista ou não a conta, para não revelar que emails têm acesso.
async function pedirDefinicaoSenha() {
  const email = $("entrar-email").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    $("entrar-email").focus();
    return aviso("Escreva primeiro o seu endereço de email no campo Email.", "erro");
  }
  try {
    await sendPasswordResetEmail(auth, email, { url: location.origin + "/reservado/" });
  } catch (e) {
    if (e.code === "auth/too-many-requests") return aviso(mensagemErro(e), "erro");
  }
  aviso("Se este endereço tiver um convite ativo, vai receber uma ligação para definir a palavra-passe. Verifique também a pasta de spam.", "ok");
}

async function tentarEntrada(acao) {
  $("aviso").hidden = true;
  try {
    await acao();
  } catch (e) {
    if (e.code === "auth/multi-factor-auth-required") {
      estado.resolver = getMultiFactorResolver(auth, e);
      mostrar("ecra-mfa-codigo");
      $("mfa-codigo").value = "";
      $("mfa-codigo").focus();
      return;
    }
    aviso(mensagemErro(e), "erro");
  }
}

async function validarCodigo(ev) {
  ev.preventDefault();
  const codigo = $("mfa-codigo").value.trim();
  if (!/^\d{6}$/.test(codigo)) return aviso("Introduza os 6 dígitos do código.", "erro");
  const dica = estado.resolver && estado.resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  if (!dica) return aviso("Não foi encontrado um segundo fator registado para esta conta.", "erro");
  try {
    await estado.resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(dica.uid, codigo));
    estado.resolver = null;
  } catch (e) {
    aviso(mensagemErro(e), "erro");
    $("mfa-codigo").select();
  }
}

async function prepararRegistoMfa(user) {
  try {
    const sessao = await multiFactor(user).getSession();
    estado.segredo = await TotpMultiFactorGenerator.generateSecret(sessao);
  } catch (e) {
    await signOut(auth);
    aviso(e.code === "auth/requires-recent-login"
      ? "Por segurança, entre novamente para ativar a autenticação multifator."
      : mensagemErro(e), "erro");
    return;
  }
  const url = estado.segredo.generateQrCodeUrl(user.email, CONFIG.emissorMfa);
  const alvo = $("mfa-qr");
  alvo.replaceChildren();
  if (window.QRCode) new window.QRCode(alvo, { text: url, width: 184, height: 184, correctLevel: window.QRCode.CorrectLevel.M });
  else alvo.append(el("p", { texto: "Não foi possível gerar o código QR. Use a chave manual." }));
  $("mfa-chave").textContent = estado.segredo.secretKey.replace(/(.{4})/g, "$1 ").trim();
  $("mfa-codigo-registo").value = "";
  mostrar("ecra-mfa-registo");
}

async function concluirRegistoMfa(ev) {
  ev.preventDefault();
  const codigo = $("mfa-codigo-registo").value.trim();
  if (!/^\d{6}$/.test(codigo)) return aviso("Introduza os 6 dígitos do código.", "erro");
  try {
    await multiFactor(auth.currentUser).enroll(TotpMultiFactorGenerator.assertionForEnrollment(estado.segredo, codigo), "Aplicação autenticadora");
    estado.segredo = null;
    await signOut(auth);
    aviso("Autenticação multifator ativada. Entre novamente para concluir.", "ok");
  } catch (e) {
    aviso(mensagemErro(e), "erro");
  }
}

// Qualquer falha durante a validação da sessão termina a sessão e mostra a causa no ecrã de entrada
async function processarSessao(user) {
  try {
    await validarSessao(user);
  } catch (e) {
    console.error(e);
    try { await signOut(auth); } catch (_) {}
    mostrar("ecra-entrada");
    aviso(mensagemErro(e), "erro");
  }
}

async function validarSessao(user) {
  pararSubscricoes();
  $("sessao").hidden = !user;
  if (!user) { estado.papel = null; mostrar("ecra-entrada"); return; }
  $("sessao-email").textContent = user.email;
  reiniciarInatividade();

  if (!user.emailVerified) {
    $("verificar-email").textContent = user.email;
    mostrar("ecra-verificar");
    if (!estado.emailEnviado) { estado.emailEnviado = true; sendEmailVerification(user).catch(() => {}); }
    return;
  }
  if (multiFactor(user).enrolledFactors.length === 0) { await prepararRegistoMfa(user); return; }

  const token = await user.getIdTokenResult();
  if (!token.claims.firebase || token.claims.firebase.sign_in_second_factor !== "totp") {
    await signOut(auth);
    aviso("A sessão não foi validada com o segundo fator. Entre novamente.", "erro");
    return;
  }

  let acesso = null;
  try { acesso = await getDoc(doc(db, "acessos", user.email.toLowerCase())); } catch (e) { console.error(e); }
  if (!acesso || !acesso.exists()) {
    $("sem-acesso-email").textContent = user.email;
    mostrar("ecra-sem-acesso");
    return;
  }
  estado.papel = acesso.data().papel;
  estado.clientesAcesso = acesso.data().clientes || [];
  estado.seccoes = Array.isArray(acesso.data().seccoes) ? acesso.data().seccoes : null;
  iniciarApp();
}

// Termina a sessão após inatividade
let temporizadorInatividade;
function reiniciarInatividade() {
  clearTimeout(temporizadorInatividade);
  if (!auth.currentUser) return;
  temporizadorInatividade = setTimeout(async () => {
    await signOut(auth);
    aviso("A sessão terminou por inatividade.", "info");
  }, CONFIG.inatividadeMinutos * 60000);
}

/* ---------- Dados ---------- */

function pararSubscricoes() {
  estado.subscricoes.forEach((f) => f());
  estado.subscricoes = [];
  estado.prontos = 0;
  if (estado.subAlertas) { estado.subAlertas(); estado.subAlertas = null; }
  if (estado.subInterno) { estado.subInterno(); estado.subInterno = null; }
  estado.interno = {};
  if (estado.subClientes) { estado.subClientes.forEach((f) => f()); estado.subClientes = null; }
  estado.clientes = {}; estado.clienteSel = ""; estado.alertas = null;
  if (estado.subLigacoes) { estado.subLigacoes(); estado.subLigacoes = null; }
  estado.ligacoes = [];
  if (estado.subIncidentes) { estado.subIncidentes(); estado.subIncidentes = null; }
  if (estado.subEventos) { estado.subEventos(); estado.subEventos = null; }
  estado.incidentes = null; estado.incidenteSel = ""; estado.eventos = null;
  pararProvas();
  if (estado.subEquipaInc) { estado.subEquipaInc.forEach((f) => f()); estado.subEquipaInc = null; }
  estado.pedidosTriar = []; estado.configInc = {};
  pararCve();
}

function erroLeitura(e) {
  aviso(mensagemErro(e), "erro");
}

/* Secções a que a pessoa tem acesso: o papel define o máximo; a lista «seccoes» do acesso pode restringir.
 * As regras do Firestore aplicam a mesma restrição; aqui só se escondem os cartões e os botões. */
const SECCOES_EQUIPA = ["candidatura", "vigilancia", "incidentes", "vulnerabilidades"];
const SECCOES_CLIENTE = ["vigilancia", "incidentes", "vulnerabilidades"];
function seccoesPermitidas() {
  if (eAdmin()) return [...SECCOES_EQUIPA, "acessos"];
  const base = eCliente() ? SECCOES_CLIENTE : SECCOES_EQUIPA;
  // Acessos de cliente anteriores às secções: só a vigilância, até o administrador decidir
  const lista = Array.isArray(estado.seccoes) ? estado.seccoes : eCliente() ? ["vigilancia"] : base;
  return base.filter((x) => lista.includes(x));
}
const pode = (s) => seccoesPermitidas().includes(s);

function iniciarApp() {
  mostrar("app");
  $("app-papel").textContent = NOMES_PAPEL[estado.papel] || "";
  for (const b of document.querySelectorAll("[data-seccao]")) b.hidden = b.dataset.seccao !== "inicio" && !pode(b.dataset.seccao);
  document.querySelector('[data-separador="lote"]').hidden = !podeEditar();
  if (!eCliente()) carregarLigacoes();
  if (pode("vigilancia") || pode("incidentes") || pode("vulnerabilidades")) iniciarVigilancia();
  if (pode("incidentes") && !eCliente()) iniciarIncidentesEquipa();
  if (pode("candidatura")) {
    const base = raiz();
    const pronto = () => { estado.prontos++; desenhar(); };
    estado.subscricoes.push(onSnapshot(base, (s) => { estado.parametros = s.exists() ? s.data().parametros || {} : {}; pronto(); }, erroLeitura));
    estado.subscricoes.push(onSnapshot(collection(base, "despesas"), (s) => { estado.despesas = s.docs.map((d) => ({ id: d.id, ...d.data() })); pronto(); }, erroLeitura));
    estado.subscricoes.push(onSnapshot(collection(base, "pedidos"), (s) => { estado.pedidos = Object.fromEntries(s.docs.map((d) => [d.id, { ...d.data(), codigo: d.id }])); pronto(); }, erroLeitura));
  }
  abrirSeccao(pode(estado.seccao) ? estado.seccao : "inicio");
}

// Regista cada alteração na coleção de auditoria (apenas criação; não pode ser alterada nem apagada)
function auditar(batch, acao, colecao, docId, resumo) {
  batch.set(doc(collection(raiz(), "auditoria")), {
    acao, colecao, docId, resumo: texto(resumo, 200), por: emailAtual(), em: serverTimestamp(),
  });
}

function calcular() {
  const c = M.calcularDespesas(estado.despesas, estado.parametros, estado.pedidos);
  const q = M.calcularQuadro(c, estado.parametros);
  const p = M.calcularPedidos(estado.pedidos, c);
  const ct = M.calcularContratacao(estado.parametros, c, hojeISO());
  return { c, q, r: M.calcularRubricas(q), p, ct, res: M.calcularResumo(q, p, c, ct) };
}

/* ---------- Interface ---------- */

const TITULOS = {
  inicio: ["DCAB Consulting", "Área reservada"],
  vigilancia: ["DCAB Consulting", "Vigilância de exposição"],
  incidentes: ["DCAB Consulting", "Incidentes e notificações"],
  vulnerabilidades: ["DCAB Consulting", "Alertas de vulnerabilidades"],
  acessos: ["DCAB Consulting", "Acessos"],
};

let pedidoDesenho = 0;
function desenhar() {
  cancelAnimationFrame(pedidoDesenho);
  pedidoDesenho = requestAnimationFrame(() => {
    const s = estado.seccao;
    let filhos;
    if (s === "candidatura") {
      if (estado.prontos < 3) return;
      const dados = calcular();
      const p = estado.parametros;
      $("app-titulo").textContent = p.projeto || "AI4CyberSecurity";
      $("app-entidade").textContent = p.entidade || "DCAB Consulting";
      // O separador das faturas em lote tem estado próprio (ficheiros em curso): monta-se uma vez e não se redesenha
      if (estado.separador === "lote") { prepararLote(); return; }
      const desenhos = { resumo: painelResumo, despesas: painelDespesas, pedidos: painelPedidos, quadro: painelQuadro, contratacao: painelContratacao, parametros: painelParametros };
      filhos = desenhos[estado.separador](dados);
    } else {
      [$("app-entidade").textContent, $("app-titulo").textContent] = TITULOS[s];
      filhos = { inicio: painelInicio, vigilancia: painelVigilancia, incidentes: painelIncidentes, vulnerabilidades: painelVulnerabilidades, acessos: painelAcessos }[s]();
    }
    const painel = $("painel-" + (s === "candidatura" ? estado.separador : s));
    const foco = document.activeElement && painel.contains(document.activeElement) ? document.activeElement.id : null;
    painel.replaceChildren(...[].concat(filhos).flat().filter((f) => f !== null && f !== undefined && f !== false));
    if (foco && $(foco)) $(foco).focus();
  });
}

function abrirSeccao(nome) {
  if (nome !== "inicio" && !pode(nome)) return;
  estado.seccao = nome;
  if (nome === "acessos") carregarAcessos();
  for (const b of document.querySelectorAll("[data-seccao]")) {
    if (b.dataset.seccao === nome) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  }
  $("nav-candidatura").hidden = nome !== "candidatura";
  const alvo = "painel-" + (nome === "candidatura" ? estado.separador : nome);
  for (const p of document.querySelectorAll(".painel")) p.hidden = p.id !== alvo;
  desenhar();
}

function mudarSeparador(nome) {
  estado.separador = nome;
  for (const b of document.querySelectorAll("[data-separador]")) b.setAttribute("aria-selected", String(b.dataset.separador === nome));
  abrirSeccao("candidatura");
}

const tabela = (cabecalhos, linhas, rodape) => el("div", { class: "tabela-envolvente" },
  el("table", { class: "tabela" },
    el("thead", {}, el("tr", {}, cabecalhos.map((h) => el("th", { scope: "col", class: h.num ? "num" : null, texto: h.t || h })))),
    el("tbody", {}, linhas),
    rodape ? el("tfoot", {}, rodape) : null));
const td = (v, cls) => el("td", { class: cls || null }, v);
const tdNum = (v) => td(v, "num");
const indicador = (rotulo, valor, nota, destaque) => el("div", { class: "indicador" + (destaque ? " indicador--" + destaque : "") },
  el("p", { class: "indicador__rotulo", texto: rotulo }), el("p", { class: "indicador__valor", texto: valor }), nota ? el("p", { class: "indicador__nota", texto: nota }) : null);
const etiqueta = (t, tipo) => el("span", { class: "etiqueta etiqueta--" + tipo, texto: t });
const classeEstadoPedido = (e) => ({ "Pago": "ok", "Aprovado": "ok", "Submetido": "info", "Em análise": "info", "Com correções": "alerta" }[e] || "neutro");

/* ---------- Faturas em lote com leitura por IA (versão 1.6) ---------- */
let loteMontado = false;
function prepararLote() {
  if (loteMontado || !podeEditar()) return;
  loteMontado = true;
  const storage = getStorage(app, "gs://" + CONFIG.storageBucket);
  montarLote($("painel-lote"), {
    candidaturaId: CONFIG.projetoId,
    rubricas: M.QUADRO.map((l) => ({ codigo: l.codigo, nome: l.descricao })),
    eAdmin: eAdmin(),
    enviar: (caminho, ficheiro) => uploadBytes(refStorage(storage, caminho), ficheiro, { contentType: ficheiro.type }),
    chamar,
    aoValidar: () => aviso("Despesa registada a partir do lote.", "ok"),
  });
}

function painelResumo({ q, r, p, res }) {
  const fases = p.length
    ? el("ol", { class: "fases" }, p.map((f) => el("li", { class: "fase fase--" + classeEstadoPedido(f.estado) },
        el("span", { class: "fase__codigo", texto: f.codigo }),
        el("span", { class: "fase__estado", texto: f.estado || "Em preparação" }),
        el("span", { class: "fase__valor", texto: typeof f.valorTransferido === "number" ? eur(f.valorTransferido) : "—" }))))
    : el("div", { class: "vazio" },
        el("p", { texto: "As fases da candidatura (adiantamento, pedidos de pagamento e saldo final) ainda não foram criadas." }),
        eAdmin() ? el("button", { class: "botao", type: "button", texto: "Criar fases ADT, PP01–PP12 e PSF", onclick: criarFases }) : null);

  return [
    el("h2", { class: "painel__titulo", texto: "Fases da candidatura" }),
    fases,
    el("h2", { class: "painel__titulo", texto: "Execução e tesouraria" }),
    el("div", { class: "indicadores" },
      indicador("Investimento aprovado", eur(res.totalAprovado), "Comparticipação " + eur(res.compAprovada)),
      indicador("Despesa executada", eur(res.executada), pct(res.execucaoGlobal) + " do investimento"),
      indicador("Comparticipação executada", eur(res.compExecutada), "Validada " + eur(res.compValidada)),
      indicador("Total recebido", eur(res.recebido), "Por receber " + eur(res.saldoReceber)),
      indicador("Verbas por justificar", eur(res.porJustificar), "Recebido sem despesa apresentada", res.porJustificar > 0 ? "alerta" : null),
      indicador("Pontos de atenção", String(res.comAlertas + res.mesesEmFalta), plural(res.comAlertas, "despesa com alertas", "despesas com alertas") + " · " + plural(res.mesesEmFalta, "mês de contratação em falta", "meses de contratação em falta"), res.comAlertas + res.mesesEmFalta > 0 ? "alerta" : "ok")),
    el("div", { class: "barra", role: "img", "aria-label": "Execução global " + pct(res.execucaoGlobal) },
      el("div", { class: "barra__preenchimento", "data-pct": Math.min(100, Math.round(res.execucaoGlobal * 100)) })),
    el("h2", { class: "painel__titulo", texto: "Execução por rubrica" }),
    tabela(["Nº", "Rubrica", { t: "Aprovado", num: 1 }, { t: "Taxa", num: 1 }, { t: "Comp. aprovada", num: 1 }, { t: "Executado", num: 1 }, { t: "% exec.", num: 1 }, { t: "Comp. executada", num: 1 }, { t: "Saldo", num: 1 }],
      r.map((x) => el("tr", {}, td(String(x.numero)), el("td", { title: x.nome, texto: x.curto }), tdNum(eur(x.aprovado)), tdNum(pct(x.taxa)), tdNum(eur(x.compAprovada)), tdNum(eur(x.executada)), tdNum(pct(x.percentagem)), tdNum(eur(x.compExecutada)), tdNum(eur(x.saldo)))),
      el("tr", {}, td(""), td("Total"), tdNum(eur(res.totalAprovado)), tdNum(""), tdNum(eur(res.compAprovada)), tdNum(eur(res.executada)), tdNum(pct(res.execucaoGlobal)), tdNum(eur(res.compExecutada)), tdNum(eur(q.reduce((s, l) => s + l.saldo, 0))))),
  ];
}

function painelDespesas({ c }) {
  const f = estado.filtros;
  const lista = c.filter((d) => (!f.linha || d.linha === f.linha) && (!f.pedido || d.pedido === f.pedido) && (!f.alertas || d.alertas.length));
  const opcoesLinha = M.QUADRO.map((l) => [l.codigo, l.codigo + " – " + l.descricao]);
  const filtroLinha = seletor("filtro-linha", opcoesLinha, f.linha, "Todas as linhas");
  filtroLinha.addEventListener("change", () => { f.linha = filtroLinha.value; desenhar(); });
  const filtroPedido = seletor("filtro-pedido", Object.keys(estado.pedidos).sort((a, b) => M.ordemPedido(a) - M.ordemPedido(b)), f.pedido, "Todos os pedidos");
  filtroPedido.addEventListener("change", () => { f.pedido = filtroPedido.value; desenhar(); });
  const soAlertas = el("input", { type: "checkbox", id: "filtro-alertas", checked: f.alertas, onchange: (e) => { f.alertas = e.target.checked; desenhar(); } });

  const linhas = lista.map((d) => el("tr", { class: d.fechado ? "linha--fechada" : null },
    td(String(d.numero)), td(dataPt(d.dataDocumento)),
    el("td", { title: M.LINHA[d.linha] ? M.LINHA[d.linha].descricao : "", texto: d.linha }),
    td(d.fornecedor || "—"), td(d.documento || "—"),
    tdNum(eur(d.elegivel)), tdNum(eur(d.comparticipacao)),
    td(d.pedido || "—"), td(d.estado),
    el("td", {}, d.alertas.length ? el("ul", { class: "alertas" }, d.alertas.map((a) => el("li", { texto: a }))) : etiqueta("OK", "ok")),
    el("td", { class: "acoes" },
      d.fechado ? etiqueta("Fechado", "neutro")
        : podeEditar() ? el("button", { class: "ligacao", type: "button", texto: "Editar", onclick: () => editarDespesa(d) }) : null,
      !d.fechado && eAdmin() ? el("button", { class: "ligacao ligacao--perigo", type: "button", texto: "Eliminar", onclick: () => eliminarDespesa(d) }) : null)));

  const soma = (k) => lista.reduce((s, d) => s + (d[k] || 0), 0);
  return [
    el("div", { class: "barra-ferramentas" },
      el("div", { class: "filtros" },
        el("label", { class: "sr", for: "filtro-linha", texto: "Linha orçamental" }), filtroLinha,
        el("label", { class: "sr", for: "filtro-pedido", texto: "Pedido de pagamento" }), filtroPedido,
        el("label", { class: "filtro-caixa" }, soAlertas, " Só com alertas")),
      el("div", { class: "ferramentas" },
        podeEditar() ? el("button", { class: "botao", type: "button", texto: "Nova despesa", onclick: () => editarDespesa(null) }) : null)),
    lista.length
      ? tabela(["Nº", "Data", "Linha", "Fornecedor", "Documento", { t: "Elegível", num: 1 }, { t: "Comparticipação", num: 1 }, "Pedido", "Estado", "Verificação", ""], linhas,
          el("tr", {}, td(""), td(""), td(""), td("Total (" + lista.length + ")"), td(""), tdNum(eur(soma("elegivel"))), tdNum(eur(soma("comparticipacao"))), td(""), td(""), td(""), td("")))
      : el("p", { class: "vazio", texto: c.length ? "Nenhuma despesa corresponde aos filtros." : "Ainda não há despesas registadas." }),
  ];
}

function painelPedidos({ p, res }) {
  const linhas = p.map((x) => el("tr", { class: x.fechado ? "linha--fechada" : null },
    td(x.codigo), td(x.tipo || "—"),
    td(x.periodoInicio || x.periodoFim ? dataPt(x.periodoInicio) + " a " + dataPt(x.periodoFim) : "—"),
    td(dataPt(x.dataSubmissao)), tdNum(eur(x.valorSolicitado ?? null)),
    td(dataPt(x.dataTransferencia)), tdNum(eur(x.valorTransferido ?? null)),
    tdNum(eur(x.imputada)), tdNum(eur(x.apresentada)), tdNum(eur(x.validada)),
    el("td", { class: "num" + (x.diferenca > 0 ? " valor--alerta" : "") , texto: eur(x.diferenca) }),
    el("td", {}, etiqueta(x.estado || "Em preparação", classeEstadoPedido(x.estado))),
    el("td", { class: "acoes" }, (podeEditar() && !x.fechado) || eAdmin() ? el("button", { class: "ligacao", type: "button", texto: "Editar", onclick: () => editarPedido(x) }) : null)));
  return [
    el("div", { class: "indicadores" },
      indicador("Comparticipação aprovada", eur(res.compAprovada)),
      indicador("Total transferido", eur(res.recebido)),
      indicador("Comparticipação apresentada", eur(res.apresentada)),
      indicador("Saldo por receber", eur(res.saldoReceber)),
      indicador("Verbas por justificar", eur(res.porJustificar), null, res.porJustificar > 0 ? "alerta" : null),
      indicador("Comparticipação sem pedido", eur(res.semPedido), null, res.semPedido > 0 ? "alerta" : null)),
    el("p", { class: "nota", texto: "Quando um pedido passa a Submetido, Em análise, Aprovado ou Pago, as despesas associadas ficam bloqueadas. Só o administrador pode reabrir um pedido fechado." }),
    el("div", { class: "barra-ferramentas" }, el("div", {}),
      el("div", { class: "ferramentas" },
        eAdmin() && !p.length ? el("button", { class: "botao", type: "button", texto: "Criar fases ADT, PP01–PP12 e PSF", onclick: criarFases }) : null,
        eAdmin() && p.length ? el("button", { class: "botao botao--linha", type: "button", texto: "Adicionar pedido", onclick: () => editarPedido(null) }) : null)),
    p.length
      ? tabela(["Nº", "Tipo", "Período da despesa", "Submissão", { t: "Solicitado", num: 1 }, "Transferência", { t: "Transferido", num: 1 }, { t: "Despesa imputada", num: 1 }, { t: "Comp. apresentada", num: 1 }, { t: "Comp. validada", num: 1 }, { t: "Diferença", num: 1 }, "Estado", ""], linhas)
      : el("p", { class: "vazio", texto: "Ainda não existem pedidos de pagamento." }),
  ];
}

function painelQuadro({ q }) {
  const linhas = [];
  for (const [num, r] of Object.entries(M.RUBRICAS)) {
    linhas.push(el("tr", { class: "linha--grupo" }, el("td", { colspan: "11", texto: num + ". " + r.nome })));
    for (const l of q.filter((x) => x.rubrica === Number(num))) {
      linhas.push(el("tr", {}, td(l.codigo), td(l.descricao), tdNum(eur(l.valor)),
        el("td", { class: "num" + (l.taxaAlterada ? " valor--alterado" : ""), title: l.taxaAlterada ? "Taxa aprovada: " + pct(l.taxaAprovada) : null, texto: pct(l.taxa) + (l.taxaAlterada ? " *" : "") }),
        tdNum(eur(l.compAprovada)),
        tdNum(eur(l.executada)), tdNum(eur(l.compExecutada)), tdNum(eur(l.validada)), tdNum(eur(l.compValidada)),
        el("td", { class: "num" + (l.saldo < 0 ? " valor--erro" : ""), texto: eur(l.saldo) }), tdNum(pct(l.percentagem))));
    }
  }
  const s = (k) => q.reduce((t, l) => t + l[k], 0);
  return [
    el("div", { class: "barra-ferramentas" },
      el("p", { class: "nota", texto: "Réplica do Quadro de Investimento Aprovado (Dossier de Projeto, SelectAdvisor, Lda., pág. 4). A comparticipação executada está limitada ao valor aprovado de cada linha." + (q.some((l) => l.taxaAlterada) ? " * Taxa alterada em relação à aprovada." : "") }),
      eAdmin() ? el("div", { class: "ferramentas" }, el("button", { class: "botao botao--linha", type: "button", texto: "Alterar taxas de comparticipação", onclick: editarTaxas })) : null),
    tabela(["Código", "Descrição", { t: "Aprovado", num: 1 }, { t: "Taxa", num: 1 }, { t: "Comp. aprovada", num: 1 }, { t: "Executado", num: 1 }, { t: "Comp. executada", num: 1 }, { t: "Validado", num: 1 }, { t: "Comp. validada", num: 1 }, { t: "Saldo", num: 1 }, { t: "% exec.", num: 1 }], linhas,
      el("tr", {}, td(""), td("Total"), tdNum(eur(s("valor"))), tdNum(""), tdNum(eur(s("compAprovada"))), tdNum(eur(s("executada"))), tdNum(eur(s("compExecutada"))), tdNum(eur(s("validada"))), tdNum(eur(s("compValidada"))), tdNum(eur(s("saldo"))), tdNum(pct(s("executada") / M.TOTAL_APROVADO)))),
  ];
}

function painelContratacao({ ct }) {
  const p = estado.parametros;
  if (!p.inicio) return [el("p", { class: "vazio", texto: "Defina a data de início de elegibilidade nos Parâmetros para gerar o calendário de 24 meses." })];
  const coluna = (nome, meses) => el("div", { class: "contratacao__coluna" },
    el("h2", { class: "painel__titulo", texto: nome }),
    tabela(["Mês", "Referência", { t: "Valor elegível", num: 1 }, "Estado", { t: "Desvio", num: 1 }],
      meses.map((m) => el("tr", {}, td(String(m.numero)), td(mesPt(m.mes)), tdNum(m.valor ? eur(m.valor) : "—"),
        el("td", {}, etiqueta(m.estado, { "Lançado": "ok", "Em falta": "alerta", "Por lançar": "neutro" }[m.estado])),
        tdNum(m.desvio === null ? "—" : eur(m.desvio))))));
  return [
    el("p", { class: "nota", texto: "Referência mensal (aprovado ÷ duração): " + eur(ct.referencia) + " por consultor. Meses em falta: " + ct.emFalta + "." }),
    el("div", { class: "contratacao" },
      coluna("Consultor Sénior 1 — " + (p.consultor1 || "nome por definir"), ct.c1),
      coluna("Consultor Sénior 2 — " + (p.consultor2 || "nome por definir"), ct.c2)),
  ];
}

function painelParametros() {
  const p = estado.parametros;
  const so = !eAdmin();
  const campos = [
    campo("Entidade beneficiária", entrada("p-entidade", "text", p.entidade || "DCAB Consulting", { maxlength: 120, disabled: so })),
    campo("Projeto", entrada("p-projeto", "text", p.projeto || "AI4CyberSecurity", { maxlength: 120, disabled: so })),
    campo("Data de início de elegibilidade", entrada("p-inicio", "date", p.inicio || "", { disabled: so })),
    campo("Duração (meses)", entrada("p-duracao", "number", p.duracao || 24, { min: 1, max: 60, disabled: so })),
    campo("Data de fim de elegibilidade", entrada("p-fim", "text", dataPt(M.fimElegibilidade(p.inicio, p.duracao)), { disabled: true })),
    campo("Entidade consultora", entrada("p-consultora", "text", p.entidadeConsultora || "SelectAdvisor, Lda.", { maxlength: 120, disabled: so })),
    campo("Consultor Sénior 1 (linha 4.1)", entrada("p-consultor1", "text", p.consultor1 || "", { maxlength: 120, disabled: so })),
    campo("Consultor Sénior 2 (linha 4.2)", entrada("p-consultor2", "text", p.consultor2 || "", { maxlength: 120, disabled: so })),
  ];
  const ficheiro = el("input", { type: "file", id: "importar-ficheiro", accept: ".xlsx", class: "sr", onchange: importarExcel });
  return [
    el("form", { class: "formulario-parametros", onsubmit: gravarParametros }, campos,
      eAdmin() ? el("div", { class: "campo--largo" }, el("button", { class: "botao", type: "submit", texto: "Gravar parâmetros" })) : null),
    el("h2", { class: "painel__titulo", texto: "Dados" }),
    el("div", { class: "ferramentas ferramentas--esquerda" },
      el("button", { class: "botao botao--linha", type: "button", texto: "Exportar para Excel", onclick: exportarExcel }),
      eAdmin() ? el("label", { class: "botao botao--linha", for: "importar-ficheiro", texto: "Importar do Excel de controlo" }) : null,
      eAdmin() ? ficheiro : null),
    el("p", { class: "nota", texto: "A importação lê as folhas Parâmetros, Registo Despesas e Controlo Transferências. As despesas que já existem (mesma linha, NIF, documento, data e valor) são ignoradas." }),
    el("h2", { class: "painel__titulo", texto: "Segurança" }),
    el("p", { class: "nota", texto: "O acesso é apenas por convite (email e palavra-passe, ou conta Google da DCAB) e exige um código de aplicação autenticadora em cada entrada. Os acessos e papéis (admin, editor, leitor) são geridos na coleção «acessos» do Firestore. Todas as alterações ficam registadas na coleção «auditoria»." }),
  ];
}

/* ---------- Acessos (só administrador) ---------- */

estado.acessos = null;
estado.acessosErro = "";
// Mantém o formulário e o resultado do convite entre atualizações do painel
estado.formAcesso = { email: "", nome: "", papel: "editor", metodo: "email" };
estado.conviteResultado = null;
async function carregarAcessos() {
  estado.acessosErro = "";
  try { estado.acessos = await chamar("listarAcessos"); }
  catch (e) { estado.acessosErro = mensagemErro(e); }
  desenhar();
}

const NOMES_PAPEL = { admin: "Administrador", editor: "Editor", leitor: "Consulta", cliente: "Cliente" };
const OPCOES_PAPEL = [["editor", "Editor (regista e edita)"], ["leitor", "Consulta (só leitura)"], ["admin", "Administrador"], ["cliente", "Cliente (vigilância, incidentes e vulnerabilidades da sua organização)"]];
const NOMES_SECCAO = { candidatura: "Candidatura", vigilancia: "Vigilância", incidentes: "Incidentes", vulnerabilidades: "Vulnerabilidades" };

// Caixas das secções: o cliente nunca vê a candidatura; o administrador vê tudo
function caixasSeccoes(prefixo, papel, marcadas) {
  const caixa = (s) => {
    const i = el("input", { type: "checkbox", id: prefixo + "-" + s, value: s });
    i.checked = !marcadas || marcadas.includes(s);
    return el("label", { class: "filtro-caixa", id: prefixo + "-r-" + s }, i, " " + NOMES_SECCAO[s]);
  };
  const grupo = el("fieldset", { class: "campo--largo", id: prefixo + "-grupo" }, el("legend", { texto: "Secções" }), ...Object.keys(NOMES_SECCAO).map(caixa));
  const ajustar = (p) => {
    grupo.hidden = p === "admin";
    const r = $(prefixo + "-r-candidatura") || grupo.querySelector("#" + prefixo + "-r-candidatura");
    if (r) r.hidden = p === "cliente";
  };
  ajustar(papel);
  return { grupo, ajustar, valor: (p) => Object.keys(NOMES_SECCAO).filter((s) => grupo.querySelector("#" + prefixo + "-" + s).checked && !(p === "cliente" && s === "candidatura")) };
}
const dataHoraPt = (iso) => (iso ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso)) : "—");

function mensagemConvite(email, metodo) {
  const url = location.origin + "/reservado";
  const passos = metodo === "google"
    ? ["Abra " + url, "Clique em «Entrar com Google» e escolha a conta " + email + "."]
    : ["Abra a mensagem com o assunto de definição de palavra-passe que acabou de receber (verifique também a pasta de spam) e defina a sua palavra-passe: mínimo de 12 caracteres, com maiúsculas, minúsculas, números e um símbolo.",
       "Abra " + url + " e entre com o seu email e a nova palavra-passe.",
       "Confirme o seu endereço de email com a ligação que vai receber."];
  passos.push("Instale no telemóvel o Microsoft Authenticator ou o Google Authenticator e leia o código QR que aparece no ecrã. A partir daí, em cada entrada é pedido o código de 6 dígitos da aplicação.");
  return "Olá,\n\nFoi-lhe atribuído acesso à área reservada da DCAB Consulting. Para o ativar:\n\n" +
    passos.map((p, i) => (i + 1) + ". " + p).join("\n") + "\n\nCom os melhores cumprimentos,\nDCAB Consulting";
}

function blocoMensagem(email, metodo) {
  const texto = mensagemConvite(email, metodo);
  const area = el("textarea", { class: "convite__texto", rows: "11", readonly: true });
  area.value = texto;
  return el("div", { class: "convite__mensagem" },
    el("p", { texto: "Mensagem para enviar à pessoa, a partir do seu email:" }), area,
    el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Copiar mensagem",
      onclick: async (ev) => { try { await navigator.clipboard.writeText(texto); ev.target.textContent = "Mensagem copiada"; } catch (_) { area.select(); } } }));
}

function painelAcessos() {
  const fa = estado.formAcesso;
  const email = entrada("ac-email", "email", fa.email, { maxlength: 160, autocomplete: "off" });
  const nome = entrada("ac-nome", "text", fa.nome, { maxlength: 120, autocomplete: "off" });
  const papel = seletor("ac-papel", OPCOES_PAPEL, fa.papel);
  const clientes = entrada("ac-clientes", "text", fa.clientes || "", { maxlength: 200, autocomplete: "off", placeholder: "por exemplo camara-exemplo" });
  const campoClientes = campo("Clientes", clientes, { ajuda: "Identificadores dos clientes (vigilância, incidentes e vulnerabilidades), separados por vírgulas.", id: "campo-ac-clientes" });
  campoClientes.hidden = papel.value !== "cliente";
  const sec = caixasSeccoes("ac-sec", papel.value, fa.seccoes);
  papel.addEventListener("change", () => { campoClientes.hidden = papel.value !== "cliente"; sec.ajustar(papel.value); });
  sec.grupo.addEventListener("change", () => { fa.seccoes = sec.valor(papel.value); });
  const metodo = seletor("ac-metodo", [["email", "Email e palavra-passe"], ["google", "Conta Google"]], fa.metodo);
  const resultado = el("div", { class: "convite__resultado", "aria-live": "polite" });
  const guardar = () => { fa.email = email.value; fa.nome = nome.value; fa.papel = papel.value; fa.metodo = metodo.value; fa.clientes = clientes.value; };
  email.addEventListener("input", () => {
    if (/@dcabconsulting\.com$/i.test(email.value.trim())) metodo.value = "google";
    guardar();
  });
  for (const c of [nome, papel, metodo, clientes]) c.addEventListener("input", guardar);
  const r = estado.conviteResultado;
  if (r && r.erro) resultado.append(el("p", { class: "leitor__erro", texto: r.erro }));
  else if (r && r.ok) resultado.append(el("p", { class: "leitor__ok", texto: r.ok }), blocoMensagem(r.email, r.metodo));
  else if (r && r.aguardar) resultado.append(el("p", { texto: "A criar o convite…" }));

  const formulario = el("form", { class: "formulario-parametros", novalidate: true, onsubmit: async (ev) => {
    ev.preventDefault();
    const dados = { email: email.value.trim().toLowerCase(), nome: nome.value.trim(), papel: papel.value, metodo: metodo.value, clientes: clientes.value, seccoes: sec.valor(papel.value) };
    if (dados.papel !== "admin" && !dados.seccoes.length) return aviso("Escolha pelo menos uma secção.", "erro");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dados.email)) return aviso("Indique um endereço de email válido.", "erro");
    if (estado.conviteResultado && estado.conviteResultado.aguardar) return;
    estado.conviteResultado = { aguardar: true };
    desenhar();
    try {
      await chamar("convidar", dados);
      if (dados.metodo === "email") await sendPasswordResetEmail(auth, dados.email, { url: location.origin + "/reservado/" });
      estado.conviteResultado = { email: dados.email, metodo: dados.metodo, ok: dados.metodo === "email"
        ? "Convite criado. Foi enviado a " + dados.email + " um email para definir a palavra-passe."
        : "Convite criado. " + dados.email + " já pode entrar com Google." };
      estado.formAcesso = { email: "", nome: "", papel: "editor", metodo: "email", seccoes: null };
      carregarAcessos();
    } catch (e) {
      estado.conviteResultado = { erro: mensagemErro(e) };
      desenhar();
    }
  } },
    campo("Email", email), campo("Nome", nome),
    campo("Papel", papel), campoClientes, sec.grupo, campo("Método de entrada", metodo, { ajuda: "Contas @dcabconsulting.com: Conta Google. Pessoas externas: email e palavra-passe." }),
    el("div", { class: "campo--largo" }, el("button", { class: "botao", type: "submit", texto: "Convidar" })),
    el("div", { class: "campo--largo" }, resultado));

  let lista;
  if (estado.acessosErro) lista = el("p", { class: "vazio", texto: estado.acessosErro });
  else if (!estado.acessos) lista = el("p", { class: "vazio", texto: "A carregar os acessos…" });
  else lista = tabela(["Pessoa", "Papel", "Entrada", "Acesso", "Conta", "Segundo fator", "Último acesso", ""],
    estado.acessos.map((x) => {
      const proprio = x.email === emailAtual();
      return el("tr", { class: x.ativo ? null : "linha--fechada" },
        el("td", {}, el("strong", { texto: x.nome || "—" }), el("br"), x.email),
        td((NOMES_PAPEL[x.papel] || x.papel) + (x.clientes && x.clientes.length ? " · " + x.clientes.join(", ") : "")
          + " · " + (x.papel === "admin" ? "todas as secções" : Array.isArray(x.seccoes) ? x.seccoes.map((s) => NOMES_SECCAO[s] || s).join(", ") : "todas as secções do papel")),
        td(x.metodo === "google" ? "Google" : x.metodo === "email" ? "Email" : "—"),
        el("td", {}, etiqueta(x.ativo ? "Ativo" : "Desativado", x.ativo ? "ok" : "neutro")),
        el("td", {}, etiqueta(x.conta ? "Criada" : "Por ativar", x.conta ? "ok" : "alerta")),
        el("td", {}, etiqueta(x.mfa ? "Configurado" : "Pendente", x.mfa ? "ok" : "alerta")),
        td(dataHoraPt(x.ultimoAcesso)),
        el("td", { class: "acoes" },
          x.ativo && x.metodo === "email" ? el("button", { class: "ligacao", type: "button", texto: "Reenviar convite", onclick: () => reenviarConvite(x) }) : null,
          !proprio ? el("button", { class: "ligacao", type: "button", texto: "Papel e secções", onclick: () => alterarPapel(x) }) : null,
          !proprio && x.mfa ? el("button", { class: "ligacao", type: "button", texto: "Repor segundo fator", onclick: () => confirmarAcesso(x, "reporMfa") }) : null,
          !proprio ? el("button", { class: "ligacao" + (x.ativo ? " ligacao--perigo" : ""), type: "button", texto: x.ativo ? "Desativar" : "Reativar",
            onclick: () => (x.ativo ? confirmarAcesso(x, "desativar") : executarAcesso({ email: x.email, acao: "reativar" }, "Acesso reativado.")) }) : null));
    }));

  return [
    el("h2", { class: "painel__titulo", texto: "Convidar pessoa" }),
    formulario,
    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h2", { class: "painel__titulo", texto: "Pessoas com acesso" }),
      el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Atualizar", onclick: carregarAcessos })),
    lista,
    el("p", { class: "nota", texto: "Só quem tem convite ativo consegue criar conta, seja por Google ou por email. «Repor segundo fator» apaga o autenticador da pessoa (por exemplo, telemóvel perdido): na entrada seguinte, volta a ler um código QR. Todas as operações ficam na auditoria." }),
  ];
}

async function executarAcesso(dados, sucesso) {
  try { await chamar("alterarAcesso", dados); aviso(sucesso, "ok"); await carregarAcessos(); }
  catch (e) { aviso(mensagemErro(e), "erro"); }
}

async function reenviarConvite(x) {
  try {
    await sendPasswordResetEmail(auth, x.email, { url: location.origin + "/reservado/" });
    aviso("Enviado de novo a " + x.email + " o email para definir a palavra-passe.", "ok");
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

function alterarPapel(x) {
  const s = seletor("ac-novo-papel", OPCOES_PAPEL, x.papel);
  const c = entrada("ac-novo-clientes", "text", (x.clientes || []).join(", "), { maxlength: 200, autocomplete: "off" });
  const cc = campo("Clientes", c, { largo: true, ajuda: "Só para o papel Cliente. Separados por vírgulas." });
  cc.hidden = s.value !== "cliente";
  const sec = caixasSeccoes("ac-novo-sec", x.papel, Array.isArray(x.seccoes) ? x.seccoes : null);
  s.addEventListener("change", () => { cc.hidden = s.value !== "cliente"; sec.ajustar(s.value); });
  abrirDialogo({
    titulo: "Papel e secções de " + (x.nome || x.email),
    corpo: el("div", { class: "grelha-form" }, campo("Papel", s, { largo: true }), cc, sec.grupo),
    gravar: async () => {
      const seccoes = sec.valor(s.value);
      if (s.value !== "admin" && !seccoes.length) return ["Escolha pelo menos uma secção."];
      await chamar("alterarAcesso", { email: x.email, acao: "papel", papel: s.value, clientes: c.value, seccoes }); aviso("Papel atualizado.", "ok"); carregarAcessos();
    },
  });
}

function confirmarAcesso(x, acao) {
  const textos = {
    desativar: ["Desativar acesso", "A pessoa " + (x.nome || x.email) + " deixa de conseguir entrar de imediato, mesmo que tenha uma sessão aberta. Pode reativar mais tarde.", "Desativar"],
    reporMfa: ["Repor segundo fator", "O autenticador de " + (x.nome || x.email) + " vai ser apagado. Na entrada seguinte, a pessoa tem de ler um novo código QR. Use quando o telemóvel foi perdido ou trocado.", "Repor"],
  }[acao];
  abrirDialogo({
    titulo: textos[0], corpo: el("p", { texto: textos[1] }), rotulo: textos[2], perigo: acao === "desativar",
    gravar: async () => { await chamar("alterarAcesso", { email: x.email, acao }); aviso(acao === "desativar" ? "Acesso desativado." : "Segundo fator reposto.", "ok"); carregarAcessos(); },
  });
}

/* ---------- Vigilância de exposição ----------
 * Alertas recolhidos pelo servidor na Hudson Rock, no ransomware.live e no HIBP (sem palavras-passe, cookies nem IP).
 * Equipa: vê todos os clientes. Cliente: vê só os que constam do seu acesso.
 */
const GRAV = { critical: ["Crítica", "perigo"], high: ["Alta", "alerta"], medium: ["Média", "info"], low: ["Baixa", "neutro"], info: ["Informativa", "neutro"] };
const ORDEM_GRAV = ["critical", "high", "medium", "low", "info"];
const ESTADOS_ALERTA = ["Novo", "Em análise", "Tratado", "Falso positivo"];
const AVALIACOES = ["Por avaliar", "Não significativo", "Notificado ao CNCS", "Notificado à CNPD", "Notificado ao CNCS e à CNPD"];
const aberto = (a) => a.estado === "Novo" || a.estado === "Em análise";
const podeTratarAlertas = () => podeEditar() || eCliente();

function iniciarVigilancia() {
  if (estado.subClientes) return;
  estado.subClientes = [];
  const aoReceber = (id, dados) => {
    if (dados) estado.clientes[id] = dados; else delete estado.clientes[id];
    if (!estado.clienteSel && Object.keys(estado.clientes).length) selecionarCliente(Object.keys(estado.clientes).sort()[0]);
    desenhar();
  };
  if (eCliente()) {
    for (const id of estado.clientesAcesso) {
      estado.subClientes.push(onSnapshot(doc(db, "clientes", id), (d) => aoReceber(id, d.exists() ? d.data() : null), erroLeitura));
    }
  } else {
    estado.subClientes.push(onSnapshot(collection(db, "clientes"), (s) => {
      estado.clientes = Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
      if (estado.clienteSel && !estado.clientes[estado.clienteSel]) estado.clienteSel = "";
      if (!estado.clienteSel && s.docs.length) selecionarCliente(s.docs.map((d) => d.id).sort()[0]);
      desenhar();
    }, erroLeitura));
  }
  desenhar();
}

function selecionarCliente(id) {
  if (estado.subAlertas) { estado.subAlertas(); estado.subAlertas = null; }
  if (estado.subInterno) { estado.subInterno(); estado.subInterno = null; }
  estado.clienteSel = id;
  estado.alertas = null;
  estado.interno = {};
  if (pode("vigilancia")) {
    if (!eCliente()) {
      estado.subInterno = onSnapshot(doc(db, "clientes", id, "interno", "config"), (d) => { estado.interno = d.exists() ? d.data() : {}; desenhar(); }, erroLeitura);
    }
    estado.subAlertas = onSnapshot(query(collection(db, "clientes", id, "alertas"), orderBy("detetadoEm", "desc"), limit(500)), (s) => {
      estado.alertas = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      desenhar();
    }, erroLeitura);
  }
  if (pode("incidentes")) subscreverIncidentes(id);
  if (pode("vulnerabilidades")) subscreverCve(id);
  desenhar();
}

function painelVigilancia() {
  const ids = Object.keys(estado.clientes).sort();
  if (!ids.length) {
    return [el("h2", { class: "painel__titulo", texto: "Vigilância de exposição" }),
      el("div", { class: "vazio" }, el("p", { texto: eCliente()
        ? "A vigilância da sua organização ainda não está ativa. Contacte a DCAB Consulting."
        : "Ainda não há clientes em vigilância. Crie o documento do cliente na coleção «clientes» (ver o guia)." }))];
  }
  const c = estado.clientes[estado.clienteSel] || {};
  const f = estado.filtrosVig;
  const todos = estado.alertas || [];
  const lista = todos.filter((a) => (f.estado === "todos" || (f.estado === "abertos" ? aberto(a) : a.estado === f.estado))
    && (!f.gravidade || a.gravidade === f.gravidade) && (!f.categoria || a.categoria === f.categoria))
    .sort((x, y) => (aberto(y) - aberto(x)) || (ORDEM_GRAV.indexOf(x.gravidade) - ORDEM_GRAV.indexOf(y.gravidade)) || String(y.detetadoEm).localeCompare(String(x.detetadoEm)));
  const abertos = todos.filter(aberto);
  const contar = (fn) => abertos.filter(fn).length;
  const porAvaliar = contar((a) => a.requerAvaliacao && a.avaliacaoNotificacao === "Por avaliar");

  const seletorCliente = ids.length > 1
    ? seletor("vig-cliente", ids.map((id) => [id, estado.clientes[id].nome || id]), estado.clienteSel)
    : null;
  if (seletorCliente) seletorCliente.addEventListener("change", () => selecionarCliente(seletorCliente.value));
  const fEstado = seletor("vig-estado", [["abertos", "Abertos"], ["todos", "Todos"], ...ESTADOS_ALERTA.map((e) => [e, e])], f.estado);
  const fGrav = seletor("vig-gravidade", ORDEM_GRAV.map((g) => [g, GRAV[g][0]]), f.gravidade, "Todas as gravidades");
  const categorias = [...new Set(todos.map((a) => a.categoria))].sort();
  const fCat = seletor("vig-categoria", categorias, f.categoria, "Todas as categorias");
  fEstado.addEventListener("change", () => { f.estado = fEstado.value; desenhar(); });
  fGrav.addEventListener("change", () => { f.gravidade = fGrav.value; desenhar(); });
  fCat.addEventListener("change", () => { f.categoria = fCat.value; desenhar(); });

  const ultima = c.ultimaRecolha && c.ultimaRecolha.toDate ? dataHoraPt(c.ultimaRecolha.toDate().toISOString()) : "—";
  const linhas = lista.map((a) => el("tr", { class: aberto(a) ? null : "linha--fechada" },
    td(dataPt(String(a.detetadoEm || "").slice(0, 10))),
    el("td", {}, etiqueta((GRAV[a.gravidade] || GRAV.info)[0], (GRAV[a.gravidade] || GRAV.info)[1])),
    el("td", {}, el("strong", { texto: a.categoria }), el("br"), el("span", { texto: a.titulo || "" })),
    td(descreverDetalhes(a)),
    el("td", {}, etiqueta(a.estado, aberto(a) ? "alerta" : "ok"),
      a.requerAvaliacao ? el("span", { class: "vig-avaliacao", texto: " " + a.avaliacaoNotificacao }) : null),
    el("td", { class: "acoes" }, el("button", { class: "ligacao", type: "button", texto: podeTratarAlertas() ? "Tratar" : "Ver", onclick: () => tratarAlerta(a) }))));

  return [
    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h2", { class: "painel__titulo", texto: "Vigilância de exposição" + (c.nome ? " · " + c.nome : "") }),
      el("div", { class: "ferramentas" }, seletorCliente,
        eAdmin() ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Recolher agora", onclick: recolherAgora }) : null)),
    el("div", { class: "indicadores" },
      indicador("Alertas abertos", String(abertos.length), "Última recolha: " + ultima, abertos.length ? "alerta" : "ok"),
      indicador("Críticos e altos", String(contar((a) => a.gravidade === "critical" || a.gravidade === "high")), "Por tratar", contar((a) => a.gravidade === "critical" || a.gravidade === "high") ? "alerta" : "ok"),
      indicador("Por avaliar para notificação", String(porAvaliar), "DL 125/2025: notificação inicial até 24 horas", porAvaliar ? "alerta" : "ok"),
      indicador("Computadores infetados", String(contar((a) => a.categoria === "Computador infetado")), "De trabalhadores, abertos"),
      indicador("Ransomware", String(contar((a) => a.categoria === "Publicação de grupo de ransomware")), "Publicações abertas"),
      indicador("Fugas de dados", String(contar((a) => a.categoria === "Credencial exposta em fuga de dados" || a.categoria === "Clientes do serviço com credenciais roubadas")), "Abertas")),
    estado.interno.ultimoErro && !eCliente() ? el("p", { class: "leitor__erro", texto: "Última recolha com erro: " + estado.interno.ultimoErro }) : null,
    !eCliente() && estado.clientes[estado.clienteSel] && !(estado.interno.dominios && estado.interno.dominios.length) ? el("p", { class: "leitor__erro", texto: "Falta o documento interno/config com a lista de domínios deste cliente (ver o guia)." }) : null,
    el("div", { class: "barra-ferramentas" }, el("div", { class: "filtros" }, fEstado, fGrav, fCat),
      el("p", { class: "nota", texto: plural(lista.length, "alerta", "alertas") })),
    estado.alertas === null ? el("p", { class: "vazio", texto: "A carregar os alertas…" })
      : lista.length ? tabela(["Detetado", "Gravidade", "Alerta", "Detalhe", "Estado", ""], linhas)
        : el("p", { class: "vazio", texto: "Sem alertas com estes filtros." }),
    el("p", { class: "nota", texto: "Fontes: Hudson Rock (estatísticas públicas), ransomware.live e Have I Been Pwned (CC BY 4.0). Não são guardadas palavras-passe, cookies nem endereços IP; as identidades aparecem mascaradas. Os alertas são apagados 36 meses após a deteção." }),
  ];
}

function descreverDetalhes(a) {
  const d = a.detalhes || {};
  const partes = [];
  if (d.equipamento) partes.push("equipamento: " + d.equipamento);
  if (d.malware) partes.push("malware: " + d.malware);
  if (d.infetadoEm) partes.push("infetado em " + dataPt(String(d.infetadoEm).slice(0, 10)));
  if (d.contas) partes.push("contas: " + d.contas);
  if (d.servicos) partes.push("serviços: " + d.servicos);
  if (d.grupo) partes.push("grupo: " + d.grupo);
  if (d.site) partes.push("site: " + d.site);
  if (d.fuga) partes.push("fuga: " + d.fuga + (d.dataFuga ? " (" + dataPt(String(d.dataFuga).slice(0, 10)) + ")" : ""));
  if (d.dados) partes.push("dados: " + d.dados);
  if (typeof d.novos === "number" && d.novos > 0) partes.push("novos: " + d.novos);
  if (typeof d.total === "number") partes.push("total: " + d.total);
  if (typeof d.acumulado === "number") partes.push("acumulado: " + d.acumulado);
  if (d.ultimaInfecao) partes.push("última infeção: " + dataPt(String(d.ultimaInfecao).slice(0, 10)));
  if (!partes.length && a.identificadores && a.identificadores.length) partes.push(a.identificadores.join(", "));
  return partes.join(" · ") || "—";
}

const ORIENTACAO = {
  "Credencial exposta em fuga de dados": "Mude a palavra-passe das contas indicadas, termine as sessões abertas e confirme que a autenticação multifator está ativa (Reg. 756/2026, Anexo III, PR.GA-1).",
  "Computador infetado": "Peça à equipa de TI que identifique o equipamento (antivírus, EDR, inventário, data da infeção). Isole-o e reinstale-o. A partir de outro equipamento, mude as palavras-passe do domínio usadas nele e termine as respetivas sessões. Avalie se é um incidente com impacto significativo.",
  "Clientes do serviço com credenciais roubadas": "As credenciais foram roubadas nos computadores dos clientes, não nos sistemas da organização. Considere obrigar à mudança de palavra-passe, ativar a autenticação multifator para os clientes e vigiar entradas suspeitas.",
  "Publicação de grupo de ransomware": "Trate como incidente grave: ative o plano de resposta, avalie a notificação ao CNCS e à CNPD e contacte a DCAB. Não contacte o grupo.",
};

function tratarAlerta(a) {
  const editavel = podeTratarAlertas();
  const sEstado = seletor("al-estado", ESTADOS_ALERTA, a.estado);
  const sAval = seletor("al-avaliacao", AVALIACOES, a.avaliacaoNotificacao);
  const resp = entrada("al-responsavel", "text", a.responsavel, { maxlength: 120 });
  const notas = el("textarea", { id: "al-notas", rows: "4", maxlength: "1000" });
  notas.value = a.notas || "";
  for (const x of [sEstado, sAval, resp, notas]) x.disabled = !editavel;
  const info = el("dl", { class: "vig-detalhe" },
    el("dt", { texto: "Categoria" }), el("dd", { texto: a.categoria }),
    el("dt", { texto: "Gravidade" }), el("dd", { texto: (GRAV[a.gravidade] || GRAV.info)[0] }),
    el("dt", { texto: "Detetado" }), el("dd", { texto: dataHoraPt(a.detetadoEm) }),
    el("dt", { texto: "Publicado na fonte" }), el("dd", { texto: a.publicadoEm ? dataHoraPt(a.publicadoEm) : "—" }),
    el("dt", { texto: "Detalhe" }), el("dd", { texto: descreverDetalhes(a) }),
    a.resumo ? el("dt", { texto: "Extrato" }) : null, a.resumo ? el("dd", { texto: a.resumo }) : null,
    el("dt", { texto: "Fonte" }), el("dd", { texto: a.fonte || "—" }),
    !eCliente() ? el("dt", { texto: "Referência na fonte" }) : null,
    !eCliente() ? el("dd", { id: "al-fonte", texto: "—" }) : null);
  if (!eCliente()) {
    getDoc(doc(db, "clientes", estado.clienteSel, "alertas_fonte", a.id)).then((d) => {
      const alvo = $("al-fonte");
      if (alvo && d.exists()) alvo.textContent = String(d.data().fonteId || "—");
    }).catch(() => {});
  }
  abrirDialogo({
    titulo: a.titulo || a.categoria,
    rotulo: editavel ? "Gravar" : "Fechar",
    corpo: el("div", { class: "grelha-form" },
      el("div", { class: "campo--largo" }, info),
      ORIENTACAO[a.categoria] ? el("p", { class: "campo--largo nota", texto: "O que fazer: " + ORIENTACAO[a.categoria] }) : null,
      campo("Estado", sEstado), campo("Notificação (DL 125/2025 e RGPD)", sAval),
      campo("Responsável", resp, { largo: true }), campo("Notas", notas, { largo: true })),
    gravar: async () => {
      if (!editavel) return [];
      const ref = doc(db, "clientes", estado.clienteSel, "alertas", a.id);
      const b = writeBatch(db);
      const novo = { estado: sEstado.value, avaliacaoNotificacao: sAval.value, responsavel: texto(resp.value, 120), notas: texto(notas.value, 1000) };
      b.update(ref, { ...novo, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      b.set(doc(collection(ref, "historico")), { estado: novo.estado, avaliacaoNotificacao: novo.avaliacaoNotificacao, notas: novo.notas, por: emailAtual(), em: serverTimestamp(), expira: new Date(Date.now() + 1095 * 86400000) });
      await b.commit();
      aviso("Alerta atualizado.", "ok");
      return [];
    },
  });
}

async function recolherAgora() {
  if (!estado.clienteSel) return;
  aviso("A recolher alertas na Hudson Rock, no ransomware.live e no HIBP. Pode demorar até um minuto…", "info");
  try {
    const r = await chamar("recolherAgora", { cliente: estado.clienteSel });
    const n = r[estado.clienteSel];
    aviso(n === "erro" ? "A recolha terminou com erro. Veja a mensagem no painel." : plural(Number(n) || 0, "alerta novo", "alertas novos") + ".", n === "erro" ? "erro" : "ok");
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

/* ---------- Alertas de vulnerabilidades por fabricante ----------
 * O cliente (ou a equipa) indica os fabricantes que usa ou a lista de ativos com produto e versão.
 * O servidor cruza, de 15 em 15 minutos, as vulnerabilidades novas da lista CVE, do NVD, do KEV, do EPSS e da EUVD
 * com esses ativos e cria um registo por vulnerabilidade e por cliente. A lista de ativos não sai desta área.
 */
const PRIO = { imediato: ["Email imediato", "perigo"], diario: ["Resumo diário", "alerta"], registo: ["Só aqui", "neutro"] };
const PREFS_CVE = { emailImediato: true, resumoDiario: true, omitirProduto: false, imediatoCriticas: false };
const MAX_ATIVOS = 500;
const podeEditarCve = () => podeEditar() || eCliente();

function pararCve() {
  estado.subCve.forEach((f) => f());
  estado.subCve = [];
  estado.ativos = null; estado.prefsCve = null; estado.cves = null;
}

function subscreverCve(id) {
  pararCve();
  estado.subCve.push(onSnapshot(collection(db, "clientes", id, "ativos"), (s) => {
    estado.ativos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    desenhar();
  }, erroLeitura));
  estado.subCve.push(onSnapshot(doc(db, "clientes", id, "preferencias", "vulnerabilidades"), (d) => {
    estado.prefsCve = d.exists() ? { ...PREFS_CVE, ...d.data() } : { ...PREFS_CVE, porGravar: true };
    desenhar();
  }, erroLeitura));
  estado.subCve.push(onSnapshot(query(collection(db, "clientes", id, "cves"), orderBy("detetadoEm", "desc"), limit(1000)), (s) => {
    estado.cves = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    desenhar();
  }, erroLeitura));
}

const nomeFab = (id) => (C.fabricante(id) || {}).nome || id;
const ligacaoCve = (id) => el("a", { href: "https://www.cve.org/CVERecord?id=" + encodeURIComponent(id), target: "_blank", rel: "noopener noreferrer", texto: id });
const dataDe = (v) => (v && v.toDate ? v.toDate().toISOString() : typeof v === "string" ? v : "");

function painelVulnerabilidades() {
  const ids = Object.keys(estado.clientes).sort();
  if (!ids.length) {
    return [el("h2", { class: "painel__titulo", texto: "Alertas de vulnerabilidades" }),
      el("div", { class: "vazio" }, el("p", { texto: eCliente()
        ? "A sua organização ainda não está configurada nesta área. Contacte a DCAB Consulting."
        : "Ainda não há clientes. Crie-os em Incidentes › Clientes." }))];
  }
  const c = estado.clientes[estado.clienteSel] || {};
  const ativos = estado.ativos || [];
  const cves = estado.cves || [];
  const abertas = cves.filter(C.abertoCve);
  const f = estado.filtrosCve;
  const editavel = podeEditarCve();

  // Ativos: fabricante inteiro primeiro, depois por produto
  const ordenados = [...ativos].sort((a, b) => nomeFab(a.fabricante).localeCompare(nomeFab(b.fabricante), "pt") || String(a.produto).localeCompare(String(b.produto), "pt"));
  const contaPorAtivo = {};
  for (const v of abertas) for (const a of v.ativos || []) contaPorAtivo[a] = (contaPorAtivo[a] || 0) + 1;
  const linhasAtivos = ordenados.map((a) => el("tr", {},
    td(nomeFab(a.fabricante)),
    td(a.produto || "Todos os produtos"),
    td(a.versao || "—"),
    td(a.designacao || "—"),
    tdNum(String(contaPorAtivo[a.id] || 0)),
    el("td", { class: "acoes" }, editavel ? [
      el("button", { class: "ligacao", type: "button", texto: "Editar", onclick: () => editarAtivo(a) }),
      el("button", { class: "ligacao ligacao--perigo", type: "button", texto: "Retirar", onclick: () => retirarAtivo(a) })] : null)));

  // Vulnerabilidades
  const fabricantesNasCves = [...new Set(cves.map((v) => v.fabricante))].sort((a, b) => nomeFab(a).localeCompare(nomeFab(b), "pt"));
  const lista = cves.filter((v) => (f.estado === "todos" || (f.estado === "abertos" ? C.abertoCve(v) : v.estado === f.estado))
    && (!f.prioridade || v.prioridade === f.prioridade) && (!f.fabricante || v.fabricante === f.fabricante))
    .sort((x, y) => (C.abertoCve(y) - C.abertoCve(x)) || (C.ORDEM_PRIORIDADE.indexOf(y.prioridade) - C.ORDEM_PRIORIDADE.indexOf(x.prioridade))
      || ((y.cvss || 0) - (x.cvss || 0)) || String(dataDe(y.detetadoEm)).localeCompare(String(dataDe(x.detetadoEm))));
  const fEstado = seletor("cve-f-estado", [["abertos", "Abertas"], ["todos", "Todas"], ...C.ESTADOS.map((e) => [e, e])], f.estado);
  const fPrio = seletor("cve-f-prio", Object.entries(PRIO).map(([k, v]) => [k, v[0]]), f.prioridade, "Todas as prioridades");
  const fFab = seletor("cve-f-fab", fabricantesNasCves.map((x) => [x, nomeFab(x)]), f.fabricante, "Todos os fabricantes");
  fEstado.addEventListener("change", () => { f.estado = fEstado.value; desenhar(); });
  fPrio.addEventListener("change", () => { f.prioridade = fPrio.value; desenhar(); });
  fFab.addEventListener("change", () => { f.fabricante = fFab.value; desenhar(); });
  const linhasCves = lista.map((v) => el("tr", { class: C.abertoCve(v) ? null : "linha--fechada" },
    el("td", {}, ligacaoCve(v.cve), el("br"), el("span", { class: "nota-pequena", texto: dataPt(String(v.publicadoEm || "").slice(0, 10)) })),
    el("td", {}, el("strong", { texto: nomeFab(v.fabricante) }), el("br"), el("span", { texto: (v.produtos || []).join(", ") || "—" })),
    el("td", {}, etiqueta(C.gravidade(v.cvss) + (typeof v.cvss === "number" ? " " + v.cvss.toFixed(1).replace(".", ",") : ""),
      v.cvss >= 9 ? "perigo" : v.cvss >= 7 ? "alerta" : "neutro")),
    el("td", {}, v.explorada ? etiqueta(v.kev ? "Sim (KEV)" : "Sim (EUVD)", "perigo") : etiqueta("Não conhecida", "neutro"),
      typeof v.epssPercentil === "number" ? el("span", { class: "vig-avaliacao", texto: "EPSS: percentil " + Math.round(v.epssPercentil * 100) }) : null),
    td(C.NIVEIS[v.nivel] || "—"),
    el("td", {}, etiqueta(...(PRIO[v.prioridade] || PRIO.registo)), v.historico ? el("span", { class: "vig-avaliacao", texto: "anterior ao registo do ativo" }) : null),
    el("td", {}, etiqueta(v.estado, C.abertoCve(v) ? "alerta" : "ok")),
    el("td", { class: "acoes" }, el("button", { class: "ligacao", type: "button", texto: editavel ? "Tratar" : "Ver", onclick: () => tratarCve(v) }))));

  const p = estado.prefsCve || PREFS_CVE;
  const resumoPrefs = [
    p.emailImediato ? "email imediato para vulnerabilidades exploradas" + (p.imediatoCriticas ? " e críticas (CVSS 9 ou mais)" : " e críticas com probabilidade alta de exploração") : "sem email imediato",
    p.resumoDiario ? "resumo diário das altas e críticas" : "sem resumo diário",
    p.omitirProduto ? "os emails não indicam o produto" : "os emails indicam o fabricante e o produto",
  ].join(" · ");
  const verificado = c.cveVerificadoEm && c.cveVerificadoEm.toDate ? dataHoraPt(c.cveVerificadoEm.toDate().toISOString()) : "—";
  const comVersao = ativos.filter((a) => a.produto && a.versao).length;

  return [
    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h2", { class: "painel__titulo", texto: "Alertas de vulnerabilidades" + (c.nome ? " · " + c.nome : "") }),
      el("div", { class: "ferramentas" }, seletorClientes("cve-cliente"),
        eAdmin() ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Verificar agora", onclick: verificarCvesAgora }) : null)),
    c.servicoCve !== true ? el("p", { class: "leitor__erro", texto: eCliente()
      ? "O serviço ainda não está ativo. Pode já indicar os fabricantes e os ativos; os alertas começam quando a DCAB Consulting o ativar."
      : "O serviço não está ativo para este cliente: ligue-o em Incidentes › Clientes. Os ativos podem ser registados antes." }) : null,
    el("div", { class: "indicadores" },
      indicador("Vulnerabilidades abertas", String(abertas.length), "Última verificação: " + verificado, abertas.length ? "alerta" : "ok"),
      indicador("Exploradas", String(abertas.filter((v) => v.explorada).length), "No catálogo KEV ou na EUVD", abertas.some((v) => v.explorada) ? "alerta" : "ok"),
      indicador("Críticas", String(abertas.filter((v) => v.cvss >= 9).length), "CVSS 9 ou mais, abertas"),
      indicador("Fabricantes", String(new Set(ativos.map((a) => a.fabricante)).size), "De " + C.FABRICANTES.length + " no catálogo"),
      indicador("Ativos com versão", String(comVersao), "Correspondência mais precisa"),
      indicador("Avisos por email", p.emailImediato || p.resumoDiario ? "Ativos" : "Desligados", p.porGravar ? "Valores por omissão" : "Escolhidos pelo cliente")),

    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h3", { class: "painel__titulo", texto: "Fabricantes e ativos" }),
      editavel ? el("div", { class: "ferramentas" },
        el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Escolher fabricantes", onclick: escolherFabricantes }),
        el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Acrescentar ativo", onclick: () => editarAtivo(null) }),
        el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Importar lista", onclick: importarAtivos }),
        ativos.length ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Exportar lista", onclick: exportarAtivos }) : null) : null),
    estado.ativos === null ? el("p", { class: "vazio", texto: "A carregar os ativos…" })
      : ativos.length ? tabela(["Fabricante", "Produto", "Versão", "Designação", { t: "Abertas", num: true }, ""], linhasAtivos)
        : el("p", { class: "vazio", texto: "Ainda não há fabricantes nem ativos. Comece por «Escolher fabricantes»; para menos alertas e mais precisos, acrescente o produto e a versão." }),
    el("p", { class: "nota", texto: "Sem produto, o alerta cobre tudo o que o fabricante publica (mais alertas). Com produto e versão, só chegam as vulnerabilidades dessa versão. Na designação não ponha nomes de pessoas nem endereços internos." }),

    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h3", { class: "painel__titulo", texto: "Avisos por email" }),
      editavel ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Alterar", onclick: editarPreferenciasCve }) : null),
    el("p", { texto: resumoPrefs + "." }),

    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h3", { class: "painel__titulo", texto: "Vulnerabilidades" }),
      el("div", { class: "filtros" }, fEstado, fPrio, fFab)),
    estado.cves === null ? el("p", { class: "vazio", texto: "A carregar…" })
      : lista.length ? tabela(["CVE", "Fabricante e produto", "Gravidade", "Explorada", "Correspondência", "Aviso", "Estado", ""], linhasCves)
        : el("p", { class: "vazio", texto: cves.length ? "Sem vulnerabilidades com estes filtros." : "Sem vulnerabilidades registadas para estes ativos." }),
    el("p", { class: "nota", texto: "Fontes: lista CVE (CVE Program), NVD (NIST), catálogo KEV (CISA), EPSS (FIRST) e EUVD (ENISA). Este produto usa dados da API do NVD, mas não é aprovado nem certificado pelo NVD. A verificação corre de 15 em 15 minutos. A lista de ativos serve só para esta correspondência e não é enviada a terceiros. Os registos são apagados 36 meses após a deteção." }),
  ];
}

async function verificarCvesAgora() {
  aviso("A verificar as fontes (lista CVE, NVD, KEV, EUVD e EPSS) para todos os clientes com o serviço ativo. Pode demorar alguns minutos…", "info");
  try {
    const r = await chamar("recolherCvesAgora", {});
    aviso(plural(r.registos || 0, "registo analisado", "registos analisados") + " · " + plural((r.novos || 0) + (r.historico || 0), "vulnerabilidade nova", "vulnerabilidades novas") + ".", "ok");
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

function camposAtivo(a) {
  const fab = seletor("at-fab", C.FABRICANTES.map((x) => [x.id, x.nome]), a.fabricante || "", "Escolha o fabricante");
  const lista = el("datalist", { id: "at-produtos" });
  const preencherLista = () => {
    const x = C.fabricante(fab.value);
    lista.replaceChildren(...Object.keys((x && x.produtos) || {}).map((p) => el("option", { value: p })));
  };
  fab.addEventListener("change", preencherLista);
  preencherLista();
  const produto = entrada("at-produto", "text", a.produto, { maxlength: 80, list: "at-produtos", autocomplete: "off" });
  const versao = entrada("at-versao", "text", a.versao, { maxlength: 40, autocomplete: "off", placeholder: "por exemplo 7.4.3" });
  const desig = entrada("at-desig", "text", a.designacao, { maxlength: 80, autocomplete: "off", placeholder: "por exemplo Firewall da sede" });
  return { fab, produto, versao, desig, corpo: el("div", { class: "grelha-form" },
    campo("Fabricante", fab, { largo: true }),
    campo("Produto", produto, { ajuda: "Vazio = todos os produtos do fabricante." }), lista,
    campo("Versão", versao, { ajuda: "Opcional. Só com produto." }),
    campo("Designação interna", desig, { largo: true, ajuda: "Opcional, para se reconhecer o equipamento. Sem nomes de pessoas." })) };
}

function validarAtivo(d, idAtual) {
  const erros = [];
  if (!C.fabricante(d.fabricante)) erros.push("Escolha o fabricante.");
  if (d.versao && !d.produto) erros.push("A versão só serve com o produto indicado.");
  if (d.versao && !/\d/.test(d.versao)) erros.push("A versão tem de ter números.");
  const chave = C.chaveAtivo(d);
  if ((estado.ativos || []).some((x) => x.id !== idAtual && C.chaveAtivo(x) === chave)) erros.push("Este ativo já está na lista.");
  return erros;
}

function editarAtivo(a) {
  const f = camposAtivo(a || {});
  abrirDialogo({
    titulo: a ? "Editar ativo" : "Acrescentar ativo",
    corpo: f.corpo,
    gravar: async () => {
      const d = { fabricante: f.fab.value, produto: texto(f.produto.value, 80), versao: C.limparVersao(texto(f.versao.value, 40)), designacao: texto(f.desig.value, 80) };
      if (texto(f.versao.value, 40) && !d.versao) return ["A versão tem de ter números."];
      const erros = validarAtivo(d, a && a.id);
      if (!a && (estado.ativos || []).length >= MAX_ATIVOS) erros.push("Limite de " + MAX_ATIVOS + " ativos por cliente.");
      if (erros.length) return erros;
      const b = writeBatch(db);
      const carimbo = { atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() };
      if (a) b.update(doc(db, "clientes", estado.clienteSel, "ativos", a.id), { ...d, ...carimbo });
      else b.set(doc(collection(db, "clientes", estado.clienteSel, "ativos")), { ...d, origem: "manual", criadoEm: serverTimestamp(), criadoPor: emailAtual(), ...carimbo });
      await b.commit();
      aviso(a ? "Ativo atualizado." : "Ativo acrescentado. As vulnerabilidades novas passam a ser cruzadas com ele.", "ok");
      return [];
    },
  });
}

function retirarAtivo(a) {
  abrirDialogo({
    titulo: "Retirar ativo", rotulo: "Retirar", perigo: true,
    corpo: el("p", { texto: "Deixam de chegar alertas para " + nomeFab(a.fabricante) + (a.produto ? " " + a.produto : "") + (a.versao ? " " + a.versao : "") + ". As vulnerabilidades já registadas mantêm-se." }),
    gravar: async () => {
      const b = writeBatch(db);
      b.delete(doc(db, "clientes", estado.clienteSel, "ativos", a.id));
      await b.commit();
      aviso("Ativo retirado.", "ok");
      return [];
    },
  });
}

// Fabricantes inteiros (sem produto): marcar cria o ativo; desmarcar retira-o (os ativos com produto mantêm-se)
function escolherFabricantes() {
  const inteiros = new Set((estado.ativos || []).filter((a) => !a.produto).map((a) => a.fabricante));
  const comProduto = new Set((estado.ativos || []).filter((a) => a.produto).map((a) => a.fabricante));
  const caixas = C.FABRICANTES.map((x) => {
    const i = el("input", { type: "checkbox", id: "fab-" + x.id, value: x.id });
    i.checked = inteiros.has(x.id);
    return el("label", { class: "filtro-caixa", for: "fab-" + x.id }, i, " " + x.nome + (comProduto.has(x.id) ? " (tem ativos com produto)" : ""));
  });
  abrirDialogo({
    titulo: "Fabricantes usados",
    corpo: el("div", { class: "grelha-form" },
      el("p", { class: "campo--largo nota", texto: "Cada fabricante marcado recebe alertas de todos os seus produtos. Se já indicou produtos de um fabricante, não precisa de o marcar aqui." }),
      el("fieldset", { class: "campo--largo grelha-fabricantes" }, el("legend", { texto: "Catálogo" }), ...caixas)),
    gravar: async () => {
      const marcados = new Set(caixas.map((l) => l.querySelector("input")).filter((i) => i.checked).map((i) => i.value));
      const b = writeBatch(db);
      let n = 0;
      const carimbo = { atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() };
      for (const id of marcados) if (!inteiros.has(id)) {
        b.set(doc(collection(db, "clientes", estado.clienteSel, "ativos")), { fabricante: id, produto: "", versao: "", designacao: "", origem: "manual", criadoEm: serverTimestamp(), criadoPor: emailAtual(), ...carimbo });
        n++;
      }
      for (const a of (estado.ativos || []).filter((x) => !x.produto && !marcados.has(x.fabricante))) { b.delete(doc(db, "clientes", estado.clienteSel, "ativos", a.id)); n++; }
      if ((estado.ativos || []).length + n > MAX_ATIVOS) return ["Limite de " + MAX_ATIVOS + " ativos por cliente."];
      if (n) await b.commit();
      aviso(n ? "Fabricantes atualizados." : "Sem alterações.", "ok");
      return [];
    },
  });
}

function importarAtivos() {
  const area = el("textarea", { id: "at-lista", rows: "10", maxlength: "60000", placeholder: "fabricante;produto;versão;designação\nFortinet;FortiOS;7.4.3;Firewall da sede\nVeeam;Backup & Replication;12.1.2;" });
  const ficheiro = el("input", { type: "file", id: "at-ficheiro", accept: ".csv,.txt,text/csv,text/plain" });
  const previa = el("div", { class: "campo--largo", "aria-live": "polite" });
  let lido = { ativos: [], erros: [] };
  const analisar = () => {
    lido = C.lerListaAtivos(area.value, MAX_ATIVOS);
    const existentes = new Set((estado.ativos || []).map(C.chaveAtivo));
    const novos = lido.ativos.filter((x) => !existentes.has(C.chaveAtivo(x)));
    lido.novos = [...new Map(novos.map((x) => [C.chaveAtivo(x), x])).values()];
    previa.replaceChildren(
      el("p", { class: lido.novos.length ? "leitor__ok" : "nota", texto: plural(lido.novos.length, "ativo novo", "ativos novos") + " · " + plural(lido.ativos.length - lido.novos.length, "já na lista ou repetido", "já na lista ou repetidos") }),
      ...lido.erros.slice(0, 8).map((e) => el("p", { class: "leitor__erro", texto: e })));
  };
  area.addEventListener("input", analisar);
  ficheiro.addEventListener("change", async () => {
    const fx = ficheiro.files[0];
    if (!fx) return;
    if (fx.size > 200000) { previa.replaceChildren(el("p", { class: "leitor__erro", texto: "Ficheiro demasiado grande (máximo 200 KB)." })); return; }
    area.value = await fx.text();
    analisar();
  });
  abrirDialogo({
    titulo: "Importar lista de ativos",
    rotulo: "Importar",
    corpo: el("div", { class: "grelha-form" },
      el("p", { class: "campo--largo nota", texto: "Uma linha por ativo: fabricante; produto; versão; designação (só o fabricante é obrigatório). Aceita ficheiros CSV exportados do inventário, separados por ponto e vírgula ou vírgula. Fabricantes do catálogo: " + C.FABRICANTES.map((x) => x.nome).join(", ") + "." }),
      campo("Ficheiro CSV", ficheiro, { largo: true }),
      campo("Ou cole a lista", area, { largo: true }),
      previa),
    gravar: async () => {
      analisar();
      if (!lido.novos.length) return ["Não há ativos novos para importar."];
      if ((estado.ativos || []).length + lido.novos.length > MAX_ATIVOS) return ["Com esta lista passaria o limite de " + MAX_ATIVOS + " ativos por cliente."];
      // Lotes de 400 escritas (limite do Firestore: 500 por lote)
      for (let i = 0; i < lido.novos.length; i += 400) {
        const b = writeBatch(db);
        for (const x of lido.novos.slice(i, i + 400)) {
          b.set(doc(collection(db, "clientes", estado.clienteSel, "ativos")), { ...x, origem: "lista", criadoEm: serverTimestamp(), criadoPor: emailAtual(), atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
        }
        await b.commit();
      }
      aviso(plural(lido.novos.length, "ativo importado", "ativos importados") + ".", "ok");
      return [];
    },
  });
}

function exportarAtivos() {
  const linhas = [["fabricante", "produto", "versão", "designação"], ...(estado.ativos || []).map((a) => [nomeFab(a.fabricante), a.produto || "", a.versao || "", a.designacao || ""])];
  // Valores que começam por = + - @ ficam com apóstrofo, para o Excel não os tratar como fórmulas
  const celula = (v) => { const t = /^[=+\-@\t\r]/.test(v) ? "'" + v : v; return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  descarregar("ativos-" + estado.clienteSel + ".csv", "\uFEFF" + linhas.map((l) => l.map(celula).join(";")).join("\n"));
}

function editarPreferenciasCve() {
  const p = estado.prefsCve || PREFS_CVE;
  const caixa = (id, marcada, rotulo) => {
    const i = el("input", { type: "checkbox", id });
    i.checked = !!marcada;
    return { i, l: el("label", { class: "filtro-caixa campo--largo", for: id }, i, " " + rotulo) };
  };
  const im = caixa("pf-imediato", p.emailImediato, "Email imediato quando uma vulnerabilidade é explorada (catálogo KEV ou EUVD), ou é crítica com probabilidade alta de exploração (EPSS)");
  const cr = caixa("pf-criticas", p.imediatoCriticas, "Também email imediato para todas as críticas (CVSS 9 ou mais), sem esperar pelo EPSS");
  const rd = caixa("pf-resumo", p.resumoDiario, "Resumo diário, às 8 horas, das vulnerabilidades altas e críticas (CVSS 7 ou mais)");
  const op = caixa("pf-omitir", p.omitirProduto, "Não indicar o produto nos emails (só o fabricante e o identificador CVE)");
  abrirDialogo({
    titulo: "Avisos por email",
    corpo: el("div", { class: "grelha-form" }, im.l, cr.l, rd.l, op.l,
      el("p", { class: "campo--largo nota", texto: "Os avisos seguem para as pessoas do cliente com acesso a esta secção e para a equipa da DCAB. Os emails não levam a lista de ativos: só o identificador CVE, a gravidade, o fabricante e, se quiser, o produto. As vulnerabilidades com CVSS abaixo de 7 ficam só nesta área." })),
    gravar: async () => {
      const b = writeBatch(db);
      b.set(doc(db, "clientes", estado.clienteSel, "preferencias", "vulnerabilidades"), {
        emailImediato: im.i.checked, imediatoCriticas: cr.i.checked, resumoDiario: rd.i.checked, omitirProduto: op.i.checked,
        atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      await b.commit();
      aviso("Preferências gravadas.", "ok");
      return [];
    },
  });
}

function tratarCve(v) {
  const editavel = podeEditarCve();
  const sEstado = seletor("cv-estado", C.ESTADOS, v.estado);
  const resp = entrada("cv-resp", "text", v.responsavel, { maxlength: 120 });
  const notas = el("textarea", { id: "cv-notas", rows: "4", maxlength: "1000" });
  notas.value = v.notas || "";
  for (const x of [sEstado, resp, notas]) x.disabled = !editavel;
  const ativosAfetados = (estado.ativos || []).filter((a) => (v.ativos || []).includes(a.id))
    .map((a) => [nomeFab(a.fabricante), a.produto, a.versao, a.designacao ? "(" + a.designacao + ")" : ""].filter(Boolean).join(" "));
  const lig = v.ligacoes || {};
  const ligacoes = [["Registo CVE", "https://www.cve.org/CVERecord?id=" + encodeURIComponent(v.cve)], ["NVD", "https://nvd.nist.gov/vuln/detail/" + encodeURIComponent(v.cve)],
    lig.euvd ? ["EUVD", lig.euvd] : null, lig.aviso ? ["Aviso do fabricante", lig.aviso] : null]
    .filter((x) => x && /^https:\/\/[^\s"'<>]+$/.test(x[1]));
  const info = el("dl", { class: "vig-detalhe" },
    el("dt", { texto: "Descrição (na fonte, em inglês)" }), el("dd", { texto: v.descricao || "—" }),
    el("dt", { texto: "Gravidade" }), el("dd", { texto: C.gravidade(v.cvss) + (typeof v.cvss === "number" ? " · CVSS " + v.cvss.toFixed(1).replace(".", ",") : "") + (v.vetor ? " · " + v.vetor : "") }),
    el("dt", { texto: "Exploração" }), el("dd", { texto: v.kev ? "Explorada: no catálogo KEV da CISA desde " + dataPt(String(v.kevDesde || "").slice(0, 10)) + (v.ransomware ? ", usada em campanhas de ransomware" : "")
      : v.explorada ? "Explorada: assinalada na EUVD da ENISA" : "Sem exploração conhecida" }),
    el("dt", { texto: "EPSS" }), el("dd", { texto: typeof v.epss === "number" ? (v.epss * 100).toFixed(1).replace(".", ",") + " % de probabilidade de exploração em 30 dias (percentil " + Math.round((v.epssPercentil || 0) * 100) + ")" : "Ainda sem pontuação" }),
    el("dt", { texto: "Correspondência" }), el("dd", { texto: C.NIVEIS[v.nivel] || "—" }),
    el("dt", { texto: "Ativos afetados" }), el("dd", { texto: ativosAfetados.join("; ") || "—" }),
    el("dt", { texto: "Publicada" }), el("dd", { texto: dataPt(String(v.publicadoEm || "").slice(0, 10)) }),
    el("dt", { texto: "Detetada aqui" }), el("dd", { texto: dataHoraPt(dataDe(v.detetadoEm)) }),
    el("dt", { texto: "Ligações" }), el("dd", {}, ...ligacoes.flatMap(([t, u], i) => [i ? " · " : "", el("a", { href: u, target: "_blank", rel: "noopener noreferrer", texto: t })])));
  abrirDialogo({
    titulo: v.cve + " · " + nomeFab(v.fabricante),
    rotulo: editavel ? "Gravar" : "Fechar",
    corpo: el("div", { class: "grelha-form" },
      el("div", { class: "campo--largo" }, info),
      v.nivel !== "versao" ? el("p", { class: "campo--largo nota", texto: "Confirme a versão instalada no aviso do fabricante: a correspondência foi feita " + (v.nivel === "fabricante" ? "só pelo fabricante." : "pelo produto, sem versão.") } ) : null,
      el("p", { class: "campo--largo nota", texto: "O que fazer: aplique a correção ou a mitigação indicada no aviso do fabricante. Se for explorada e o equipamento estiver exposto à Internet, trate como prioridade e verifique se houve acesso indevido. A gestão de vulnerabilidades faz parte das medidas de segurança da NIS2 (Diretiva (UE) 2022/2555, art. 21.º, n.º 2, alínea e))." }),
      campo("Estado", sEstado), campo("Responsável", resp),
      campo("Notas", notas, { largo: true })),
    gravar: async () => {
      if (!editavel) return [];
      const b = writeBatch(db);
      b.update(doc(db, "clientes", estado.clienteSel, "cves", v.id), { estado: sEstado.value, responsavel: texto(resp.value, 120), notas: texto(notas.value, 1000), atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      await b.commit();
      aviso("Vulnerabilidade atualizada.", "ok");
      return [];
    },
  });
}

/* ---------- Formulários ---------- */

function campo(rotulo, input, opcoes = {}) {
  return el("div", { class: "campo" + (opcoes.largo ? " campo--largo" : ""), id: opcoes.id || null },
    el("label", { for: input.id, texto: rotulo }), input,
    opcoes.ajuda ? el("p", { class: "campo__ajuda", texto: opcoes.ajuda }) : null);
}
function entrada(id, tipo, valor, extra = {}) {
  return el("input", { id, name: id, type: tipo, value: valor ?? "", ...extra });
}
function seletor(id, opcoes, valor, vazio) {
  const s = el("select", { id, name: id });
  if (vazio !== undefined) s.append(el("option", { value: "", texto: vazio }));
  for (const o of opcoes) {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    const op = el("option", { value: v, texto: t });
    if (v === valor) op.selected = true;
    s.append(op);
  }
  return s;
}

function abrirDialogo({ titulo, corpo, gravar, rotulo = "Gravar", perigo = false }) {
  $("dialogo-titulo").textContent = titulo;
  $("dialogo-corpo").replaceChildren(...[].concat(corpo));
  $("dialogo-erros").textContent = "";
  const b = $("dialogo-gravar");
  b.textContent = rotulo;
  b.disabled = false;
  b.classList.toggle("botao--perigo", perigo);
  estado.aoGravar = gravar;
  $("dialogo").showModal();
}

async function submeterDialogo(ev) {
  ev.preventDefault();
  const b = $("dialogo-gravar");
  b.disabled = true;
  try {
    const erros = await estado.aoGravar();
    if (erros && erros.length) { $("dialogo-erros").textContent = erros.join(" "); b.disabled = false; return; }
    $("dialogo").close();
  } catch (e) {
    $("dialogo-erros").textContent = mensagemErro(e);
    b.disabled = false;
  }
}

function editarDespesa(d) {
  const v = d || { estado: "Lançada", ivaElegivel: false };
  const pedidosAbertos = Object.values(estado.pedidos)
    .filter((p) => !M.ESTADOS_FECHADOS.includes(p.estado) || p.codigo === v.pedido)
    .sort((a, b) => M.ordemPedido(a.codigo) - M.ordemPedido(b.codigo)).map((p) => p.codigo);

  const f = {
    linha: seletor("d-linha", M.QUADRO.map((l) => [l.codigo, l.codigo + " – " + l.descricao]), v.linha, "Escolha a linha orçamental"),
    fornecedor: entrada("d-fornecedor", "text", v.fornecedor, { maxlength: 150, autocomplete: "off" }),
    nif: entrada("d-nif", "text", v.nif, { inputmode: "numeric", maxlength: 9, autocomplete: "off" }),
    documento: entrada("d-documento", "text", v.documento, { maxlength: 60, autocomplete: "off" }),
    dataDocumento: entrada("d-data", "date", v.dataDocumento),
    mesReferencia: entrada("d-mes", "month", v.mesReferencia),
    descricao: entrada("d-descricao", "text", v.descricao, { maxlength: 300 }),
    semIva: entrada("d-semiva", "text", valorParaCampo(v.semIva), { inputmode: "decimal", placeholder: "0,00" }),
    iva: entrada("d-iva", "text", valorParaCampo(v.iva), { inputmode: "decimal", placeholder: "0,00" }),
    ivaElegivel: seletor("d-ivaeleg", ["Não", "Sim"], v.ivaElegivel ? "Sim" : "Não"),
    dataPagamento: entrada("d-pagamento", "date", v.dataPagamento),
    meioPagamento: seletor("d-meio", M.MEIOS_PAGAMENTO, v.meioPagamento, "—"),
    pedido: seletor("d-pedido", pedidosAbertos, v.pedido, "Sem pedido"),
    estado: seletor("d-estado", M.ESTADOS_DESPESA, v.estado),
    valorValidado: entrada("d-validado", "text", valorParaCampo(v.valorValidado), { inputmode: "decimal", placeholder: "Preenchido após validação" }),
    comprovativo: entrada("d-comprovativo", "text", v.comprovativo, { maxlength: 200 }),
    observacoes: entrada("d-obs", "text", v.observacoes, { maxlength: 500 }),
  };
  const previsao = el("p", { class: "previsao", "aria-live": "polite" });
  const leitor = leitorQr((fatura) => {
    f.nif.value = fatura.nif;
    f.documento.value = fatura.documento;
    f.dataDocumento.value = fatura.dataDocumento;
    f.semIva.value = valorParaCampo(fatura.semIva);
    f.iva.value = valorParaCampo(fatura.iva);
    if (!f.fornecedor.value) {
      const anterior = [...estado.despesas].reverse().find((x) => x.nif === fatura.nif && x.fornecedor);
      if (anterior) f.fornecedor.value = anterior.fornecedor;
    }
    if (!f.comprovativo.value && fatura.atcud) f.comprovativo.value = "ATCUD " + fatura.atcud;
    atualizar();
    return f.fornecedor.value ? [] : ["Indique o nome do fornecedor (o código QR não inclui o nome)."];
  });
  const campoMes = campo("Mês de referência", f.mesReferencia, { id: "c-mes", ajuda: "Obrigatório nas linhas de contratação (4.1 e 4.2)." });

  const atualizar = () => {
    const l = M.LINHA[f.linha.value];
    campoMes.hidden = !(l && l.rubrica === 4);
    const s = lerValor(f.semIva.value), i = lerValor(f.iva.value) || 0;
    const taxa = M.taxaLinha(f.linha.value, estado.parametros);
    if (s === null || isNaN(s) || taxa === null) { previsao.textContent = "Escolha a linha e indique o valor para calcular a comparticipação."; return; }
    const eleg = s + (f.ivaElegivel.value === "Sim" ? i : 0);
    const comp = f.estado.value === "Não elegível" ? 0 : eleg * taxa;
    previsao.textContent = "Valor elegível " + eur(eleg) + " · Taxa " + pct(taxa) + " · Comparticipação " + eur(comp);
  };
  for (const c of Object.values(f)) c.addEventListener("input", atualizar);
  atualizar();

  abrirDialogo({
    titulo: d ? "Editar despesa nº " + d.numero : "Nova despesa",
    corpo: el("div", { class: "grelha-form" },
      d ? null : el("div", { class: "campo--largo" }, leitor.elemento),
      campo("Linha orçamental", f.linha, { largo: true }),
      campo("Fornecedor / colaborador", f.fornecedor), campo("NIF", f.nif),
      campo("Nº do documento", f.documento), campo("Data do documento", f.dataDocumento),
      campoMes, campo("Descrição da despesa", f.descricao, { largo: true }),
      campo("Valor sem IVA (€)", f.semIva), campo("IVA (€)", f.iva), campo("IVA elegível?", f.ivaElegivel),
      campo("Data de pagamento", f.dataPagamento), campo("Meio de pagamento", f.meioPagamento),
      campo("Pedido de pagamento", f.pedido), campo("Estado da despesa", f.estado),
      campo("Valor validado pelo organismo (€)", f.valorValidado),
      campo("Ref. comprovativo / arquivo", f.comprovativo), campo("Observações", f.observacoes, { largo: true }),
      el("div", { class: "campo--largo" }, previsao)),
    gravar: async () => {
      const linha = M.LINHA[f.linha.value];
      const dados = {
        linha: f.linha.value,
        fornecedor: texto(f.fornecedor.value, 150), nif: texto(f.nif.value, 9), documento: texto(f.documento.value, 60),
        dataDocumento: f.dataDocumento.value, mesReferencia: linha && linha.rubrica === 4 ? f.mesReferencia.value : "",
        descricao: texto(f.descricao.value, 300), semIva: lerValor(f.semIva.value), iva: lerValor(f.iva.value),
        ivaElegivel: f.ivaElegivel.value === "Sim", dataPagamento: f.dataPagamento.value, meioPagamento: f.meioPagamento.value,
        pedido: f.pedido.value, estado: f.estado.value, valorValidado: lerValor(f.valorValidado.value),
        comprovativo: texto(f.comprovativo.value, 200), observacoes: texto(f.observacoes.value, 500),
      };
      const erros = [];
      if (Number.isNaN(dados.semIva) || Number.isNaN(dados.iva) || Number.isNaN(dados.valorValidado)) erros.push("Há valores em formato inválido (use, por exemplo, 2 500,00).");
      else erros.push(...M.validarDespesa(dados));
      if (erros.length) return erros;

      const batch = writeBatch(db);
      const col = collection(raiz(), "despesas");
      const ref = d ? doc(col, d.id) : doc(col);
      const meta = { atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() };
      if (d) batch.update(ref, { ...dados, ...meta });
      else batch.set(ref, { ...dados, ...meta, ordem: Date.now(), criadoEm: serverTimestamp(), criadoPor: emailAtual() });
      auditar(batch, d ? "alterar" : "criar", "despesas", ref.id, dados.linha + " · " + dados.fornecedor + " · " + dados.documento + " · " + dados.semIva);
      await batch.commit();
      aviso(d ? "Despesa atualizada." : "Despesa registada.", "ok");
    },
  });
}

function eliminarDespesa(d) {
  abrirDialogo({
    titulo: "Eliminar despesa nº " + d.numero,
    corpo: el("p", { texto: "Vai eliminar a despesa " + (d.documento || "sem documento") + " de " + (d.fornecedor || "fornecedor não indicado") + " (" + eur(d.elegivel) + "). Esta ação fica registada na auditoria e não pode ser anulada." }),
    rotulo: "Eliminar", perigo: true,
    gravar: async () => {
      const batch = writeBatch(db);
      batch.delete(doc(collection(raiz(), "despesas"), d.id));
      auditar(batch, "eliminar", "despesas", d.id, d.linha + " · " + d.fornecedor + " · " + d.documento + " · " + d.semIva);
      await batch.commit();
      aviso("Despesa eliminada.", "ok");
    },
  });
}

function editarPedido(x) {
  const novo = !x;
  const v = x || { tipo: "Reembolso / Acerto", estado: "Em preparação" };
  const f = {
    codigo: entrada("pd-codigo", "text", v.codigo || "", { maxlength: 4, disabled: !novo, placeholder: "AC01" }),
    tipo: seletor("pd-tipo", M.TIPOS_PEDIDO, v.tipo),
    periodoInicio: entrada("pd-inicio", "date", v.periodoInicio), periodoFim: entrada("pd-fim", "date", v.periodoFim),
    dataSubmissao: entrada("pd-submissao", "date", v.dataSubmissao),
    valorSolicitado: entrada("pd-solicitado", "text", valorParaCampo(v.valorSolicitado), { inputmode: "decimal" }),
    dataTransferencia: entrada("pd-transferencia", "date", v.dataTransferencia),
    valorTransferido: entrada("pd-transferido", "text", valorParaCampo(v.valorTransferido), { inputmode: "decimal" }),
    estado: seletor("pd-estado", M.ESTADOS_PEDIDO, v.estado || "Em preparação"),
    observacoes: entrada("pd-obs", "text", v.observacoes, { maxlength: 300 }),
  };
  abrirDialogo({
    titulo: novo ? "Novo pedido de pagamento" : "Pedido " + x.codigo,
    corpo: el("div", { class: "grelha-form" },
      campo("Nº do pedido", f.codigo, { ajuda: novo ? "ADT, PSF, PP + 2 dígitos ou AC + 2 dígitos." : null }), campo("Tipo", f.tipo),
      campo("Início do período da despesa", f.periodoInicio), campo("Fim do período da despesa", f.periodoFim),
      campo("Data de submissão", f.dataSubmissao), campo("Valor solicitado (€)", f.valorSolicitado),
      campo("Data de transferência", f.dataTransferencia), campo("Valor transferido (€)", f.valorTransferido),
      campo("Estado", f.estado, { ajuda: "Submetido, Em análise, Aprovado e Pago bloqueiam as despesas associadas." }),
      campo("Ref. bancária / observações", f.observacoes, { largo: true })),
    gravar: async () => {
      const codigo = (novo ? f.codigo.value : x.codigo).trim().toUpperCase();
      const dados = {
        tipo: f.tipo.value, periodoInicio: f.periodoInicio.value, periodoFim: f.periodoFim.value, dataSubmissao: f.dataSubmissao.value,
        valorSolicitado: lerValor(f.valorSolicitado.value), dataTransferencia: f.dataTransferencia.value,
        valorTransferido: lerValor(f.valorTransferido.value), estado: f.estado.value, observacoes: texto(f.observacoes.value, 300),
        atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual(),
      };
      const erros = [];
      if (!/^(ADT|PSF|PP\d{2}|AC\d{2})$/.test(codigo)) erros.push("Nº do pedido inválido.");
      if (novo && estado.pedidos[codigo]) erros.push("Já existe um pedido com esse número.");
      if (Number.isNaN(dados.valorSolicitado) || Number.isNaN(dados.valorTransferido)) erros.push("Há valores em formato inválido.");
      if (dados.periodoInicio && dados.periodoFim && dados.periodoFim < dados.periodoInicio) erros.push("O fim do período é anterior ao início.");
      if (erros.length) return erros;
      const batch = writeBatch(db);
      batch.set(doc(collection(raiz(), "pedidos"), codigo), dados);
      auditar(batch, novo ? "criar" : "alterar", "pedidos", codigo, codigo + " · " + dados.estado + " · " + dados.valorTransferido);
      await batch.commit();
      aviso("Pedido " + codigo + " gravado.", "ok");
    },
  });
}

function editarTaxas() {
  const campos = Object.entries(M.RUBRICAS).map(([num, r]) => {
    const atual = M.taxaRubrica(Number(num), estado.parametros);
    const input = entrada("taxa-" + num, "text", String(Math.round(atual * 10000) / 100).replace(".", ","), { inputmode: "decimal", maxlength: 6 });
    return { num, r, input };
  });
  abrirDialogo({
    titulo: "Taxas de comparticipação",
    corpo: [
      el("p", { class: "nota", texto: "A alteração aplica-se a todas as despesas da rubrica, incluindo as já registadas, e fica registada na auditoria. Indique a percentagem (por exemplo 85 ou 85,5)." }),
      el("div", { class: "grelha-form" }, campos.map(({ num, r, input }) =>
        campo(num + ". " + r.curto + " (aprovada: " + pct(r.taxa) + ")", input))),
    ],
    gravar: async () => {
      const taxas = {};
      const erros = [];
      for (const { num, r, input } of campos) {
        const v = lerValor(input.value);
        if (v === null || Number.isNaN(v) || v < 0 || v > 100) { erros.push("Rubrica " + num + ": indique uma percentagem entre 0 e 100."); continue; }
        const t = Math.round(v * 100) / 10000;
        if (t !== r.taxa) taxas[num] = t;
      }
      if (erros.length) return erros;
      const parametros = { ...estado.parametros };
      delete parametros.taxas;
      if (Object.keys(taxas).length) parametros.taxas = taxas;
      const batch = writeBatch(db);
      batch.set(raiz(), { parametros, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      auditar(batch, "alterar", "taxas", CONFIG.projetoId, "Taxas: " + (Object.keys(taxas).length ? Object.entries(taxas).map(([k, v]) => "R" + k + "=" + Math.round(v * 10000) / 100 + "%").join(", ") : "repostas as aprovadas"));
      await batch.commit();
      aviso("Taxas de comparticipação atualizadas.", "ok");
    },
  });
}

async function criarFases() {
  try {
    const batch = writeBatch(db);
    for (const p of M.PEDIDOS_INICIAIS) {
      batch.set(doc(collection(raiz(), "pedidos"), p.codigo), {
        tipo: p.tipo, periodoInicio: "", periodoFim: "", dataSubmissao: "", valorSolicitado: null, dataTransferencia: "",
        valorTransferido: null, estado: "Em preparação", observacoes: "", atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual(),
      });
    }
    auditar(batch, "criar", "pedidos", "ADT-PSF", "Criação das fases ADT, PP01–PP12 e PSF");
    await batch.commit();
    aviso("Fases da candidatura criadas.", "ok");
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

async function gravarParametros(ev) {
  ev.preventDefault();
  const parametros = {
    entidade: texto($("p-entidade").value, 120), projeto: texto($("p-projeto").value, 120),
    inicio: $("p-inicio").value, duracao: Number($("p-duracao").value) || 24,
    entidadeConsultora: texto($("p-consultora").value, 120),
    consultor1: texto($("p-consultor1").value, 120), consultor2: texto($("p-consultor2").value, 120),
  };
  if (estado.parametros.taxas) parametros.taxas = estado.parametros.taxas;
  if (parametros.duracao < 1 || parametros.duracao > 60) return aviso("A duração tem de estar entre 1 e 60 meses.", "erro");
  try {
    const batch = writeBatch(db);
    batch.set(raiz(), { parametros, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
    auditar(batch, "alterar", "parametros", CONFIG.projetoId, JSON.stringify(parametros));
    await batch.commit();
    aviso("Parâmetros gravados.", "ok");
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

/* ---------- Leitura de QR code de faturas ---------- */

let pdfjsCarregado = null;
function carregarPdfjs() {
  if (!pdfjsCarregado) {
    pdfjsCarregado = import("/reservado/vendor/pdf.min.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/reservado/vendor/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsCarregado;
}

let jsqrCarregado = null;
function carregarJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (!jsqrCarregado) {
    jsqrCarregado = new Promise((resolver, rejeitar) => {
      const s = document.createElement("script");
      s.src = "/reservado/vendor/jsQR.js";
      s.onload = () => (window.jsQR ? resolver(window.jsQR) : rejeitar(new Error("leitor indisponível")));
      s.onerror = () => { jsqrCarregado = null; rejeitar(new Error("Não foi possível carregar o leitor de códigos QR.")); };
      document.head.append(s);
    });
  }
  return jsqrCarregado;
}

// Devolve os textos de todos os QR codes encontrados na imagem
async function lerQrDeCanvas(canvas) {
  if ("BarcodeDetector" in window) {
    try {
      const encontrados = await new window.BarcodeDetector({ formats: ["qr_code"] }).detect(canvas);
      if (encontrados.length) return encontrados.map((x) => x.rawValue);
    } catch (e) { /* segue para o leitor alternativo */ }
  }
  const jsQR = await carregarJsQR();
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  return r ? [r.data] : [];
}

async function procurarFatura(canvas) {
  const textos = await lerQrDeCanvas(canvas);
  for (const t of textos) { const f = M.lerQrFatura(t); if (f) return f; }
  return textos.length ? { naoFatura: true } : null;
}

async function lerFaturaDeFicheiro(ficheiro) {
  if (ficheiro.size > 20 * 1024 * 1024) throw new Error("O ficheiro excede 20 MB.");
  let semFatura = false;
  if (ficheiro.type === "application/pdf" || /\.pdf$/i.test(ficheiro.name)) {
    const pdfjs = await carregarPdfjs();
    const documento = await pdfjs.getDocument({ data: new Uint8Array(await ficheiro.arrayBuffer()), isEvalSupported: false }).promise;
    for (let n = 1; n <= Math.min(documento.numPages, 4); n++) {
      const pagina = await documento.getPage(n);
      for (const escala of [2, 3.5]) {
        const vista = pagina.getViewport({ scale: escala });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(vista.width);
        canvas.height = Math.floor(vista.height);
        await pagina.render({ canvasContext: canvas.getContext("2d"), viewport: vista }).promise;
        const r = await procurarFatura(canvas);
        if (r && !r.naoFatura) return r;
        if (r && r.naoFatura) semFatura = true;
      }
    }
  } else if (/^image\//.test(ficheiro.type)) {
    const imagem = await createImageBitmap(ficheiro);
    const maior = Math.max(imagem.width, imagem.height);
    // Tenta no tamanho original (até 3000 px), ampliado (QR pequeno) e com contraste reforçado (fotografias)
    for (const [alvo, contraste] of [[Math.min(maior, 3000), false], [Math.min(maior * 2, 3600), false], [Math.min(maior * 2, 3600), true]]) {
      const escala = alvo / maior;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(imagem.width * escala);
      canvas.height = Math.round(imagem.height * escala);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (contraste) ctx.filter = "grayscale(1) contrast(1.8)";
      ctx.imageSmoothingEnabled = !contraste;
      ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      const r = await procurarFatura(canvas);
      if (r && !r.naoFatura) return r;
      if (r && r.naoFatura) semFatura = true;
    }
  } else {
    throw new Error("Formato não suportado. Use PDF, JPG ou PNG.");
  }
  throw new Error(semFatura
    ? "Foi encontrado um código QR, mas não é o código QR fiscal da fatura (pode ser de pagamento ou de outro tipo)."
    : "Não foi encontrado o código QR da fatura. Experimente uma imagem mais nítida ou a leitura com a câmara.");
}

/* Bloco do formulário de despesa: importar fatura (PDF/imagem) ou ler com a câmara.
 * aoLer(fatura) preenche os campos e devolve avisos adicionais. */
function leitorQr(aoLer) {
  const estadoLeitor = el("div", { class: "leitor__estado", "aria-live": "polite" });
  const video = el("video", { class: "leitor__video", playsinline: true, muted: true, hidden: true });
  const ficheiro = el("input", { type: "file", accept: "application/pdf,image/*", class: "sr", id: "qr-ficheiro" });
  let stream = null, ativo = false;

  const mostrarResultado = (fatura) => {
    const avisos = [...fatura.avisos, ...aoLer(fatura)];
    const partes = [el("p", { class: "leitor__ok", texto: "Dados preenchidos a partir do código QR: NIF " + fatura.nif + ", " + (fatura.documento || "documento") + ", " + dataPt(fatura.dataDocumento) + ", total " + eur(fatura.total) + ". Confirme os valores antes de gravar." })];
    if (avisos.length) partes.push(el("ul", { class: "alertas" }, avisos.map((t) => el("li", { texto: t }))));
    estadoLeitor.replaceChildren(...partes);
  };
  const mostrarErro = (msg) => estadoLeitor.replaceChildren(el("p", { class: "leitor__erro", texto: msg }));

  const pararCamera = () => {
    ativo = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.hidden = true;
    botaoCamera.textContent = "Ler com a câmara";
  };

  ficheiro.addEventListener("change", async () => {
    const f = ficheiro.files[0];
    ficheiro.value = "";
    if (!f) return;
    pararCamera();
    estadoLeitor.replaceChildren(el("p", { texto: "A procurar o código QR em " + f.name + "…" }));
    try { mostrarResultado(await lerFaturaDeFicheiro(f)); } catch (e) { mostrarErro(e.message || "Não foi possível ler o ficheiro."); }
  });

  const botaoCamera = el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Ler com a câmara" });
  botaoCamera.addEventListener("click", async () => {
    if (ativo) return pararCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return mostrarErro("Este navegador não permite usar a câmara.");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch (e) {
      return mostrarErro("Não foi possível aceder à câmara. Autorize o acesso nas definições do navegador.");
    }
    ativo = true;
    video.srcObject = stream;
    video.hidden = false;
    await video.play();
    botaoCamera.textContent = "Parar câmara";
    estadoLeitor.replaceChildren(el("p", { texto: "Aponte a câmara para o código QR da fatura." }));
    const canvas = document.createElement("canvas");
    const ciclo = async () => {
      if (!ativo) return;
      if (video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0);
        try {
          const r = await procurarFatura(canvas);
          if (r && !r.naoFatura) { pararCamera(); return mostrarResultado(r); }
        } catch (e) { pararCamera(); return mostrarErro(e.message); }
      }
      setTimeout(ciclo, 300);
    };
    ciclo();
  });

  // A câmara desliga-se sempre que o diálogo fecha
  $("dialogo").addEventListener("close", pararCamera, { once: true });

  return {
    elemento: el("div", { class: "leitor" },
      el("p", { class: "leitor__titulo", texto: "Preencher a partir do código QR da fatura" }),
      el("div", { class: "leitor__botoes" },
        el("label", { class: "botao botao--pequeno", for: "qr-ficheiro", texto: "Importar fatura (PDF ou imagem)" }), ficheiro, botaoCamera),
      video, estadoLeitor),
  };
}

/* ---------- Excel ---------- */

// Datas do Excel em número de série → AAAA-MM-DD (sem desvios de fuso horário)
function dataExcel(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : "";
}
const numExcel = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v === null || v === "" || v === undefined ? null : lerValor(v));

function lerFolha(wb, nome) {
  const ws = wb.Sheets[nome];
  if (!ws) throw new Error("Folha em falta: " + nome);
  return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
}

async function importarExcel(ev) {
  const ficheiro = ev.target.files[0];
  ev.target.value = "";
  if (!ficheiro) return;
  if (!window.XLSX) return aviso("Não foi possível carregar o leitor de Excel.", "erro");
  if (ficheiro.size > 10 * 1024 * 1024) return aviso("O ficheiro excede 10 MB.", "erro");

  let parametros, despesas, pedidos;
  try {
    const wb = window.XLSX.read(await ficheiro.arrayBuffer(), { type: "array", cellDates: false });

    const pr = lerFolha(wb, "Parâmetros");
    const val = (rotulo) => { const l = pr.find((r) => r[1] === rotulo); return l ? l[2] : null; };
    const nome = (v) => (v && v !== "Nome a preencher" ? texto(v, 120) : "");
    parametros = {
      entidade: texto(val("Entidade beneficiária") || "DCAB Consulting", 120), projeto: texto(val("Projeto") || "AI4CyberSecurity", 120),
      inicio: dataExcel(val("Data de início de elegibilidade")), duracao: Number(val("Duração (meses)")) || 24,
      entidadeConsultora: texto(val("Entidade consultora") || "", 120),
      consultor1: nome(val("Consultor Sénior 1 (linha 4.1)")), consultor2: nome(val("Consultor Sénior 2 (linha 4.2)")),
    };

    const rd = lerFolha(wb, "Registo Despesas");
    const h = rd.findIndex((r) => r[0] === "Nº" && String(r[1] || "").startsWith("Linha orçamental"));
    if (h < 0) throw new Error("Cabeçalho do Registo de Despesas não encontrado.");
    const col = (t) => rd[h].indexOf(t);
    const c = {
      linha: col("Linha orçamental (escolher)"), forn: col("Fornecedor / Colaborador"), nif: col("NIF"), doc: col("Nº Documento"),
      data: col("Data Documento"), mes: col("Mês de referência (contratação)"), desc: col("Descrição da despesa"),
      semIva: col("Valor s/ IVA"), iva: col("IVA"), ivaEleg: col("IVA elegível?"), pag: col("Data Pagamento"),
      meio: col("Meio de Pagamento"), pedido: col("Pedido de Pagamento"), estado: col("Estado da despesa"),
      validado: col("Valor validado pelo organismo"), comp: col("Ref. Comprovativo / Arquivo"), obs: col("Observações"),
    };
    despesas = rd.slice(h + 1).filter((r) => r[c.linha]).map((r) => {
      const linha = String(r[c.linha]).trim().split(/\s/)[0];
      const l = M.LINHA[linha];
      return {
        linha, fornecedor: texto(r[c.forn], 150), nif: texto(r[c.nif], 9), documento: texto(r[c.doc], 60),
        dataDocumento: dataExcel(r[c.data]), mesReferencia: l && l.rubrica === 4 ? dataExcel(r[c.mes]).slice(0, 7) : "",
        descricao: texto(r[c.desc], 300), semIva: numExcel(r[c.semIva]), iva: numExcel(r[c.iva]),
        ivaElegivel: r[c.ivaEleg] === "Sim", dataPagamento: dataExcel(r[c.pag]),
        meioPagamento: M.MEIOS_PAGAMENTO.includes(r[c.meio]) ? r[c.meio] : "",
        pedido: /^(ADT|PSF|PP\d{2}|AC\d{2})$/.test(String(r[c.pedido] || "")) ? String(r[c.pedido]) : "",
        estado: M.ESTADOS_DESPESA.includes(r[c.estado]) ? r[c.estado] : "Lançada",
        valorValidado: numExcel(r[c.validado]), comprovativo: texto(r[c.comp], 200), observacoes: texto(r[c.obs], 500),
      };
    });

    const tr = lerFolha(wb, "Controlo Transferências");
    const ht = tr.findIndex((r) => r[0] === "Nº Pedido");
    pedidos = tr.slice(ht + 1).filter((r) => /^(ADT|PSF|PP\d{2}|AC\d{2})$/.test(String(r[0] || ""))).map((r) => ({
      codigo: String(r[0]), tipo: M.TIPOS_PEDIDO.includes(r[1]) ? r[1] : "Pedido de pagamento intercalar",
      periodoInicio: dataExcel(r[2]), periodoFim: dataExcel(r[3]), dataSubmissao: dataExcel(r[4]), valorSolicitado: numExcel(r[5]),
      dataTransferencia: dataExcel(r[6]), valorTransferido: numExcel(r[7]),
      estado: M.ESTADOS_PEDIDO.includes(r[12]) ? r[12] : "Em preparação", observacoes: texto(r[13], 300),
    }));
  } catch (e) {
    console.error(e);
    return aviso("Não foi possível ler o ficheiro: " + (e.message || "formato inesperado") + ".", "erro");
  }

  const chave = (d) => [d.linha, d.nif, (d.documento || "").toUpperCase(), d.dataDocumento, d.semIva].join("|");
  const existentes = new Set(estado.despesas.map(chave));
  const novas = despesas.filter((d) => !existentes.has(chave(d)));
  const invalidas = novas.filter((d) => M.validarDespesa(d).length || Number.isNaN(d.semIva));
  const validas = novas.filter((d) => !invalidas.includes(d));

  abrirDialogo({
    titulo: "Importar do Excel",
    corpo: el("ul", { class: "lista-importacao" },
      el("li", { texto: "Parâmetros do projeto: serão atualizados." }),
      el("li", { texto: plural(validas.length, "despesa nova a importar.", "despesas novas a importar.") }),
      el("li", { texto: plural(despesas.length - novas.length, "despesa já existente (ignorada).", "despesas já existentes (ignoradas).") }),
      invalidas.length ? el("li", { texto: plural(invalidas.length, "despesa com dados incompletos (ignorada", "despesas com dados incompletos (ignoradas") + "; corrija no Excel e volte a importar)." }) : null,
      el("li", { texto: plural(pedidos.length, "pedido de pagamento a criar ou atualizar.", "pedidos de pagamento a criar ou atualizar.") })),
    rotulo: "Importar",
    gravar: async () => {
      // Despesas primeiro (antes de eventuais pedidos fechados), em lotes
      const base = Date.now();
      for (let i = 0; i < validas.length; i += 200) {
        const batch = writeBatch(db);
        validas.slice(i, i + 200).forEach((d, j) => batch.set(doc(collection(raiz(), "despesas")), {
          ...d, ordem: base + i + j, criadoEm: serverTimestamp(), criadoPor: emailAtual(), atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual(),
        }));
        auditar(batch, "importar", "despesas", "lote-" + (i / 200 + 1), "Importação de " + Math.min(200, validas.length - i) + " despesas");
        await batch.commit();
      }
      const batch = writeBatch(db);
      if (estado.parametros.taxas) parametros.taxas = estado.parametros.taxas;
      batch.set(raiz(), { parametros, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      for (const p of pedidos) {
        const { codigo, ...resto } = p;
        batch.set(doc(collection(raiz(), "pedidos"), codigo), { ...resto, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      }
      auditar(batch, "importar", "pedidos", "excel", "Importação de parâmetros e " + pedidos.length + " pedidos");
      await batch.commit();
      aviso("Importação concluída: " + validas.length + " despesas e " + pedidos.length + " pedidos.", "ok");
    },
  });
}

function exportarExcel() {
  if (!window.XLSX) return aviso("Não foi possível carregar o gerador de Excel.", "erro");
  const { c, q, r, p, ct, res } = calcular();
  const X = window.XLSX;
  const wb = X.utils.book_new();
  const folha = (nome, linhas) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(linhas), nome);
  folha("Resumo", [
    ["Resumo de execução", estado.parametros.projeto || "AI4CyberSecurity", "Exportado em " + dataPt(hojeISO())], [],
    ["Nº", "Rubrica", "Investimento aprovado", "Taxa", "Comparticipação aprovada", "Despesa executada", "% execução", "Comparticipação executada", "Comparticipação validada", "Saldo por executar"],
    ...r.map((x) => [x.numero, x.nome, x.aprovado, x.taxa, x.compAprovada, x.executada, x.percentagem, x.compExecutada, x.compValidada, x.saldo]), [],
    ["Indicadores"], ["Comparticipação aprovada", res.compAprovada], ["Comparticipação executada", res.compExecutada],
    ["Comparticipação validada", res.compValidada], ["Total recebido", res.recebido], ["Saldo por receber", res.saldoReceber],
    ["Verbas por justificar", res.porJustificar], ["Execução financeira global", res.execucaoGlobal],
    ["Despesas com alertas", res.comAlertas], ["Meses de contratação em falta", res.mesesEmFalta],
  ]);
  folha("Quadro Investimento", [
    ["Código", "Rubrica", "Descrição", "Valor aprovado", "Taxa", "Comparticipação aprovada", "Despesa executada", "Comparticipação executada", "Despesa validada", "Comparticipação validada", "Saldo", "% execução"],
    ...q.map((l) => [l.codigo, l.rubrica, l.descricao, l.valor, l.taxa, l.compAprovada, l.executada, l.compExecutada, l.validada, l.compValidada, l.saldo, l.percentagem]),
  ]);
  folha("Registo Despesas", [
    ["Nº", "Código", "Rubrica", "Fornecedor / Colaborador", "NIF", "Nº Documento", "Data Documento", "Mês de referência", "Descrição", "Valor s/ IVA", "IVA", "IVA elegível?", "Valor Total", "Valor Elegível", "Taxa", "Comparticipação", "Data Pagamento", "Meio de Pagamento", "Pedido de Pagamento", "Estado", "Valor validado", "Comparticipação validada", "Comprovativo", "Observações", "Verificação"],
    ...c.map((d) => [d.numero, d.linha, d.rubrica, d.fornecedor, d.nif, d.documento, d.dataDocumento, d.mesReferencia, d.descricao, d.semIva, d.iva, d.ivaElegivel ? "Sim" : "Não", d.valorTotal, d.elegivel, d.taxa, d.comparticipacao, d.dataPagamento, d.meioPagamento, d.pedido, d.estado, d.valorValidado, d.compValidada, d.comprovativo, d.observacoes, d.alertas.length ? d.alertas.join("; ") : "OK"]),
  ]);
  folha("Controlo Transferências", [
    ["Nº Pedido", "Tipo", "Período início", "Período fim", "Data submissão", "Valor solicitado", "Data transferência", "Valor transferido", "Despesa elegível imputada", "Comparticipação apresentada", "Comparticipação validada", "Diferença", "Estado", "Observações"],
    ...p.map((x) => [x.codigo, x.tipo, x.periodoInicio, x.periodoFim, x.dataSubmissao, x.valorSolicitado, x.dataTransferencia, x.valorTransferido, x.imputada, x.apresentada, x.validada, x.diferenca, x.estado, x.observacoes]),
  ]);
  folha("Controlo Contratação", [
    ["Mês nº", "Mês", "Consultor 1 — valor", "Consultor 1 — estado", "Consultor 2 — valor", "Consultor 2 — estado"],
    ...ct.c1.map((m, i) => [m.numero, m.mes, m.valor, m.estado, ct.c2[i].valor, ct.c2[i].estado]),
  ]);
  X.writeFile(wb, "Controlo_" + (estado.parametros.projeto || "AI4CyberSecurity") + "_" + hojeISO() + ".xlsx");
}

/* ---------- Início (portal) ----------
 * Um cartão por secção a que a pessoa tem acesso. As ligações para secções fora deste site (por exemplo o CRM)
 * ficam no Firestore (portal/ligacoes), legíveis só pela equipa, para não aparecerem no código público da página.
 */
const CARTOES = {
  candidatura: ["Controlo da candidatura de IA", "Despesas, pedidos de pagamento, quadro de investimento e contratação do projeto AI4CyberSecurity."],
  vigilancia: ["Vigilância de exposição", "Credenciais expostas, computadores infetados e publicações de grupos de ransomware dos clientes."],
  incidentes: ["Incidentes e notificações", "Registo de incidentes, prazos de notificação ao CNCS e à CNPD e minutas para o cliente submeter."],
  vulnerabilidades: ["Alertas de vulnerabilidades", "Fabricantes e ativos de cada cliente e as vulnerabilidades críticas que os afetam, com aviso por email."],
  acessos: ["Acessos", "Convites, papéis, secções de cada pessoa e segundo fator."],
};

function carregarLigacoes() {
  if (estado.subLigacoes) return;
  estado.subLigacoes = onSnapshot(doc(db, "portal", "ligacoes"), (d) => {
    const itens = d.exists() && Array.isArray(d.data().itens) ? d.data().itens : [];
    estado.ligacoes = itens.filter((x) => x && typeof x.url === "string" && /^https:\/\/[^\s"'<>]+$/.test(x.url));
    if (estado.seccao === "inicio") desenhar();
  }, () => { estado.ligacoes = []; });
}

function painelInicio() {
  const resumoCartao = (s) => {
    if (s === "candidatura" && estado.prontos >= 3) {
      const r = calcular().res;
      return "Execução " + pct(r.execucaoGlobal) + " · " + plural(r.comAlertas, "despesa com alertas", "despesas com alertas");
    }
    if (s === "incidentes" && Array.isArray(estado.incidentes)) {
      const abertos = estado.incidentes.filter((x) => x.estado !== "Encerrado");
      const atrasos = abertos.reduce((n, x) => n + I.calcularPrazos(x).filter((p) => p.atraso && p.obrigatoria).length, 0);
      return plural(abertos.length, "incidente aberto", "incidentes abertos") + (atrasos ? " · " + plural(atrasos, "prazo em atraso", "prazos em atraso") : "");
    }
    if (s === "vulnerabilidades" && Array.isArray(estado.cves)) {
      const ab = estado.cves.filter(C.abertoCve);
      const expl = ab.filter((a) => a.explorada).length;
      return plural(ab.length, "vulnerabilidade aberta", "vulnerabilidades abertas") + (expl ? " · " + plural(expl, "explorada", "exploradas") : "");
    }
    if (s === "vigilancia" && Array.isArray(estado.alertas)) {
      return plural(estado.alertas.filter((a) => a.estado === "Novo" || a.estado === "Em análise").length, "alerta aberto", "alertas abertos");
    }
    return "";
  };
  const cartoes = seccoesPermitidas().map((s) => el("button", { class: "portal__cartao", type: "button", id: "cartao-" + s, onclick: () => abrirSeccao(s) },
    el("span", { class: "portal__titulo", texto: CARTOES[s][0] }),
    el("span", { class: "portal__texto", texto: CARTOES[s][1] }),
    resumoCartao(s) ? el("span", { class: "portal__estado", texto: resumoCartao(s) }) : null,
    el("span", { class: "portal__abrir", texto: "Abrir →" })));
  const externos = estado.ligacoes.map((x, i) => el("a", { class: "portal__cartao portal__cartao--externo", href: x.url, target: "_blank", rel: "noopener noreferrer", id: "ligacao-" + i },
    el("span", { class: "portal__titulo", texto: x.titulo || x.url }),
    x.descricao ? el("span", { class: "portal__texto", texto: x.descricao }) : null,
    el("span", { class: "portal__estado", texto: "Acesso controlado na própria secção" }),
    el("span", { class: "portal__abrir", texto: "Abrir noutro separador ↗" })));
  return [
    el("h2", { class: "painel__titulo", texto: "Secções" }),
    el("div", { class: "portal" }, cartoes),
    !eCliente() ? el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h2", { class: "painel__titulo", texto: "Outras secções" }),
      eAdmin() ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Gerir ligações", onclick: editarLigacoes }) : null) : null,
    !eCliente() ? (externos.length ? el("div", { class: "portal" }, externos)
      : el("p", { class: "vazio", texto: "Sem ligações a outras secções. O administrador pode acrescentá-las (por exemplo o CRM)." })) : null,
    el("p", { class: "nota", texto: "Cada secção tem as suas permissões. Ter acesso a esta página não dá acesso às secções de outros sites." }),
  ];
}

function editarLigacoes() {
  const linhas = [...estado.ligacoes, {}, {}].slice(0, 12).map((x, i) => el("fieldset", { class: "campo--largo grelha-form ligacao-edicao" },
    el("legend", { texto: "Ligação " + (i + 1) }),
    campo("Título", entrada("lg-t" + i, "text", x.titulo, { maxlength: 80 })),
    campo("Endereço (https://…)", entrada("lg-u" + i, "url", x.url, { maxlength: 300 })),
    campo("Descrição", entrada("lg-d" + i, "text", x.descricao, { maxlength: 160 }), { largo: true })));
  abrirDialogo({
    titulo: "Ligações para outras secções",
    corpo: el("div", { class: "grelha-form" },
      el("p", { class: "campo--largo nota", texto: "Só a equipa vê estas ligações. Não ponha aqui endereços de secções com dados sensíveis se a equipa toda não deve saber que existem. Para apagar uma ligação, apague o título e o endereço." }),
      linhas),
    gravar: async () => {
      const itens = [], erros = [];
      linhas.forEach((_, i) => {
        const titulo = texto($("lg-t" + i).value, 80), url = texto($("lg-u" + i).value, 300), descricao = texto($("lg-d" + i).value, 160);
        if (!titulo && !url) return;
        if (!titulo) { erros.push("Ligação " + (i + 1) + ": falta o título. Para apagar a ligação, apague também o endereço."); return; }
        if (!/^https:\/\/[^\s"'<>]+$/.test(url)) { erros.push("Ligação " + (i + 1) + ": indique um título e um endereço que comece por https://."); return; }
        itens.push({ titulo, url, descricao });
      });
      if (erros.length) return erros;
      const b = writeBatch(db);
      b.set(doc(db, "portal", "ligacoes"), { itens, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      await b.commit();
      aviso("Ligações gravadas.", "ok");
      return [];
    },
  });
}

/* ---------- Incidentes ----------
 * clientes/{cliente}/incidentes/{id}: um documento por incidente, com os dados usados nas minutas
 * e o registo de cada comunicação (notificacoes). A cronologia fica em .../eventos (só criação).
 * A equipa (admin, editor) regista e edita. O cliente regista incidentes e marca as comunicações que submeteu.
 */
const podeEditarIncidente = () => podeEditar();
const podeRegistarIncidente = () => podeEditar() || eCliente();

function subscreverIncidentes(id) {
  if (estado.subIncidentes) estado.subIncidentes();
  if (estado.subEventos) { estado.subEventos(); estado.subEventos = null; }
  pararProvas();
  estado.incidentes = null; estado.incidenteSel = ""; estado.eventos = null;
  estado.subIncidentes = onSnapshot(query(collection(db, "clientes", id, "incidentes"), orderBy("detetadoEm", "desc"), limit(200)), (s) => {
    estado.incidentes = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    desenhar();
  }, erroLeitura);
}

function pararProvas() {
  if (estado.subProvas) { estado.subProvas.forEach((f) => f()); estado.subProvas = null; }
  estado.provas = null; estado.ficheiros = null;
}

function selecionarIncidente(id) {
  if (estado.subEventos) { estado.subEventos(); estado.subEventos = null; }
  pararProvas();
  estado.incidenteSel = id; estado.eventos = null;
  if (id) {
    const base = ["clientes", estado.clienteSel, "incidentes", id];
    estado.subEventos = onSnapshot(query(collection(db, ...base, "eventos"), orderBy("em", "asc"), limit(500)), (s) => {
      estado.eventos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      desenhar();
    }, erroLeitura);
    estado.subProvas = [
      onSnapshot(query(collection(db, ...base, "provas"), orderBy("numero", "asc"), limit(99)), (s) => {
        estado.provas = s.docs.map((d) => ({ id: d.id, ...d.data() })); desenhar();
      }, erroLeitura),
      onSnapshot(query(collection(db, ...base, "ficheiros"), orderBy("registadoEm", "desc"), limit(300)), (s) => {
        estado.ficheiros = s.docs.map((d) => ({ id: d.id, ...d.data() })); desenhar();
      }, erroLeitura),
    ];
  }
  desenhar();
  window.scrollTo({ top: 0 });
}

const dhPt = (s) => { const d = I.lerData(s); return d ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(d) : "—"; };
// datetime-local (hora local do navegador) <-> ISO em UTC
const paraLocal = (s) => { const d = I.lerData(s); return d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""; };
const deLocal = (s) => (s ? new Date(s).toISOString() : "");
const classeEstadoInc = (e) => ({ Encerrado: "ok", Recuperado: "ok", Aberto: "perigo", "Por triar": "perigo", Contido: "alerta", Erradicado: "info" }[e] || "neutro");
const classeEstadoProva = (e) => ({ Validada: "ok", Recebida: "info", Pedida: "alerta", Recusada: "perigo" }[e] || "neutro");

function seletorClientes(id) {
  const ids = Object.keys(estado.clientes).sort();
  if (ids.length < 2) return null;
  const s = seletor(id, ids.map((x) => [x, estado.clientes[x].nome || x]), estado.clienteSel);
  s.addEventListener("change", () => selecionarCliente(s.value));
  return s;
}

function painelIncidentes() {
  const ids = Object.keys(estado.clientes);
  if (!ids.length) {
    return [el("div", { class: "vazio" }, el("p", { texto: eCliente()
      ? "A sua organização ainda não está configurada nesta área. Contacte a DCAB Consulting."
      : "Ainda não há clientes. Crie o primeiro cliente: serve a vigilância e os incidentes." }),
      eAdmin() ? el("button", { class: "botao botao--pequeno", type: "button", texto: "Criar cliente", onclick: () => gerirClientes("") }) : null), blocoPedidosTriar()];
  }
  if (estado.incidenteSel) {
    const inc = (estado.incidentes || []).find((x) => x.id === estado.incidenteSel);
    if (inc) return detalheIncidente(inc);
  }
  const c = estado.clientes[estado.clienteSel] || {};
  const lista = estado.incidentes || [];
  const abertos = lista.filter((x) => x.estado !== "Encerrado");
  const comPrazos = abertos.map((x) => ({ x, prazos: I.calcularPrazos(x) }));
  const atrasos = comPrazos.reduce((n, o) => n + o.prazos.filter((p) => p.atraso && p.obrigatoria).length, 0);
  const proximos = comPrazos.map((o) => ({ x: o.x, p: I.proximoPrazo(o.prazos) })).filter((o) => o.p).sort((a, b) => a.p.limite - b.p.limite);
  const linhas = lista.map((x) => {
    const p = I.proximoPrazo(I.calcularPrazos(x));
    return el("tr", { class: x.estado === "Encerrado" ? "linha--fechada" : null },
      td(x.referencia || "—"), el("td", {}, el("strong", { texto: x.titulo || "—" }), el("br"), el("span", { class: "nota", texto: x.tipo || "" })),
      td(dhPt(x.detetadoEm)), el("td", {}, etiqueta(x.estado || "Aberto", classeEstadoInc(x.estado))),
      td(x.significativo || "Em avaliação"),
      el("td", {}, p ? [el("span", { texto: p.destinatario + " · " + p.momento }), el("br"), el("span", { class: p.atraso ? "valor--erro" : "nota", texto: dhPt(p.limite.toISOString()) + " · " + I.formatarRestante(p.restante) })] : "—"),
      el("td", { class: "acoes" }, el("button", { class: "ligacao", type: "button", texto: "Abrir", onclick: () => selecionarIncidente(x.id) })));
  });
  return [
    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("h2", { class: "painel__titulo", texto: "Incidentes" + (c.nome ? " · " + c.nome : "") }),
      el("div", { class: "ferramentas" }, seletorClientes("inc-cliente"),
        eAdmin() ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Clientes", onclick: () => gerirClientes() }) : null,
        eAdmin() ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Avisos por email", onclick: editarConfigIncidentes }) : null,
        podeRegistarIncidente() ? el("button", { class: "botao botao--pequeno", type: "button", texto: "Registar incidente", onclick: () => editarIncidente(null) }) : null)),
    blocoPedidosTriar(),
    el("div", { class: "indicadores" },
      indicador("Incidentes abertos", String(abertos.length), plural(lista.length, "registado", "registados") + " no total", abertos.length ? "alerta" : "ok"),
      indicador("Prazos em atraso", String(atrasos), "Comunicações obrigatórias por enviar", atrasos ? "perigo" : "ok"),
      indicador("Próximo prazo", proximos.length ? dhPt(proximos[0].p.limite.toISOString()) : "—", proximos.length ? proximos[0].x.referencia + " · " + proximos[0].p.destinatario + " · " + I.formatarRestante(proximos[0].p.restante) : "Sem prazos a correr")),
    estado.incidentes === null ? el("p", { class: "vazio", texto: "A carregar os incidentes…" })
      : lista.length ? tabela(["Referência", "Incidente", "Detetado", "Estado", "Significativo", "Próximo prazo", ""], linhas)
        : el("div", { class: "vazio" }, el("p", { texto: "Sem incidentes registados." }),
            el("p", { texto: "Ao suspeitar de um incidente, registe-o logo com a hora da deteção. Os prazos de notificação começam a contar a partir da verificação de que é significativo (CNCS) ou do conhecimento da violação de dados (CNPD)." })),
    el("p", { class: "nota", texto: "A obrigação de notificar é da entidade. A DCAB prepara a avaliação e as minutas; o responsável de cibersegurança do cliente submete na plataforma do CNCS e, havendo dados pessoais, o responsável pelo tratamento notifica a CNPD." }),
  ];
}

function detalheIncidente(inc) {
  const prazos = I.calcularPrazos(inc);
  const dl = (pares) => el("dl", { class: "vig-detalhe" }, pares.flatMap(([k, val]) => [el("dt", { texto: k }), el("dd", { texto: val || "—" })]));
  const regimes = [inc.regimes && inc.regimes.nis2 ? "DL 125/2025 (NIS2)" : null, inc.regimes && inc.regimes.rgpd ? "RGPD" : null, inc.regimes && inc.regimes.dora ? "DORA" : null].filter(Boolean).join(" · ");
  const linhasPrazos = prazos.map((p) => el("tr", { class: p.estado !== "Por enviar" ? "linha--fechada" : null },
    el("td", {}, el("strong", { texto: p.destinatario }), el("br"), el("span", { texto: p.momento })),
    el("td", {}, p.limite ? [el("span", { class: p.atraso ? "valor--erro" : null, texto: dhPt(p.limite.toISOString()) }), el("br"), el("span", { class: "nota", texto: p.estado === "Por enviar" ? I.formatarRestante(p.restante) : "" })]
      : el("span", { class: "nota", texto: ({ "cncs-final": "Conta a partir do envio do fim do impacto", "cncs-inicial": "Indique a hora da verificação", "cncs-atualizacao": "Indique a hora da verificação",
          "cncs-fim": "Indique o fim do impacto", cnpd: "Indique o conhecimento da violação", queixa: "Indique a deteção", "registo-rgpd": "Registar sempre", administracao: "Logo que possível" })[p.chave] || "Sem demora injustificada" })),
    el("td", { class: "nota", texto: p.regra }),
    el("td", {}, etiqueta(p.estado + (p.estado === "Enviada" && p.enviadaEm ? " · " + dhPt(p.enviadaEm) : ""), p.estado === "Enviada" ? "ok" : p.estado === "Não aplicável" ? "neutro" : p.atraso ? "perigo" : "alerta"),
      p.referencia ? el("span", { class: "nota", texto: " Ref.: " + p.referencia }) : null),
    el("td", { class: "acoes" },
      I.MINUTAS[p.chave] ? el("button", { class: "ligacao", type: "button", texto: "Minuta", onclick: () => mostrarMinuta(inc, p.chave) }) : null,
      podeRegistarIncidente() ? el("button", { class: "ligacao", type: "button", texto: "Registar envio", onclick: () => registarEnvio(inc, p) }) : null)));
  const eventos = estado.eventos || [];
  return [
    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" },
      el("div", {}, el("button", { class: "ligacao", type: "button", texto: "← Todos os incidentes", onclick: () => selecionarIncidente("") }),
        el("h2", { class: "painel__titulo", texto: (inc.referencia || "") + " · " + (inc.titulo || "Incidente") })),
      el("div", { class: "ferramentas" },
        etiqueta(inc.estado || "Aberto", classeEstadoInc(inc.estado)),
        podeEditarIncidente() ? el("button", { class: "botao botao--pequeno", type: "button", texto: "Editar dados", onclick: () => editarIncidente(inc) }) : null,
        el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Descarregar registo", onclick: () => descarregar(inc.referencia + "-registo.txt", registoCompleto(inc, prazos)) }),
        eAdmin() ? el("button", { class: "botao botao--linha botao--pequeno botao--perigo", type: "button", texto: "Apagar", onclick: () => apagarIncidente(inc) }) : null)),
    el("div", { class: "grelha-detalhe" },
      el("div", {}, el("h3", { texto: "Incidente" }), dl([
        ["Tipo (Taxonomia RNCSIRT v3.3)", inc.tipo], ["Detetado", dhPt(inc.detetadoEm)], ["Verificado como significativo", inc.verificadoEm ? dhPt(inc.verificadoEm) : ""],
        ["Fim do impacto significativo", inc.fimImpactoEm ? dhPt(inc.fimImpactoEm) : ""], ["Significativo", inc.significativo], ["Fundamentação", inc.fundamentacao],
        ["Regimes", regimes], ["Qualificação da entidade", inc.qualificacao], ["Suspeita de ato ilícito", inc.suspeitaIlicito], ["Impacto noutros Estados-Membros", inc.transfronteirico]])),
      el("div", {}, el("h3", { texto: "Dados pessoais e contactos" }), dl([
        ["Dados pessoais afetados", inc.dados && inc.dados.pessoais], ["Conhecimento da violação", inc.dados && inc.dados.conhecimentoEm ? dhPt(inc.dados.conhecimentoEm) : ""],
        ["Risco para os titulares", inc.dados && inc.dados.risco], ["Categorias de dados", inc.dados && inc.dados.categorias], ["Titulares", inc.dados && inc.dados.titulares],
        ["Entidade", (inc.entidadeNome || "") + (inc.nipc ? " · NIPC " + inc.nipc : "")],
        ["Responsável de cibersegurança", inc.contactos && inc.contactos.responsavel], ["Ponto de contacto permanente", inc.contactos && inc.contactos.pontoContacto],
        ["Encarregado da proteção de dados", inc.contactos && inc.contactos.epd]]))),
    blocoAcompanhamento(inc),
    el("h3", { texto: "Comunicações e prazos (hora de Lisboa)" }),
    prazos.length ? tabela(["Destinatário", "Prazo", "Regra", "Estado", ""], linhasPrazos) : el("p", { class: "vazio", texto: "Ainda não há comunicações obrigatórias. Assinale os regimes aplicáveis e a avaliação de significância em «Editar dados»." }),
    blocoProvas(inc),
    el("h3", { texto: "Descrição, impacto e medidas" }),
    dl([["Descrição", inc.descricao], ["Serviços afetados", inc.servicosAfetados], ["Impacto", inc.impacto], ["Medidas", inc.medidas], ["Causa provável", inc.causa], ["Indicadores de comprometimento", inc.iocs]]),
    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" }, el("h3", { texto: "Cronologia" }),
      podeRegistarIncidente() ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Acrescentar registo", onclick: () => acrescentarEvento(inc) }) : null),
    estado.eventos === null ? el("p", { class: "vazio", texto: "A carregar…" })
      : eventos.length ? el("ol", { class: "cronologia" }, eventos.map((e) => el("li", {},
          el("span", { class: "cronologia__quando", texto: e.em && e.em.toDate ? dhPt(e.em.toDate().toISOString()) : "—" }),
          el("span", { texto: e.texto }), el("span", { class: "nota", texto: " · " + (e.por || "") }))))
        : el("p", { class: "vazio", texto: "Sem registos. Registe cada decisão, medida e contacto com data e hora: é a prova do que se fez e quando." }),
  ];
}

function descarregar(nome, conteudo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/plain;charset=utf-8" }));
  const a = el("a", { href: url, download: nome.replace(/[^\w.-]+/g, "_") });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dadosCliente(inc) {
  const c = estado.clientes[estado.clienteSel] || {};
  return { nome: inc.entidadeNome || c.nome || "", nipc: inc.nipc || "" };
}

function mostrarMinuta(inc, chave) {
  const m = I.MINUTAS[chave];
  const conteudo = m.texto(inc, dadosCliente(inc));
  const area = el("textarea", { id: "minuta-texto", class: "minuta", rows: "18", readonly: true });
  area.value = conteudo;
  abrirDialogo({
    titulo: m.titulo,
    rotulo: "Fechar",
    corpo: el("div", { class: "grelha-form" },
      el("p", { class: "campo--largo nota", texto: "Reveja e complete os campos entre parênteses retos antes de submeter. Esta minuta segue a lei; quando a plataforma da autoridade pedir outros campos, prevalece o formulário dela." }),
      el("div", { class: "campo--largo" }, area),
      el("div", { class: "campo--largo acoes" },
        el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Copiar texto",
          onclick: async (ev) => { try { await navigator.clipboard.writeText(conteudo); ev.target.textContent = "Texto copiado"; } catch (_) { area.select(); } } }),
        el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Descarregar .txt", onclick: () => descarregar((inc.referencia || "incidente") + "-" + chave + ".txt", conteudo) }))),
    gravar: async () => [],
  });
}

function registoCompleto(inc, prazos) {
  const cli = dadosCliente(inc);
  const linhas = [I.MINUTAS.administracao.texto(inc, cli), "", "COMUNICAÇÕES", ""];
  for (const p of prazos) linhas.push("- " + p.destinatario + " · " + p.momento + " · prazo: " + (p.limite ? dhPt(p.limite.toISOString()) : "sem demora injustificada") + " · " + p.estado + (p.enviadaEm ? " em " + dhPt(p.enviadaEm) : "") + (p.referencia ? " · ref. " + p.referencia : ""));
  linhas.push("", "CRONOLOGIA", "");
  for (const e of estado.eventos || []) linhas.push("- " + (e.em && e.em.toDate ? dhPt(e.em.toDate().toISOString()) : "") + " · " + e.texto + " · " + (e.por || ""));
  linhas.push("", "Gerado na área reservada da DCAB Consulting em " + dhPt(new Date().toISOString()) + ".");
  return linhas.join("\n");
}

function registarEnvio(inc, p) {
  const n = (inc.notificacoes && inc.notificacoes[p.chave]) || {};
  const sEstado = seletor("env-estado", I.ESTADOS_NOTIFICACAO, n.estado || "Enviada");
  const quando = entrada("env-quando", "datetime-local", paraLocal(n.enviadaEm) || paraLocal(new Date().toISOString()));
  const ref = entrada("env-ref", "text", n.referencia, { maxlength: 80 });
  abrirDialogo({
    titulo: p.destinatario + " · " + p.momento,
    corpo: el("div", { class: "grelha-form" },
      campo("Estado", sEstado), campo("Data e hora do envio", quando),
      campo("Referência ou comprovativo", ref, { largo: true, ajuda: "Número atribuído pela plataforma, referência do email ou do registo. Guarde o comprovativo fora desta área." })),
    gravar: async () => {
      if (sEstado.value === "Enviada" && !quando.value) return ["Indique a data e a hora do envio."];
      const ref_ = doc(db, "clientes", estado.clienteSel, "incidentes", inc.id);
      const b = writeBatch(db);
      const valor = { estado: sEstado.value, enviadaEm: sEstado.value === "Enviada" ? deLocal(quando.value) : "", referencia: texto(ref.value, 80), por: emailAtual() };
      b.update(ref_, { ["notificacoes." + p.chave]: valor, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      b.set(doc(collection(ref_, "eventos")), { texto: texto(p.destinatario + " · " + p.momento + ": " + valor.estado + (valor.referencia ? " (ref. " + valor.referencia + ")" : ""), 1000), por: emailAtual(), em: serverTimestamp() });
      await b.commit();
      aviso("Comunicação registada.", "ok");
      return [];
    },
  });
}

function acrescentarEvento(inc) {
  const t = el("textarea", { id: "ev-texto", rows: "4", maxlength: "1000" });
  abrirDialogo({
    titulo: "Acrescentar à cronologia",
    corpo: el("div", { class: "grelha-form" }, campo("O que aconteceu ou foi decidido", t, { largo: true, ajuda: "A hora do registo é a do servidor. Não escreva palavras-passe nem dados pessoais desnecessários." })),
    gravar: async () => {
      if (!t.value.trim()) return ["Escreva o registo."];
      const b = writeBatch(db);
      b.set(doc(collection(db, "clientes", estado.clienteSel, "incidentes", inc.id, "eventos")), { texto: texto(t.value, 1000), por: emailAtual(), em: serverTimestamp() });
      await b.commit();
      return [];
    },
  });
}

function apagarIncidente(inc) {
  abrirDialogo({
    titulo: "Apagar " + (inc.referencia || "incidente") + "?",
    corpo: el("p", { texto: "O registo e as comunicações deixam de aparecer. A cronologia já registada mantém-se no servidor. Use só para registos criados por engano: o RGPD (art. 33.º, n.º 5) exige documentar todas as violações de dados." }),
    rotulo: "Apagar", perigo: true,
    gravar: async () => {
      const b = writeBatch(db);
      b.delete(doc(db, "clientes", estado.clienteSel, "incidentes", inc.id));
      await b.commit();
      selecionarIncidente("");
      aviso("Incidente apagado.", "ok");
      return [];
    },
  });
}

function editarIncidente(inc) {
  const novo = !inc;
  const x = inc || { estado: "Aberto", significativo: "Em avaliação", suspeitaIlicito: "Em avaliação", transfronteirico: "Em avaliação", qualificacao: "Por confirmar",
    regimes: { nis2: true, rgpd: false, dora: false }, dados: { pessoais: "Em avaliação", risco: "Por avaliar" }, contactos: {},
    entidadeNome: (estado.clientes[estado.clienteSel] || {}).nome || "", detetadoEm: new Date().toISOString() };
  const d = x.dados || {}, k = x.contactos || {}, rg = x.regimes || {};
  const f = {
    titulo: entrada("i-titulo", "text", x.titulo, { maxlength: 150 }),
    tipo: seletor("i-tipo", I.TIPOS, x.tipo, "Escolher"),
    estado: seletor("i-estado", I.ESTADOS, x.estado),
    detetadoEm: entrada("i-detetado", "datetime-local", paraLocal(x.detetadoEm)),
    descricao: el("textarea", { id: "i-descricao", rows: "3", maxlength: "3000" }),
    nis2: el("input", { type: "checkbox", id: "i-nis2", checked: !!rg.nis2 }),
    rgpd: el("input", { type: "checkbox", id: "i-rgpd", checked: !!rg.rgpd }),
    dora: el("input", { type: "checkbox", id: "i-dora", checked: !!rg.dora }),
    qualificacao: seletor("i-qualif", I.QUALIFICACOES, x.qualificacao),
    significativo: seletor("i-signif", I.SIM_NAO, x.significativo),
    verificadoEm: entrada("i-verificado", "datetime-local", paraLocal(x.verificadoEm)),
    fundamentacao: el("textarea", { id: "i-fund", rows: "2", maxlength: "2000" }),
    fimImpactoEm: entrada("i-fim", "datetime-local", paraLocal(x.fimImpactoEm)),
    suspeitaIlicito: seletor("i-ilicito", I.SIM_NAO, x.suspeitaIlicito),
    transfronteirico: seletor("i-trans", I.SIM_NAO, x.transfronteirico),
    servicosAfetados: el("textarea", { id: "i-servicos", rows: "2", maxlength: "1000" }),
    impacto: el("textarea", { id: "i-impacto", rows: "2", maxlength: "2000" }),
    medidas: el("textarea", { id: "i-medidas", rows: "3", maxlength: "3000" }),
    causa: el("textarea", { id: "i-causa", rows: "2", maxlength: "2000" }),
    iocs: el("textarea", { id: "i-iocs", rows: "2", maxlength: "2000" }),
    pessoais: seletor("i-pessoais", I.SIM_NAO, d.pessoais || "Em avaliação"),
    conhecimentoEm: entrada("i-conhecimento", "datetime-local", paraLocal(d.conhecimentoEm)),
    risco: seletor("i-risco", I.RISCOS, d.risco || "Por avaliar"),
    categorias: entrada("i-categorias", "text", d.categorias, { maxlength: 500 }),
    titulares: entrada("i-titulares", "text", d.titulares, { maxlength: 200 }),
    entidadeNome: entrada("i-entidade", "text", x.entidadeNome, { maxlength: 150 }),
    nipc: entrada("i-nipc", "text", x.nipc, { maxlength: 9, inputmode: "numeric" }),
    responsavel: entrada("i-resp", "text", k.responsavel, { maxlength: 200 }),
    pontoContacto: entrada("i-pc", "text", k.pontoContacto, { maxlength: 200 }),
    epd: entrada("i-epd", "text", k.epd, { maxlength: 200 }),
    responsavelDcab: entrada("i-respdcab", "email", novo ? estado.configInc.responsavelPadrao || "" : x.responsavelDcab, { maxlength: 160 }),
    contactosEmail: entrada("i-contactos", "text", (x.contactosEmail || []).join(", "), { maxlength: 1700 }),
  };
  for (const c of ["descricao", "fundamentacao", "servicosAfetados", "impacto", "medidas", "causa", "iocs"]) f[c].value = x[c] || "";
  const caixa = (input, rotulo) => el("label", { class: "filtro-caixa" }, input, " " + rotulo);
  abrirDialogo({
    titulo: novo ? "Registar incidente" : "Editar " + (x.referencia || "incidente"),
    corpo: el("div", { class: "grelha-form" },
      campo("Título curto", f.titulo, { largo: true }), campo("Tipo (Taxonomia RNCSIRT v3.3)", f.tipo), campo("Estado", f.estado),
      campo("Detetado em", f.detetadoEm, { ajuda: "Hora deste computador. As datas são mostradas em hora de Lisboa." }), campo("Descrição: o que aconteceu e como foi detetado", f.descricao, { largo: true }),
      el("fieldset", { class: "campo--largo" }, el("legend", { texto: "Regimes aplicáveis" }), caixa(f.nis2, "DL 125/2025 (NIS2)"), caixa(f.rgpd, "RGPD (dados pessoais)"), caixa(f.dora, "DORA (setor financeiro)")),
      campo("Qualificação da entidade", f.qualificacao), campo("Incidente significativo?", f.significativo),
      campo("Verificado como significativo em", f.verificadoEm, { ajuda: "Os prazos de 24 e 72 horas ao CNCS contam a partir daqui." }),
      campo("Fim do impacto significativo", f.fimImpactoEm),
      campo("Fundamentação da avaliação", f.fundamentacao, { largo: true, ajuda: "Porque é ou não significativo: perturbação grave do serviço, perdas financeiras, danos a terceiros." }),
      campo("Suspeita de ato ilícito ou malicioso", f.suspeitaIlicito), campo("Impacto noutros Estados-Membros", f.transfronteirico),
      campo("Serviços afetados", f.servicosAfetados, { largo: true }), campo("Impacto (gravidade, duração, utilizadores)", f.impacto, { largo: true }),
      campo("Medidas tomadas", f.medidas, { largo: true }), campo("Causa provável", f.causa, { largo: true }),
      campo("Indicadores de comprometimento", f.iocs, { largo: true, ajuda: "Hashes, domínios, endereços IP de origem do ataque. Não escreva palavras-passe." }),
      campo("Dados pessoais afetados?", f.pessoais), campo("Conhecimento da violação em", f.conhecimentoEm, { ajuda: "As 72 horas para a CNPD contam a partir daqui." }),
      campo("Risco para os titulares", f.risco), campo("Titulares (categorias e número aproximado)", f.titulares),
      campo("Categorias de dados e registos", f.categorias, { largo: true }),
      campo("Entidade (denominação)", f.entidadeNome), campo("NIPC", f.nipc),
      campo("Responsável de cibersegurança", f.responsavel, { largo: true, ajuda: "Nome, email e telefone." }),
      campo("Ponto de contacto permanente", f.pontoContacto, { largo: true }), campo("Encarregado da proteção de dados", f.epd, { largo: true }),
      eCliente() ? null : el("h3", { class: "campo--largo", texto: "Avisos por email e Google Drive" }),
      eCliente() ? null : campo("Responsável na DCAB", f.responsavelDcab, { ajuda: "Recebe os avisos de prazos e de provas." }),
      eCliente() ? null : campo("Emails do cliente que recebem os avisos", f.contactosEmail, { largo: true,
        ajuda: "Separados por vírgulas, até 10. Também recebem acesso à pasta «Entregas do cliente» no Google Drive. As pessoas do cliente com acesso aos incidentes já estão incluídas." })),
    gravar: async () => {
      const erros = [];
      const dados = {
        titulo: texto(f.titulo.value, 150), tipo: f.tipo.value, estado: f.estado.value, detetadoEm: deLocal(f.detetadoEm.value), descricao: texto(f.descricao.value, 3000),
        regimes: { nis2: f.nis2.checked, rgpd: f.rgpd.checked, dora: f.dora.checked }, qualificacao: f.qualificacao.value, significativo: f.significativo.value,
        verificadoEm: deLocal(f.verificadoEm.value), fundamentacao: texto(f.fundamentacao.value, 2000), fimImpactoEm: deLocal(f.fimImpactoEm.value),
        suspeitaIlicito: f.suspeitaIlicito.value, transfronteirico: f.transfronteirico.value, servicosAfetados: texto(f.servicosAfetados.value, 1000),
        impacto: texto(f.impacto.value, 2000), medidas: texto(f.medidas.value, 3000), causa: texto(f.causa.value, 2000), iocs: texto(f.iocs.value, 2000),
        dados: { pessoais: f.pessoais.value, conhecimentoEm: deLocal(f.conhecimentoEm.value), risco: f.risco.value, categorias: texto(f.categorias.value, 500), titulares: texto(f.titulares.value, 200) },
        entidadeNome: texto(f.entidadeNome.value, 150), nipc: texto(f.nipc.value, 9),
        contactos: { responsavel: texto(f.responsavel.value, 200), pontoContacto: texto(f.pontoContacto.value, 200), epd: texto(f.epd.value, 200) },
      };
      if (!dados.titulo) erros.push("Indique um título.");
      if (!I.TIPOS.includes(dados.tipo)) erros.push("Escolha o tipo de incidente.");
      if (!dados.detetadoEm) erros.push("Indique a data e a hora da deteção.");
      if (dados.significativo === "Sim" && !dados.verificadoEm) erros.push("Indique quando se verificou que o incidente é significativo: é daí que contam os prazos do CNCS.");
      if (dados.dados.pessoais === "Sim" && !dados.dados.conhecimentoEm) erros.push("Indique quando teve conhecimento da violação de dados: é daí que contam as 72 horas da CNPD.");
      if (dados.verificadoEm && dados.detetadoEm && dados.verificadoEm < dados.detetadoEm) erros.push("A verificação não pode ser anterior à deteção.");
      if (dados.fimImpactoEm && dados.detetadoEm && dados.fimImpactoEm < dados.detetadoEm) erros.push("O fim do impacto não pode ser anterior à deteção.");
      if (dados.nipc && !/^\d{9}$/.test(dados.nipc)) erros.push("O NIPC tem 9 dígitos.");
      const contactos = eCliente() ? [] : [...new Set(f.contactosEmail.value.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
      if (contactos.some((e) => !EMAIL_OK.test(e))) erros.push("Há um email de contacto inválido: " + contactos.find((e) => !EMAIL_OK.test(e)));
      if (contactos.length > 10) erros.push("Indique no máximo 10 emails de contacto.");
      if (!eCliente()) {
        dados.contactosEmail = contactos.slice(0, 10);
        dados.responsavelDcab = texto(f.responsavelDcab.value, 160).toLowerCase();
        if (dados.responsavelDcab && !EMAIL_OK.test(dados.responsavelDcab)) erros.push("O email do responsável na DCAB é inválido.");
      }
      if (dados.dados.pessoais === "Sim") dados.regimes.rgpd = true;
      if (erros.length) return erros;
      const b = writeBatch(db);
      const col = collection(db, "clientes", estado.clienteSel, "incidentes");
      if (novo) {
        // A referência é o identificador do documento: duas criações em simultâneo com a mesma referência
        // falham na segunda (as regras não deixam substituir um incidente existente)
        dados.referencia = I.gerarReferencia(new Date().getFullYear(), (estado.incidentes || []).map((y) => y.referencia));
        const ref = doc(col, dados.referencia);
        b.set(ref, { ...dados, origem: "manual", notificacoes: {}, criadoEm: serverTimestamp(), criadoPor: emailAtual(), atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
        b.set(doc(collection(ref, "eventos")), { texto: "Incidente registado: " + dados.titulo, por: emailAtual(), em: serverTimestamp() });
        await b.commit();
        selecionarIncidente(ref.id);
      } else {
        const ref = doc(col, inc.id);
        b.update(ref, { ...dados, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
        const mud = ["estado", "significativo", "verificadoEm", "fimImpactoEm", "responsavelDcab"].filter((c) => (dados[c] ?? "") !== (inc[c] ?? ""));
        if (mud.length) b.set(doc(collection(ref, "eventos")), { texto: texto("Alterado: " + mud.map((c) => c + " → " + (c.endsWith("Em") ? dhPt(dados[c]) : dados[c] || "—")).join("; "), 1000), por: emailAtual(), em: serverTimestamp() });
        await b.commit();
      }
      aviso(novo ? "Incidente registado." : "Incidente atualizado.", "ok");
      return [];
    },
  });
}


/* ---------- Incidentes: acompanhamento automático (versão 1.3) ----------
 * Pedidos por triar (formulário do site sem cliente identificado), provas pedidas ao cliente,
 * ficheiros entregues no Google Drive (registados pelo servidor), fichas de cliente e avisos por email.
 */
// Igual ao das regras e das funções: sem vírgulas, ponto e vírgula, barras ou espaços
const EMAIL_OK = /^[a-z0-9._%+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
const DOMINIOS_GRATUITOS = ["gmail.com", "googlemail.com", "outlook.com", "outlook.pt", "hotmail.com", "hotmail.pt", "live.com", "live.com.pt",
  "msn.com", "yahoo.com", "yahoo.com.br", "icloud.com", "me.com", "sapo.pt", "netcabo.pt", "clix.pt", "iol.pt", "mail.pt", "proton.me", "protonmail.com", "gmx.com", "aol.com"];
const listaEmails = (v) => [...new Set(String(v || "").split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];

function iniciarIncidentesEquipa() {
  if (estado.subEquipaInc) return;
  estado.subEquipaInc = [
    onSnapshot(query(collection(db, "pedidosIncidente"), where("estado", "==", "Por triar"), limit(50)), (s) => {
      estado.pedidosTriar = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.recebidoEm).localeCompare(String(a.recebidoEm)));
      desenhar();
    }, () => { estado.pedidosTriar = []; }),
    onSnapshot(doc(db, "config", "incidentes"), (d) => { estado.configInc = d.exists() ? d.data() : {}; }, () => { estado.configInc = {}; }),
  ];
}

function blocoPedidosTriar() {
  if (eCliente() || !estado.pedidosTriar.length) return null;
  const linhas = estado.pedidosTriar.map((p) => el("tr", {},
    td(dhPt(p.recebidoEm)),
    el("td", {}, el("strong", { texto: p.empresa || "—" }), el("br"), el("span", { class: "nota", texto: [p.nome, p.email, p.telefone].filter(Boolean).join(" · ") }),
      p.motivo ? [el("br"), el("span", { class: "nota", texto: "Motivo: " + p.motivo })] : null),
    el("td", { class: "nota", texto: String(p.mensagem || "").slice(0, 240) + (String(p.mensagem || "").length > 240 ? "…" : "") }),
    el("td", { class: "acoes" }, podeEditar() ? [
      el("button", { class: "ligacao", type: "button", texto: "Converter", onclick: () => converterPedido(p) }),
      el("button", { class: "ligacao", type: "button", texto: "Descartar", onclick: () => descartarPedido(p) })] : null)));
  return el("section", { class: "bloco-triagem" },
    el("h3", { texto: "Pedidos de apoio por triar (" + estado.pedidosTriar.length + ")" }),
    el("p", { class: "nota", texto: "Chegaram pelo formulário do site e não abriram incidente automaticamente (remetente não reconhecido ou limite de pedidos por hora). O endereço de email do formulário não é verificado: confirme por telefone quem pede antes de converter." }),
    tabela(["Recebido", "Quem pede", "Mensagem", ""], linhas));
}

function converterPedido(p) {
  const ids = Object.keys(estado.clientes).sort();
  if (!ids.length) return aviso("Crie primeiro o cliente (botão «Clientes»).", "erro");
  const sCli = seletor("cv-cliente", ids.map((x) => [x, estado.clientes[x].nome || x]), estado.clienteSel || ids[0]);
  const titulo = entrada("cv-titulo", "text", "Pedido de apoio: " + (p.empresa || ""), { maxlength: 150 });
  const provas = el("input", { type: "checkbox", id: "cv-provas", checked: true });
  abrirDialogo({
    titulo: "Converter em incidente",
    corpo: el("div", { class: "grelha-form" },
      el("p", { class: "campo--largo nota", texto: "O incidente fica «Por triar», com " + p.email + " como contacto. A pasta no Google Drive e os emails ao cliente seguem na próxima execução da tarefa automática (até 15 minutos)." }),
      campo("Cliente", sCli), campo("Título", titulo, { largo: true }),
      el("label", { class: "filtro-caixa campo--largo" }, provas, " Pedir as três provas iniciais (registos, prova do incidente, sistemas afetados), com prazo de 24 horas")),
    gravar: async () => {
      if (!texto(titulo.value, 150)) return ["Indique um título."];
      const cliente = sCli.value;
      const b = writeBatch(db);
      const col = collection(db, "clientes", cliente, "incidentes");
      const existentes = cliente === estado.clienteSel ? (estado.incidentes || []).map((y) => y.referencia)
        : (await getDocs(query(col, limit(1000)))).docs.map((d) => d.get("referencia"));
      const referencia = I.gerarReferencia(new Date().getFullYear(), existentes);
      const ref = doc(col, referencia);
      b.set(ref, {
        referencia, titulo: texto(titulo.value, 150), tipo: "Outro", estado: "Por triar", detetadoEm: p.recebidoEm || new Date().toISOString(),
        descricao: texto(p.mensagem, 3000), regimes: { nis2: true, rgpd: false, dora: false }, qualificacao: "Por confirmar", significativo: "Em avaliação",
        verificadoEm: "", fundamentacao: "", fimImpactoEm: "", suspeitaIlicito: "Em avaliação", transfronteirico: "Em avaliação", servicosAfetados: "",
        impacto: "", medidas: "", causa: "", iocs: "", dados: { pessoais: "Em avaliação", conhecimentoEm: "", risco: "Por avaliar", categorias: "", titulares: "" },
        entidadeNome: (estado.clientes[cliente] || {}).nome || p.empresa || "", nipc: (estado.clientes[cliente] || {}).nipc || "",
        contactos: { responsavel: "", pontoContacto: texto([p.nome, p.email, p.telefone].filter(Boolean).join(" · "), 200), epd: "" }, notificacoes: {},
        origem: "formulario", responsavelDcab: estado.configInc.responsavelPadrao || emailAtual(), contactosEmail: [p.email].filter((e) => EMAIL_OK.test(e || "")),
        criadoEm: serverTimestamp(), criadoPor: emailAtual(), atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual(),
      });
      if (provas.checked && EMAIL_OK.test(p.email || "")) {
        const prazo = new Date(Date.now() + 24 * 3600000).toISOString();
        ["Registos (logs) dos sistemas e da firewall desde 48 horas antes da deteção",
          "Mensagem, ficheiro ou ecrã que revelou o incidente (por exemplo a nota de resgate)",
          "Lista dos sistemas, contas e serviços afetados"].forEach((descricao, i) => b.set(doc(collection(ref, "provas"), "P0" + (i + 1)), {
          numero: "P0" + (i + 1), descricao, responsavelEmail: p.email, prazo, estado: "Pedida", notas: "",
          criadoEm: serverTimestamp(), criadoPor: emailAtual(), atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() }));
      }
      b.set(doc(collection(ref, "eventos")), { texto: texto("Pedido de apoio de " + p.nome + " (" + p.email + "), recebido pelo formulário do site, associado a este cliente.", 1000), por: emailAtual(), em: serverTimestamp() });
      b.update(doc(db, "pedidosIncidente", p.id), { estado: "Convertido", cliente, incidente: referencia, tratadoPor: emailAtual(), tratadoEm: serverTimestamp() });
      await b.commit();
      if (cliente !== estado.clienteSel) selecionarCliente(cliente);
      selecionarIncidente(referencia);
      aviso("Incidente " + referencia + " aberto.", "ok");
      return [];
    },
  });
}

function descartarPedido(p) {
  abrirDialogo({
    titulo: "Descartar o pedido de " + (p.empresa || p.email) + "?",
    corpo: el("p", { texto: "Use para pedidos que não são incidentes (por exemplo publicidade). O pedido fica guardado como «Descartado» e é apagado automaticamente ao fim de 12 meses." }),
    rotulo: "Descartar", perigo: true,
    gravar: async () => {
      const b = writeBatch(db);
      b.update(doc(db, "pedidosIncidente", p.id), { estado: "Descartado", tratadoPor: emailAtual(), tratadoEm: serverTimestamp() });
      await b.commit();
      return [];
    },
  });
}

function blocoAcompanhamento(inc) {
  const ligacao = (url, t) => (url && /^https:\/\/(drive|docs)\.google\.com\//.test(url) ? el("a", { href: url, target: "_blank", rel: "noopener noreferrer", texto: t }) : null);
  const pares = [
    ["Origem", I.ORIGENS[inc.origem] || "Registado na área reservada"],
    !eCliente() ? ["Responsável na DCAB", inc.responsavelDcab || "—"] : null,
    ["Recebem os avisos por email", (inc.contactosEmail || []).join(", ") || "Só as pessoas do cliente com acesso aos incidentes"],
  ].filter(Boolean);
  const pasta = !eCliente() ? ligacao(inc.pastaUrl, "Pasta do incidente (só DCAB)") : null;
  const entregas = ligacao(inc.provasPastaUrl, "Pasta «Entregas do cliente»");
  return el("div", { class: "bloco-acompanhamento" },
    el("h3", { texto: "Acompanhamento" }),
    el("dl", { class: "vig-detalhe" }, pares.flatMap(([k, v]) => [el("dt", { texto: k }), el("dd", { texto: v })])),
    el("p", {}, pasta, pasta && entregas ? " · " : null, entregas,
      !inc.pastaId ? el("span", { class: "nota", texto: "A pasta no Google Drive é criada pela tarefa automática nos 15 minutos seguintes." }) : null));
}

function blocoProvas(inc) {
  const provas = estado.provas || [];
  const ficheiros = estado.ficheiros || [];
  const ligacao = (url, t) => (url && /^https:\/\/(drive|docs)\.google\.com\//.test(url) ? el("a", { href: url, target: "_blank", rel: "noopener noreferrer", texto: t }) : null);
  const porPasta = (p) => ficheiros.filter((f) => p.pastaId && f.pastaId === p.pastaId).length;
  const linhas = provas.map((p) => {
    const prazo = I.lerData(p.prazo);
    const atraso = p.estado === "Pedida" && prazo && prazo < new Date();
    return el("tr", { class: ["Validada", "Anulada"].includes(p.estado) ? "linha--fechada" : null },
      td(p.numero),
      el("td", {}, el("span", { texto: p.descricao }), p.notas ? [el("br"), el("span", { class: "nota", texto: p.notas })] : null),
      td(p.responsavelEmail),
      el("td", { class: atraso ? "valor--erro" : null, texto: dhPt(p.prazo) }),
      el("td", {}, etiqueta(p.estado + (atraso ? " · em atraso" : ""), atraso ? "perigo" : classeEstadoProva(p.estado))),
      el("td", {}, ligacao(p.pastaUrl, "Pasta") || el("span", { class: "nota", texto: "—" }), porPasta(p) ? el("span", { class: "nota", texto: " · " + plural(porPasta(p), "ficheiro", "ficheiros") }) : null),
      el("td", { class: "acoes" }, podeEditarIncidente() ? [
        p.estado === "Recebida" ? el("button", { class: "ligacao", type: "button", texto: "Validar", onclick: () => mudarEstadoProva(inc, p, "Validada") }) : null,
        el("button", { class: "ligacao", type: "button", texto: "Editar", onclick: () => editarProva(inc, p) })] : null));
  });
  const linhasF = ficheiros.map((f) => {
    const prova = provas.find((p) => p.pastaId && p.pastaId === f.pastaId);
    return el("tr", {},
      td(dhPt(f.registadoEm)),
      el("td", {}, ligacao(f.url, f.nome) || el("span", { texto: f.nome })),
      td(prova ? prova.numero : "—"),
      el("td", { class: "num", texto: f.tamanho >= 1048576 ? (f.tamanho / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(f.tamanho / 1024)) + " KB" }),
      el("td", { class: "nota mono", texto: f.sha256 || "por calcular" }));
  });
  return [
    el("div", { class: "barra-ferramentas barra-ferramentas--titulo" }, el("h3", { texto: "Provas pedidas" }),
      podeEditarIncidente() ? el("button", { class: "botao botao--linha botao--pequeno", type: "button", texto: "Pedir prova", onclick: () => editarProva(inc, null) }) : null),
    estado.provas === null ? el("p", { class: "vazio", texto: "A carregar…" })
      : provas.length ? tabela(["N.º", "Prova", "Responsável", "Prazo", "Estado", "Google Drive", ""], linhas)
        : el("p", { class: "vazio", texto: eCliente() ? "A DCAB ainda não pediu provas para este incidente." : "Sem provas pedidas. Cada prova pedida cria uma subpasta no Google Drive e lembretes diários por email até ser entregue." }),
    ...(ficheiros.length ? [el("h3", { texto: "Ficheiros recebidos" }),
      el("p", { class: "nota", texto: "Registados automaticamente a partir da pasta «Entregas do cliente». A DCAB guarda uma cópia de cada ficheiro numa pasta só sua; o SHA-256 permite provar que o ficheiro não foi alterado." }),
      tabela(["Registado", "Ficheiro", "Prova", { t: "Tamanho", num: true }, "SHA-256"], linhasF)] : []),
  ];
}

async function mudarEstadoProva(inc, p, novoEstado) {
  try {
    const b = writeBatch(db);
    const ref = doc(db, "clientes", estado.clienteSel, "incidentes", inc.id);
    b.update(doc(ref, "provas", p.id), { estado: novoEstado, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
    b.set(doc(collection(ref, "eventos")), { texto: "Prova " + p.numero + ": " + novoEstado.toLowerCase(), por: emailAtual(), em: serverTimestamp() });
    await b.commit();
  } catch (e) { aviso(mensagemErro(e), "erro"); }
}

function editarProva(inc, p) {
  const nova = !p;
  const usados = (estado.provas || []).map((x) => Number(String(x.numero).slice(1)) || 0);
  const numero = nova ? "P" + String(Math.max(0, ...usados) + 1).padStart(2, "0") : p.numero;
  const sugestao = (inc.contactosEmail || [])[0] || "";
  const f = {
    descricao: entrada("pv-desc", "text", p ? p.descricao : "", { maxlength: 300 }),
    responsavel: entrada("pv-resp", "email", p ? p.responsavelEmail : sugestao, { maxlength: 160 }),
    prazo: entrada("pv-prazo", "datetime-local", paraLocal(p ? p.prazo : new Date(Date.now() + 24 * 3600000).toISOString())),
    estado: seletor("pv-estado", I.ESTADOS_PROVA, p ? p.estado : "Pedida"),
    notas: el("textarea", { id: "pv-notas", rows: "3", maxlength: "1000" }),
  };
  f.notas.value = p ? p.notas || "" : "";
  abrirDialogo({
    titulo: (nova ? "Pedir prova " : "Prova ") + numero,
    corpo: el("div", { class: "grelha-form" },
      campo("O que é preciso", f.descricao, { largo: true, ajuda: "Por exemplo: registos do servidor de email de 12 a 14 de outubro, em formato original." }),
      campo("Quem entrega (email)", f.responsavel, { ajuda: "Recebe o pedido e os lembretes diários; fica com acesso à pasta de entregas." }),
      campo("Prazo", f.prazo), nova ? null : campo("Estado", f.estado),
      campo("Notas", f.notas, { largo: true, ajuda: "Motivo da recusa, formato pedido, cadeia de custódia. Não escreva palavras-passe." })),
    gravar: async () => {
      const erros = [];
      const dados = { descricao: texto(f.descricao.value, 300), responsavelEmail: texto(f.responsavel.value, 160).toLowerCase(), prazo: deLocal(f.prazo.value),
        estado: nova ? "Pedida" : f.estado.value, notas: texto(f.notas.value, 1000), atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() };
      if (!dados.descricao) erros.push("Descreva a prova pedida.");
      if (!EMAIL_OK.test(dados.responsavelEmail)) erros.push("Indique o email de quem entrega.");
      if (!dados.prazo) erros.push("Indique o prazo.");
      if (erros.length) return erros;
      const ref = doc(db, "clientes", estado.clienteSel, "incidentes", inc.id);
      const b = writeBatch(db);
      if (nova) {
        b.set(doc(ref, "provas", numero), { numero, ...dados, criadoEm: serverTimestamp(), criadoPor: emailAtual() });
        b.set(doc(collection(ref, "eventos")), { texto: texto("Prova " + numero + " pedida a " + dados.responsavelEmail + " até " + dhPt(dados.prazo) + ": " + dados.descricao, 1000), por: emailAtual(), em: serverTimestamp() });
        // Quem entrega passa a receber os avisos e o acesso à pasta, se ainda não estiver na lista
        const contactos = inc.contactosEmail || [];
        if (!contactos.includes(dados.responsavelEmail) && contactos.length < 10) {
          b.update(ref, { contactosEmail: [...contactos, dados.responsavelEmail], atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
        }
      } else {
        // Novo prazo ou novo pedido: os lembretes recomeçam
        const recomeca = dados.prazo !== p.prazo || (dados.estado === "Pedida" && p.estado !== "Pedida");
        if (recomeca) Object.assign(dados, { lembreteEm: deleteField(), lembrete2h: deleteField(), escaladaEm: deleteField() });
        b.update(doc(ref, "provas", p.id), dados);
        const mud = [dados.estado !== p.estado ? "estado → " + dados.estado : null, dados.prazo !== p.prazo ? "prazo → " + dhPt(dados.prazo) : null].filter(Boolean);
        if (mud.length) b.set(doc(collection(ref, "eventos")), { texto: texto("Prova " + p.numero + ": " + mud.join("; "), 1000), por: emailAtual(), em: serverTimestamp() });
      }
      await b.commit();
      aviso(nova ? "Prova pedida. O email segue na próxima execução da tarefa automática." : "Prova atualizada.", "ok");
      return [];
    },
  });
}

function gerirClientes(idInicial) {
  const ids = Object.keys(estado.clientes).sort();
  const sel = seletor("cl-sel", [["", "Novo cliente"], ...ids.map((x) => [x, estado.clientes[x].nome || x])], idInicial ?? estado.clienteSel ?? "");
  const f = {
    id: entrada("cl-id", "text", "", { maxlength: 40, pattern: "[a-z0-9][a-z0-9-]{1,39}" }),
    nome: entrada("cl-nome", "text", "", { maxlength: 150 }),
    nipc: entrada("cl-nipc", "text", "", { maxlength: 9, inputmode: "numeric" }),
    dominios: entrada("cl-dominios", "text", "", { maxlength: 400 }),
    crm: entrada("cl-crm", "text", "", { maxlength: 80 }),
    cve: el("input", { type: "checkbox", id: "cl-cve" }),
  };
  const campoId = campo("Identificador (só minúsculas, números e hífenes)", f.id, { ajuda: "Não pode ser mudado depois. É este o identificador que se põe nos convites das pessoas do cliente." });
  const preencher = () => {
    const c = estado.clientes[sel.value] || {};
    f.id.value = sel.value; f.nome.value = c.nome || ""; f.nipc.value = c.nipc || "";
    f.dominios.value = (c.dominiosEmail || []).join(", "); f.crm.value = c.crmEntidadeId || "";
    f.cve.checked = c.servicoCve === true;
    campoId.hidden = !!sel.value;
  };
  sel.addEventListener("change", preencher);
  preencher();
  abrirDialogo({
    titulo: "Clientes",
    corpo: el("div", { class: "grelha-form" },
      campo("Cliente", sel, { largo: true }), campoId,
      campo("Denominação", f.nome), campo("NIPC", f.nipc),
      campo("Domínios de email do cliente", f.dominios, { largo: true,
        ajuda: "Separados por vírgulas, por exemplo cm-exemplo.pt. Um pedido do formulário vindo destes domínios abre logo o incidente deste cliente. Nunca ponha domínios gratuitos (gmail.com, sapo.pt…)." }),
      campo("Identificador da empresa no CRM", f.crm, { largo: true, ajuda: "Preenchido automaticamente quando o incidente é aberto a partir do CRM." }),
      el("label", { class: "filtro-caixa campo--largo", for: "cl-cve" }, f.cve, " Alertas de vulnerabilidades ativos (o cliente recebe os avisos por email)"),
      el("p", { class: "campo--largo nota", texto: "A vigilância de exposição continua a ser ligada na consola (ver o guia). Um cliente criado aqui tem os incidentes e, com a opção acima, os alertas de vulnerabilidades." })),
    gravar: async () => {
      const erros = [];
      const id = sel.value || texto(f.id.value, 40).toLowerCase();
      const dominios = listaEmails(f.dominios.value).map((d) => d.replace(/^@/, ""));
      const dados = { nome: texto(f.nome.value, 150), nipc: texto(f.nipc.value, 9), dominiosEmail: dominios.slice(0, 10), crmEntidadeId: texto(f.crm.value, 80),
        servicoCve: f.cve.checked, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() };
      if (!sel.value && !/^[a-z0-9][a-z0-9-]{1,39}$/.test(id)) erros.push("O identificador só pode ter minúsculas, números e hífenes (2 a 40 carateres).");
      if (!sel.value && estado.clientes[id]) erros.push("Já existe um cliente com esse identificador.");
      if (!dados.nome) erros.push("Indique a denominação.");
      if (dados.nipc && !/^\d{9}$/.test(dados.nipc)) erros.push("O NIPC tem 9 dígitos.");
      if (dominios.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))) erros.push("Há um domínio inválido: escreva só o domínio, sem @.");
      const gratuito = dominios.find((d) => DOMINIOS_GRATUITOS.includes(d));
      if (gratuito) erros.push(gratuito + " é um domínio de email gratuito e não identifica o cliente.");
      const repetido = dominios.find((d) => Object.entries(estado.clientes).some(([k, c]) => k !== id && (c.dominiosEmail || []).includes(d)));
      if (repetido) erros.push("O domínio " + repetido + " já está noutro cliente.");
      if (dominios.length > 10) erros.push("Indique no máximo 10 domínios.");
      if (erros.length) return erros;
      const b = writeBatch(db);
      if (sel.value) b.update(doc(db, "clientes", id), dados);
      else b.set(doc(db, "clientes", id), { ...dados, ativo: false, criadoEm: serverTimestamp() });
      await b.commit();
      aviso("Cliente gravado.", "ok");
      return [];
    },
  });
}

function editarConfigIncidentes() {
  const c = estado.configInc || {};
  const resp = entrada("cf-resp", "email", c.responsavelPadrao || emailAtual(), { maxlength: 160 });
  const equipa = entrada("cf-equipa", "text", (c.equipaEmails || []).join(", "), { maxlength: 1700 });
  abrirDialogo({
    titulo: "Avisos por email dos incidentes",
    corpo: el("div", { class: "grelha-form" },
      campo("Responsável por omissão", resp, { largo: true, ajuda: "Fica responsável pelos incidentes abertos automaticamente (formulário e CRM)." }),
      campo("Equipa que recebe todos os avisos", equipa, { largo: true, ajuda: "Emails separados por vírgulas, até 10. Recebem os avisos de prazos, as provas em atraso e os pedidos por triar." }),
      el("p", { class: "campo--largo nota", texto: "Os emails só levam a referência, o título e os prazos. A descrição do incidente e os dados pessoais ficam nesta área." })),
    gravar: async () => {
      const r = texto(resp.value, 160).toLowerCase(), lista = listaEmails(equipa.value);
      const erros = [];
      if (r && !EMAIL_OK.test(r)) erros.push("O email do responsável é inválido.");
      if (lista.some((e) => !EMAIL_OK.test(e))) erros.push("Há um email inválido na equipa.");
      if (lista.length > 10) erros.push("Indique no máximo 10 emails.");
      if (erros.length) return erros;
      const b = writeBatch(db);
      b.set(doc(db, "config", "incidentes"), { responsavelPadrao: r, equipaEmails: lista, atualizadoEm: serverTimestamp(), atualizadoPor: emailAtual() });
      await b.commit();
      aviso("Configuração gravada.", "ok");
      return [];
    },
  });
}


/* ---------- Arranque ---------- */

$("entrar-google").addEventListener("click", () => entrar(google));
$("form-entrar").addEventListener("submit", entrarComEmail);
$("definir-senha").addEventListener("click", pedirDefinicaoSenha);
$("form-mfa-codigo").addEventListener("submit", validarCodigo);
$("form-mfa-registo").addEventListener("submit", concluirRegistoMfa);
$("botao-sair").addEventListener("click", () => signOut(auth));
$("verificar-reenviar").addEventListener("click", async () => {
  try { await sendEmailVerification(auth.currentUser); aviso("Email de confirmação reenviado.", "ok"); } catch (e) { aviso(mensagemErro(e), "erro"); }
});
$("verificar-continuar").addEventListener("click", async () => {
  await reload(auth.currentUser);
  if (!auth.currentUser.emailVerified) return aviso("O endereço de email ainda não está confirmado. Abra a ligação que enviámos.", "erro");
  await auth.currentUser.getIdToken(true);
  processarSessao(auth.currentUser);
});
$("dialogo-form").addEventListener("submit", submeterDialogo);
$("dialogo-cancelar").addEventListener("click", () => $("dialogo").close());
for (const b of document.querySelectorAll("[data-separador]")) b.addEventListener("click", () => mudarSeparador(b.dataset.separador));
for (const b of document.querySelectorAll("[data-seccao]")) b.addEventListener("click", () => abrirSeccao(b.dataset.seccao));
for (const ev of ["click", "keydown", "pointerdown", "scroll"]) document.addEventListener(ev, reiniciarInatividade, { passive: true });

// Barra de execução: largura definida por CSSOM (compatível com a política CSP sem estilos inline)
new MutationObserver(() => {
  for (const b of document.querySelectorAll(".barra__preenchimento[data-pct]")) b.style.width = b.dataset.pct + "%";
}).observe(document.body, { childList: true, subtree: true });

try {
  await setPersistence(auth, browserSessionPersistence);
  onAuthStateChanged(auth, processarSessao, (e) => window.__falhaArranque("Erro na autenticação", mensagemErro(e), e.code));
} catch (e) {
  window.__falhaArranque("Não foi possível iniciar a autenticação", mensagemErro(e), (e.code || "") + " " + (e.message || ""));
}
