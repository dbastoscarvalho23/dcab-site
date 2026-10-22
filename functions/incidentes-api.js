/* DCAB Consulting — automatização dos incidentes (lógica sem dependências do Firebase, testável).
 *
 * Quem fala com esta API:
 *  - o Apps Script do formulário do site (pedido de apoio, tarefas de 15 em 15 minutos, resultados);
 *  - o CRM (abrir um incidente a partir da ficha de uma empresa).
 * Todos os pedidos são assinados com HMAC-SHA256 sobre «data.id.corpo», com uma janela de 5 minutos
 * e identificador único (um pedido repetido é recusado). O segredo é INCIDENTES_SEGREDO (Secret Manager).
 *
 * Os emails não levam a descrição do incidente nem dados pessoais dos afetados: só a referência, o título,
 * os prazos e a ligação para a área reservada, onde o acesso exige segundo fator.
 */
"use strict";
const crypto = require("crypto");

const JANELA_MS = 5 * 60 * 1000;
const H = 3600000;
const URL_AREA = "https://dcabconsulting.com/reservado";
const ASSUNTO_FORMULARIO = "Incidente: pedido de apoio urgente";
// Domínios de email gratuitos: nunca servem para identificar um cliente
const DOMINIOS_GRATUITOS = ["gmail.com", "googlemail.com", "outlook.com", "outlook.pt", "hotmail.com", "hotmail.pt", "live.com", "live.com.pt",
  "msn.com", "yahoo.com", "yahoo.com.br", "icloud.com", "me.com", "sapo.pt", "netcabo.pt", "clix.pt", "iol.pt", "mail.pt", "proton.me", "protonmail.com", "gmx.com", "aol.com"];

class ErroApi extends Error { constructor(estado, mensagem) { super(mensagem); this.estado = estado; } }

/* ---------- Assinatura ---------- */
function assinar(segredo, data, id, corpo) {
  return crypto.createHmac("sha256", segredo).update(data + "." + id + "." + corpo, "utf8").digest("hex");
}
function verificarAssinatura(segredo, cab, corpo, agora = Date.now()) {
  const data = String(cab["x-dcab-data"] || ""), id = String(cab["x-dcab-id"] || ""), ass = String(cab["x-dcab-assinatura"] || "");
  if (!segredo) throw new ErroApi(500, "Segredo não configurado.");
  if (!/^\d{13}$/.test(data) || !/^[A-Za-z0-9-]{16,64}$/.test(id) || !/^[0-9a-f]{64}$/.test(ass)) throw new ErroApi(401, "Assinatura em falta.");
  if (Math.abs(agora - Number(data)) > JANELA_MS) throw new ErroApi(401, "Pedido fora da janela de 5 minutos.");
  const esperado = Buffer.from(assinar(segredo, data, id, corpo), "hex");
  if (!crypto.timingSafeEqual(esperado, Buffer.from(ass, "hex"))) throw new ErroApi(401, "Assinatura inválida.");
  return id;
}

/* ---------- Utilitários ---------- */
const txt = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
// Padrão estrito: sem vírgulas, ponto e vírgula, barras ou espaços (o email serve de identificador e de destinatário)
const emailOk = (e) => typeof e === "string" && e.length <= 160 && /^[a-z0-9._%+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e);
// Incidentes abertos pelo formulário por cliente e por hora; acima disto o pedido vai para a triagem
const LIMITE_FORMULARIO_HORA = 3;
// Incidentes criados antes da versão 1.3 não entram na automatização (sem pastas, avisos nem resumos)
const AUTOMATICO_DESDE = "2026-10-19T00:00:00.000Z";
const normEmail = (e) => txt(e, 160).toLowerCase();
const dominioDe = (e) => (e.split("@")[1] || "").toLowerCase();
const unicos = (lista) => [...new Set(lista.map(normEmail).filter(emailOk))];
const isoAgora = (agora) => new Date(agora).toISOString();
const lisboa = (d, op) => new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", ...op }).format(d);
const dataHoraPt = (d) => lisboa(d, { dateStyle: "short", timeStyle: "short" }) + " (hora de Lisboa)";
const diaLisboa = (agora) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
const horaLisboa = (agora) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hourCycle: "h23" }).format(agora));

