/* DCAB Consulting — vigilância de exposição (lógica pura, testável sem rede).
 *
 * Converte resultados de três fontes em alertas para a área reservada:
 *  - Hudson Rock (ferramentas OSINT gratuitas): totais de computadores infetados por infostealers com credenciais do domínio;
 *  - ransomware.live: vítimas publicadas em sites de fugas de grupos de ransomware;
 *  - Have I Been Pwned: fugas de dados que incluem endereços do domínio (domínio verificado).
 *
 * Regras de guarda:
 *  - nunca guarda palavras-passe, cookies, endereços IP nem ficheiros;
 *  - identidades (emails, utilizadores) ficam mascaradas;
 *  - dos infostealers só há totais e datas (a fonte gratuita não identifica pessoas nem equipamentos).
 */
"use strict";
const crypto = require("crypto");

const GRAVIDADES = ["info", "low", "medium", "high", "critical"];
const GRAVIDADE_PT = { info: "Informativa", low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica" };
const ESTADOS = ["Novo", "Em análise", "Tratado", "Falso positivo"];
const AVALIACOES = ["Por avaliar", "Não significativo", "Notificado ao CNCS", "Notificado à CNPD", "Notificado ao CNCS e à CNPD"];

const CAT = {
  infetado: "Computador infetado",
  utilizadores: "Clientes do serviço com credenciais roubadas",
  ransomware: "Publicação de grupo de ransomware",
  fuga: "Credencial exposta em fuga de dados",
};
const FONTES = { hudsonrock: "Hudson Rock", ransomware: "ransomware.live", hibp: "Have I Been Pwned" };

const idAlerta = (...partes) => crypto.createHash("sha256").update(partes.map(String).join("|")).digest("hex").slice(0, 40);
const corta = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const diasDesde = (iso) => (Date.now() - Date.parse(iso)) / 86400000;

function mascararEmail(v) {
  const s = String(v || "").trim();
  const m = s.match(/^([^@\s]{1,64})@([^@\s]+)$/);
  if (!m) return s ? s.slice(0, 1) + "***" : "";
  return m[1].slice(0, 1) + "***@" + m[2].toLowerCase();
}

// Para textos públicos (descrições de vítimas de ransomware): mascara emails, pares utilizador:palavra-passe e tokens
function limparTexto(t, max) {
  return String(t || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[^\s@:;|,]{1,64}@[^\s@:;|,]+\.[a-z]{2,}/gi, (e) => mascararEmail(e))
    .replace(/(\*\*\*@[^\s:;|,]+)\s*[:;|,]\s*\S+/g, "$1:***")
    .replace(/\b(?!https?\b)([\w.+-]{2,64})[:|;](?!\/\/)(\S{6,})/g, "$1:***")
    .replace(/\b(pass(word)?|pwd|senha|palavra-passe|token|secret|key)\s*[:=]\s*\S+/gi, "$1: ***")
    .replace(/\b[A-Za-z0-9+/_-]{32,}\b/g, "***")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function base(fonte, categoria, gravidade, titulo, extra = {}) {
  const requerAvaliacao = extra.requerAvaliacao ?? (gravidade === "high" || gravidade === "critical");
  return {
    fonte: FONTES[fonte] || fonte,
    categoria,
    gravidade: GRAVIDADES.includes(gravidade) ? gravidade : "info",
    titulo: corta(titulo, 200),
    resumo: corta(extra.resumo || "", 400),
    identificadores: (extra.identificadores || []).slice(0, 10).map((x) => (String(x).includes("@") ? mascararEmail(x) : corta(x, 120))),
    detalhes: extra.detalhes || {},
    publicadoEm: extra.publicadoEm || null,
    detetadoEm: extra.detetadoEm || new Date().toISOString(),
    requerAvaliacao,
    avaliacaoNotificacao: requerAvaliacao ? "Por avaliar" : "Não significativo",
    estado: "Novo",
    responsavel: "",
    notas: "",
  };
}

/* ---------- Hudson Rock (estatísticas públicas por domínio) ----------
 * A fonte só dá totais e datas. Um alerta nasce quando um total sobe face à recolha anterior
 * (ou, na primeira recolha, quando já há casos). Nada identifica pessoas nem equipamentos:
 * a identificação dos computadores faz-se com o cliente (EDR, antivírus, inventário).
 */
const recente = (iso, dias) => !!iso && Date.parse(iso) > 0 && diasDesde(iso) <= dias;

function alertasHudson(atual, anterior, dominio, mes) {
  const ant = anterior || { trabalhadores: 0, utilizadores: 0, terceiros: 0, ultimoTrabalhador: "" };
  const out = [];
  const novosT = atual.trabalhadores - (ant.trabalhadores || 0);
  if (atual.trabalhadores > 0 && (novosT > 0 || (atual.ultimoTrabalhador && atual.ultimoTrabalhador !== ant.ultimoTrabalhador))) {
    const rec = recente(atual.ultimoTrabalhador, 90);
    const n = Math.max(novosT, 0);
    out.push({
      id: idAlerta("hr-trabalhadores", dominio, atual.trabalhadores, atual.ultimoTrabalhador),
      dados: base("hudsonrock", CAT.infetado, rec ? "critical" : "high",
        anterior ? `${n || "Novos"} ${n === 1 ? "computador de trabalhador infetado" : "computadores de trabalhadores infetados"}` : `${atual.trabalhadores} ${atual.trabalhadores === 1 ? "computador de trabalhador infetado" : "computadores de trabalhadores infetados"} (situação inicial)`, {
          requerAvaliacao: rec,
          identificadores: [dominio],
          resumo: "Malware que rouba credenciais (infostealer) recolheu credenciais deste domínio em computadores de trabalhadores. A fonte não identifica os computadores: confirme com a equipa de TI (antivírus, EDR, inventário) e mude as palavras-passe e sessões do domínio.",
          detalhes: { total: atual.trabalhadores, novos: n, ultimaInfecao: atual.ultimoTrabalhador },
          publicadoEm: atual.ultimoTrabalhador || null,
        }),
      interno: { fonteId: `osint:${dominio}:trabalhadores:${atual.trabalhadores}` },
    });
  }
  const novosU = atual.utilizadores - (ant.utilizadores || 0);
  if (atual.utilizadores > 0 && (novosU > 0 || !anterior)) {
    const n = anterior ? novosU : atual.utilizadores;
    out.push({
      id: idAlerta("hr-utilizadores", dominio, mes),
      incremento: n,
      dados: base("hudsonrock", CAT.utilizadores, n >= 50 ? "high" : n >= 10 ? "medium" : "low",
        `${n} ${n === 1 ? "cliente do serviço com credenciais roubadas" : "clientes do serviço com credenciais roubadas"} (${mes})`, {
          requerAvaliacao: n >= 50,
          identificadores: [dominio],
          resumo: "Computadores de clientes do serviço infetados guardaram credenciais deste site. O problema está nesses computadores, não no vosso sistema; não há dados das pessoas, só o total.",
          detalhes: { total: n, acumulado: atual.utilizadores, ultimaInfecao: atual.ultimoUtilizador, periodo: mes },
        }),
      interno: { fonteId: `osint:${dominio}:utilizadores:${mes}` },
    });
  }
  const novosE = atual.terceiros - (ant.terceiros || 0);
  if (atual.terceiros > 0 && novosE > 0) {
    out.push({
      id: idAlerta("hr-terceiros", dominio, atual.terceiros),
      dados: base("hudsonrock", "Credenciais do domínio em computadores de terceiros", "low",
        `${novosE} ${novosE === 1 ? "novo caso" : "novos casos"} de credenciais ligadas ao domínio em computadores de terceiros`, {
          requerAvaliacao: false,
          identificadores: [dominio],
          resumo: "Credenciais associadas ao domínio foram encontradas em computadores infetados de terceiros (por exemplo fornecedores ou parceiros). Avalie com os fornecedores com acesso aos vossos sistemas.",
          detalhes: { total: atual.terceiros, novos: novosE },
        }),
      interno: { fonteId: `osint:${dominio}:terceiros:${atual.terceiros}` },
    });
  }
  return out;
}

/* ---------- ransomware.live: vítima publicada ---------- */
function alertaRansomware(v, termo) {
  const data = v.attackdate || v.discovered || v.published || null;
  const dados = base("ransomware", CAT.ransomware, "critical", `${corta(v.victim || v.post_title || "Vítima", 120)} publicada pelo grupo ${corta(v.group || v.group_name || "desconhecido", 40)}`, {
    requerAvaliacao: true,
    identificadores: [termo],
    resumo: limparTexto(v.description, 400),
    detalhes: { grupo: corta(v.group || v.group_name, 60), site: corta(v.website || v.domain, 120), pais: corta(v.country, 2), setor: corta(v.sector || v.activity, 60) },
    publicadoEm: data,
  });
  return { id: idAlerta("ransomware", v.group || v.group_name, v.victim || v.post_title, data), dados, interno: { fonteId: corta(v.url || v.post_url || "", 300) } };
}

/* ---------- HIBP: uma fuga com endereços do domínio verificado ---------- */
function alertaFugaHibp(fuga, enderecos, dominio) {
  const comPp = (fuga.DataClasses || []).some((c) => /password/i.test(c));
  const recente = fuga.BreachDate && diasDesde(fuga.BreachDate) <= 365;
  const g = comPp && recente ? "high" : comPp ? "medium" : "low";
  const dados = base("hibp", CAT.fuga, g, `${enderecos.length} ${enderecos.length === 1 ? "endereço" : "endereços"} do domínio na fuga ${corta(fuga.Title || fuga.Name, 80)}`, {
    requerAvaliacao: false,
    identificadores: [dominio],
    detalhes: {
      fuga: corta(fuga.Title || fuga.Name, 80),
      dataFuga: fuga.BreachDate || "",
      dados: (fuga.DataClasses || []).slice(0, 12).join(", "),
      contas: enderecos.slice(0, 30).map(mascararEmail).join(", "),
      total: enderecos.length,
      comPalavraPasse: comPp,
    },
    publicadoEm: fuga.AddedDate || null,
  });
  return { id: idAlerta("hibp", dominio, fuga.Name), dados, interno: { fonteId: String(fuga.Name || "").slice(0, 120) } };
}

/* ---------- ransomware.live: só aceita vítimas que correspondem ao cliente ---------- */
function corresponde(v, dominios, nomes) {
  const site = String(v.website || v.domain || "").toLowerCase();
  const nome = String(v.victim || v.post_title || "").toLowerCase();
  if (dominios.some((d) => site === d || site.endsWith("." + d) || nome === d || nome.endsWith("." + d))) return true;
  return nomes.some((n) => n.length >= 5 && nome === n.toLowerCase());
}

module.exports = {
  alertasHudson, alertaRansomware, alertaFugaHibp, corresponde,
  mascararEmail, limparTexto, idAlerta, CAT, FONTES, GRAVIDADES, GRAVIDADE_PT, ESTADOS, AVALIACOES,
};