// Nome da pasta do incidente no Drive (o mesmo no formulário e na tarefa, para não duplicar)
const nomePasta = (referencia, cliente) => `${referencia} · ${txt(cliente, 200)}`.replace(/[\/\\]/g, "-").slice(0, 120);

function slugCliente(nome, existentes) {
  const base = txt(nome, 80).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 34) || "cliente";
  let s = base.length >= 2 ? base : "cliente-" + base, n = 2;
  while (existentes.includes(s)) s = base.slice(0, 34) + "-" + n++;
  return s;
}

/* ---------- Pedido de apoio pelo formulário ---------- */
function lerPedidoFormulario(d) {
  const p = {
    nome: txt(d.nome, 120), empresa: txt(d.empresa, 120), email: normEmail(d.email), telefone: txt(d.telefone, 30),
    mensagem: txt(d.mensagem, 3000), recebidoEm: txt(d.recebidoEm, 30),
  };
  if (!p.nome || !p.empresa || !emailOk(p.email) || !p.mensagem) throw new ErroApi(400, "Pedido incompleto.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(p.recebidoEm)) throw new ErroApi(400, "Data de receção inválida.");
  return p;
}

/* Identifica o cliente: 1) pessoa com acesso de cliente; 2) domínio do email registado no cliente (nunca domínios gratuitos). */
function identificarCliente(email, acesso, clientesPorDominio) {
  if (acesso && acesso.ativo === true && acesso.papel === "cliente" && Array.isArray(acesso.clientes) && acesso.clientes.length === 1) return acesso.clientes[0];
  const dom = dominioDe(email);
  if (!dom || DOMINIOS_GRATUITOS.includes(dom)) return null;
  return clientesPorDominio.length === 1 ? clientesPorDominio[0] : null; // dois clientes com o mesmo domínio: vai para triagem
}

function proximaReferencia(ano, existentes) {
  const n = existentes.map((r) => { const m = /^INC-(\d{4})-(\d{3})$/.exec(r || ""); return m && Number(m[1]) === ano ? Number(m[2]) : 0; });
  return "INC-" + ano + "-" + String(Math.max(0, ...n) + 1).padStart(3, "0");
}

/* Documento do incidente com todos os campos que as regras exigem, para a equipa o poder editar depois. */
function novoIncidente({ referencia, titulo, descricao, detetadoEm, entidadeNome, nipc = "", pontoContacto = "", origem, responsavelDcab = "", contactosEmail = [], crm = null, criadoPor }, carimbo) {
  const inc = {
    referencia, titulo: txt(titulo, 150) || "Pedido de apoio", tipo: "Outro", estado: "Por triar", detetadoEm, descricao: txt(descricao, 3000),
    regimes: { nis2: true, rgpd: false, dora: false }, qualificacao: "Por confirmar", significativo: "Em avaliação", verificadoEm: "",
    fundamentacao: "", fimImpactoEm: "", suspeitaIlicito: "Em avaliação", transfronteirico: "Em avaliação", servicosAfetados: "", impacto: "",
    medidas: "", causa: "", iocs: "", dados: { pessoais: "Em avaliação", conhecimentoEm: "", risco: "Por avaliar", categorias: "", titulares: "" },
    entidadeNome: txt(entidadeNome, 150), nipc: /^\d{9}$/.test(nipc) ? nipc : "", contactos: { responsavel: "", pontoContacto: txt(pontoContacto, 200), epd: "" },
    notificacoes: {}, origem, responsavelDcab: emailOk(responsavelDcab) ? responsavelDcab : "", contactosEmail: unicos(contactosEmail).slice(0, 10),
    alertasEnviados: {}, resumoEm: "", criadoPor, atualizadoPor: criadoPor, ...carimbo,
  };
  if (crm) inc.crm = { entidadeId: txt(crm.entidadeId, 80) };
  return inc;
}

// Provas pedidas por omissão quando o pedido chega pelo formulário (a equipa ajusta ou anula)
const PROVAS_INICIAIS = [
  "Registos (logs) dos sistemas e da firewall desde 48 horas antes da deteção",
  "Mensagem, ficheiro ou ecrã que revelou o incidente (por exemplo a nota de resgate)",
  "Lista dos sistemas, contas e serviços afetados",
];
function provasIniciais(responsavelEmail, agora, criadoPor, carimbo) {
  const prazo = new Date(agora + 24 * H).toISOString();
  return PROVAS_INICIAIS.map((descricao, i) => ({
    id: "P0" + (i + 1),
    // lembreteEm: o pedido inicial segue logo na resposta automática; o primeiro lembrete só vem 20 horas depois
    dados: { numero: "P0" + (i + 1), descricao, responsavelEmail, prazo, estado: "Pedida", notas: "", lembreteEm: new Date(agora).toISOString(), criadoPor, atualizadoPor: criadoPor, ...carimbo },
  }));
}

/* ---------- Tarefas de 15 em 15 minutos ----------
 * entrada: { config, incidentes: [{ cliente, clienteNome, id, dados, provas: [{id, dados}], contactos: [emails] }], triagem: [{id, dados}] }
 * prazos: função calcularPrazos(inc, agora) do módulo partilhado com a área reservada
 * saída: ações com id estável; o Apps Script executa e devolve o resultado de cada uma */
function calcularAcoes(entrada, agora, calcularPrazos) {
  const acoes = [];
  const cfg = entrada.config || {};
  const equipaBase = unicos([cfg.responsavelPadrao, ...(cfg.equipaEmails || [])]);
  const hoje = diaLisboa(agora);
  const corpo = (inc, cli) => [`Incidente ${inc.referencia}: ${inc.titulo}`, `Cliente: ${cli}`, `Estado: ${inc.estado}`];
  const rodape = [`Abra a área reservada para ver o pormenor e registar o que foi feito: ${URL_AREA}`,
    "Esta mensagem é automática. Não responda com dados do incidente por email."];

  const desde = Date.parse(cfg.automaticoDesde || AUTOMATICO_DESDE);
  for (const x of entrada.incidentes || []) {
    const inc = x.dados;
    if (inc.estado === "Encerrado") continue;
    if (!(x.criadoMs >= desde)) continue; // anterior à automatização ou ainda sem data do servidor
    const base = { cliente: x.cliente, incidente: x.id, referencia: inc.referencia };
    const equipa = unicos([inc.responsavelDcab, ...equipaBase]);
    const clienteEmails = unicos([...(x.contactos || []), ...(inc.contactosEmail || [])]);
    const todos = unicos([...equipa, ...clienteEmails]);

    // 1. Pasta no Google Drive (incidentes criados à mão também a recebem)
    // Quem tem acesso à pasta de entregas: contactos do cliente e quem tem provas por entregar
    const partilha = unicos([...clienteEmails, ...(x.provas || []).filter((p) => p.dados.estado === "Pedida").map((p) => p.dados.responsavelEmail)]).slice(0, 25);
    if (!inc.pastaId) {
      acoes.push({ id: `pasta:${x.cliente}:${x.id}`, tipo: "pasta", ...base, nomePasta: nomePasta(inc.referencia, x.clienteNome), partilharCom: partilha, equipa });
      continue; // o resto espera pela pasta
    }
    // 2. Partilha da pasta de entregas: acrescenta quem falta e retira quem deixou de ter acesso (só os que o sistema partilhou)
    const atual = unicos(inc.partilhadaCom || []);
    if (partilha.length !== atual.length || partilha.some((e) => !atual.includes(e))) {
      acoes.push({ id: `partilha:${x.cliente}:${x.id}:${agora}`, tipo: "partilha", ...base, provasPastaId: inc.provasPastaId,
        acrescentar: partilha.filter((e) => !atual.includes(e)), retirar: atual.filter((e) => !partilha.includes(e)), esperado: partilha });
    }
    // 3. Ficheiros entregues: lista a pasta das provas em cada execução; o servidor indica os já registados
    acoes.push({ id: `ficheiros:${x.cliente}:${x.id}:${agora}`, tipo: "ficheiros", ...base, pastaId: inc.pastaId, provasPastaId: inc.provasPastaId,
      conhecidos: (x.ficheirosIds || []).slice(0, 2000) });

    // 3. Provas pedidas
    for (const p of x.provas || []) {
      const pr = p.dados;
      if (pr.estado !== "Pedida") continue;
      const bp = { ...base, prova: p.id, numero: pr.numero };
      if (!pr.pastaId) {
        // o pedido por email só segue quando a subpasta existir, para levar a ligação
        acoes.push({ id: `prova-pasta:${x.cliente}:${x.id}:${p.id}`, tipo: "prova-pasta", ...bp, provasPastaId: inc.provasPastaId, nomePasta: `${pr.numero} · ${pr.descricao}`.slice(0, 100) });
        continue;
      }
      const prazo = new Date(pr.prazo).getTime();
      const para = unicos([pr.responsavelEmail]);
      const linhasProva = [...corpo(inc, x.clienteNome), "", `Prova pedida: ${pr.numero} — ${pr.descricao}`, `Prazo: ${dataHoraPt(new Date(prazo))}`,
        `Entregue os ficheiros na pasta «${pr.numero}» do Google Drive deste incidente${pr.pastaUrl ? ": " + pr.pastaUrl : ""}.`, "", ...rodape];
      if (isFinite(prazo) && prazo <= agora) {
        if (!pr.escaladaEm) acoes.push({ id: `escalar:${x.cliente}:${x.id}:${p.id}`, tipo: "escalar-prova", ...bp, para: todos, cc: [],
          assunto: `[${inc.referencia}] Prova em atraso: ${pr.numero}`,
          linhas: [...corpo(inc, x.clienteNome), "", `Prova pedida: ${pr.numero} — ${pr.descricao}`, `Prazo: ${dataHoraPt(new Date(prazo))}`,
            "O prazo passou sem a prova ter sido entregue. Combine com o cliente uma nova data ou registe porque não existe.", "", ...rodape] });
      } else if (isFinite(prazo) && para.length) {
        const falta = prazo - agora;
        if (falta <= 2 * H && !pr.lembrete2h) acoes.push({ id: `lembrete2h:${x.cliente}:${x.id}:${p.id}`, tipo: "lembrete-prova", duasHoras: true, ...bp, para, cc: equipa,
          assunto: `[${inc.referencia}] Faltam menos de 2 horas para entregar ${pr.numero}`, linhas: linhasProva });
        else if (!pr.lembreteEm || agora - new Date(pr.lembreteEm).getTime() >= 20 * H) acoes.push({ id: `lembrete:${x.cliente}:${x.id}:${p.id}:${hoje}`, tipo: "lembrete-prova", duasHoras: false, ...bp, para, cc: equipa,
          assunto: `[${inc.referencia}] Prova por entregar: ${pr.numero}`, linhas: linhasProva });
      }
    }

    // 4. Prazos de notificação obrigatória: avisos a 12 h, 6 h e 1 h, e quando passa o prazo
    const enviados = inc.alertasEnviados || {};
    for (const p of calcularPrazos(inc, new Date(agora))) {
      if (!p.obrigatoria || p.estado !== "Por enviar" || !p.limite) continue;
      const falta = p.limite.getTime() - agora;
      const limiar = falta < 0 ? "atraso" : falta <= H ? "1h" : falta <= 6 * H ? "6h" : falta <= 12 * H ? "12h" : null;
      if (!limiar) continue;
      // A chave inclui o prazo: se a equipa corrigir a hora de verificação, os avisos do novo prazo voltam a sair
      const chave = `${p.chave}:${p.limite.getTime()}:${limiar}`;
      if (enviados[chave]) continue;
      const titulo = limiar === "atraso" ? "Prazo ultrapassado" : `Faltam menos de ${limiar.replace("h", " h")}`;
      acoes.push({ id: `prazo:${x.cliente}:${x.id}:${chave}`, tipo: "prazo", ...base, chave, para: todos, cc: [],
        assunto: `[${inc.referencia}] ${titulo}: ${p.destinatario} · ${p.momento}`,
        linhas: [...corpo(inc, x.clienteNome), "", `${p.destinatario} · ${p.momento}`, `Prazo: ${dataHoraPt(p.limite)}`, p.regra, "",
          "A minuta está pronta na área reservada. Depois de submeter, registe o envio com a referência atribuída.", "", ...rodape] });
    }

    // 5. Resumo diário, a partir das 8 horas de Lisboa
    if (horaLisboa(agora) >= 8 && inc.resumoEm !== hoje) {
      const prazos = calcularPrazos(inc, new Date(agora)).filter((p) => p.estado === "Por enviar" && p.limite).sort((a, b) => a.limite - b.limite).slice(0, 5);
      const provas = (x.provas || []).filter((p) => p.dados.estado === "Pedida");
      acoes.push({ id: `resumo:${x.cliente}:${x.id}:${hoje}`, tipo: "resumo-diario", ...base, dia: hoje, para: todos, cc: [],
        assunto: `[${inc.referencia}] Resumo do dia ${lisboa(new Date(agora), { dateStyle: "short" })}`,
        linhas: [...corpo(inc, x.clienteNome), "", "Próximos prazos:", ...(prazos.length ? prazos.map((p) => `- ${p.destinatario} · ${p.momento}: ${dataHoraPt(p.limite)}${p.atraso ? " (EM ATRASO)" : ""}`) : ["- sem prazos a correr"]),
          "", "Provas por entregar:", ...(provas.length ? provas.map((p) => `- ${p.dados.numero} · ${p.dados.descricao} (prazo ${dataHoraPt(new Date(p.dados.prazo))})`) : ["- nenhuma"]), "", ...rodape] });
    }
  }

  // 6. Pedidos que não se conseguiram associar a um cliente: aviso à equipa 30 minutos depois, uma vez
  for (const t of entrada.triagem || []) {
    if (t.dados.estado !== "Por triar" || t.dados.alertado === true || t.dados.alertadoEm) continue;
    if (agora - new Date(t.dados.recebidoEm).getTime() < 30 * 60000) continue;
    acoes.push({ id: `triagem:${t.id}`, tipo: "triagem", pedido: t.id, para: equipaBase, cc: [],
      assunto: "[Incidentes] Pedido de apoio por triar há mais de 30 minutos",
      linhas: [`Recebido: ${dataHoraPt(new Date(t.dados.recebidoEm))}`, `Empresa indicada: ${t.dados.empresa}`,
        "O remetente não corresponde a nenhum cliente. Abra a área reservada › Incidentes › Pedidos por triar e associe-o a um cliente ou descarte-o.", "", ...rodape] });
  }
  return acoes;
}

/* Resultado de uma ação → alterações a gravar. Devolve [{ alvo: 'incidente'|'prova'|'ficheiro'|'pedido', ... }] */
function resultadoParaAlteracoes(acao, r, agora) {
  const iso = isoAgora(agora);
  if (!r || r.ok !== true) return [];
  switch (acao.tipo) {
    case "pasta":
      if (!/^[A-Za-z0-9_-]{10,100}$/.test(r.pastaId || "") || !/^[A-Za-z0-9_-]{10,100}$/.test(r.provasPastaId || "")) return [];
      return [{ alvo: "incidente", campos: { pastaId: r.pastaId, pastaUrl: txt(r.pastaUrl, 300), provasPastaId: r.provasPastaId, provasPastaUrl: txt(r.provasPastaUrl, 300),
          partilhadaCom: unicos(Array.isArray(r.partilhada) ? r.partilhada : []).slice(0, 25) },
        evento: "Pasta do incidente criada no Google Drive" + (Array.isArray(r.partilhada) && r.partilhada.length ? ` e partilhada com ${r.partilhada.length} contacto(s) do cliente` : "")
          + (Array.isArray(r.naoPartilhada) && r.naoPartilhada.length ? `. Não foi possível partilhar com ${r.naoPartilhada.length} endereço(s): partilhe à mão no Google Drive` : "") }];
    case "prova-pasta":
      if (!/^[A-Za-z0-9_-]{10,100}$/.test(r.pastaId || "")) return [];
      return [{ alvo: "prova", campos: { pastaId: r.pastaId, pastaUrl: txt(r.pastaUrl, 300) } }];
    case "lembrete-prova":
      return [{ alvo: "prova", campos: acao.duasHoras ? { lembrete2h: true, lembreteEm: iso } : { lembreteEm: iso }, evento: `Lembrete enviado por email: prova ${acao.numero}` }];
    case "escalar-prova":
      return [{ alvo: "prova", campos: { escaladaEm: iso }, evento: `Prova ${acao.numero} em atraso: aviso enviado à equipa e ao cliente` }];
    case "prazo":
      return [{ alvo: "incidente", campos: { alertasEnviados: { [acao.chave]: iso } }, evento: `Aviso de prazo enviado por email (${acao.chave.replace(":", ", ")})` }];
    case "resumo-diario":
      return [{ alvo: "incidente", campos: { resumoEm: acao.dia } }];
    case "triagem":
      return [{ alvo: "pedido", campos: { alertado: true, alertadoEm: iso } }];
    case "partilha":
      if (!Array.isArray(r.partilhadaCom)) return [];
      return [{ alvo: "incidente", campos: { partilhadaCom: unicos(r.partilhadaCom).slice(0, 25) },
        evento: "Acesso à pasta de entregas atualizado" + (r.acrescentados && r.acrescentados.length ? `: +${r.acrescentados.length}` : "") + (r.retirados && r.retirados.length ? ` −${r.retirados.length}` : "")
          + (Array.isArray(r.falhas) && r.falhas.length ? `. Não foi possível partilhar com ${r.falhas.length} endereço(s): partilhe à mão no Google Drive` : "") }];
    case "ficheiros":
      return (Array.isArray(r.ficheiros) ? r.ficheiros : []).slice(0, 200).filter((f) => /^[A-Za-z0-9_-]{10,100}$/.test(f.id || "")).map((f) => ({
        alvo: "ficheiro", id: f.id, pastaId: txt(f.pastaId, 100),
        campos: { nome: txt(f.nome, 200), tamanho: Number(f.tamanho) || 0, sha256: /^[0-9a-f]{64}$/.test(f.sha256 || "") ? f.sha256 : "",
          modificadoEm: txt(f.modificadoEm, 30), url: txt(f.url, 300), pastaId: txt(f.pastaId, 100), registadoEm: iso, registadoPor: "sistema" },
      }));
    default:
      return [];
  }
}

module.exports = {
  ErroApi, assinar, verificarAssinatura, lerPedidoFormulario, identificarCliente, proximaReferencia, novoIncidente, provasIniciais,
  calcularAcoes, resultadoParaAlteracoes, slugCliente, unicos, emailOk, normEmail, dominioDe, diaLisboa, horaLisboa,
  ASSUNTO_FORMULARIO, DOMINIOS_GRATUITOS, URL_AREA, LIMITE_FORMULARIO_HORA, AUTOMATICO_DESDE, nomePasta,
};
