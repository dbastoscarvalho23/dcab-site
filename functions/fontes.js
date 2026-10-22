/* DCAB Consulting — clientes das fontes da vigilância. Endereços fixos, sem redirecionamentos; chaves só no servidor.
 *  - Hudson Rock (ferramentas OSINT gratuitas): estatísticas de infostealers por domínio, sem chave.
 *  - ransomware.live v2: GET https://api.ransomware.live/v2/searchvictims/<termo>, sem chave.
 *  - Have I Been Pwned v3: /latestbreach, /breaches, /subscribeddomains, /breacheddomain/<domínio>, cabeçalho «hibp-api-key».
 */
"use strict";

const AGENTE = "DCAB-Vigilancia/1.0 (+https://dcabconsulting.com)";
const TEMPO_MS = 30000;

async function pedido(url, { metodo = "GET", corpo, cabecalhos = {}, tentativa = 0 } = {}) {
  const cab = { "user-agent": AGENTE, accept: "application/json", ...cabecalhos };
  if (corpo) cab["content-type"] = "application/json";
  const r = await fetch(url, { method: metodo, headers: cab, body: corpo ? JSON.stringify(corpo) : undefined, redirect: "error", signal: AbortSignal.timeout(TEMPO_MS) });
  if (r.status === 429 && tentativa < 2) {
    const espera = Math.min(30, Number(r.headers.get("retry-after")) || 10);
    await new Promise((ok) => setTimeout(ok, espera * 1000));
    return pedido(url, { metodo, corpo, cabecalhos, tentativa: tentativa + 1 });
  }
  if (r.status === 404) return null;
  if (r.status === 429) console.warn(JSON.stringify({ severity: "WARNING", evento: new URL(url).hostname.includes("haveibeenpwned") ? "hibp_429" : "fonte_429", origem: "vigilancia", fonte: new URL(url).hostname, message: "Limite de pedidos atingido" }));
  if (!r.ok) {
    const e = new Error(`${new URL(url).hostname} respondeu ${r.status}`);
    e.estado = r.status;
    throw e;
  }
  return r.json();
}

/* ---------- Hudson Rock (ferramentas OSINT gratuitas, sem chave) ----------
 * GET https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-domain?domain=<domínio>
 * Devolve só estatísticas do domínio (totais de trabalhadores, clientes do serviço e terceiros com credenciais
 * roubadas por infostealers, e datas da última infeção). Sem nomes de equipamentos, contas nem palavras-passe.
 * A resposta é guardada em cache 4 horas pela Hudson Rock; a recolha de 6 em 6 horas respeita isso.
 */
const HR_OSINT = "https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-domain?domain=";
const numero = (v) => (typeof v === "number" && Number.isFinite(v) ? v : Number.isFinite(Number(v)) ? Number(v) : 0);
async function hudsonResumo(dominio) {
  const r = (await pedido(HR_OSINT + encodeURIComponent(dominio))) || {};
  return {
    total: numero(r.total),
    trabalhadores: numero(r.employees),
    utilizadores: numero(r.users),
    terceiros: numero(r.third_parties),
    ultimoTrabalhador: r.last_employee_compromised ? String(r.last_employee_compromised).slice(0, 25) : "",
    ultimoUtilizador: r.last_user_compromised ? String(r.last_user_compromised).slice(0, 25) : "",
  };
}

/* ---------- ransomware.live ---------- */
async function ransomwareProcurar(termo) {
  const r = await pedido("https://api.ransomware.live/v2/searchvictims/" + encodeURIComponent(termo));
  return Array.isArray(r) ? r : (r && (r.victims || r.data)) || [];
}

/* ---------- Have I Been Pwned ---------- */
const HIBP = "https://haveibeenpwned.com/api/v3";
const hibp = (caminho, chave) => pedido(HIBP + caminho, { cabecalhos: chave ? { "hibp-api-key": chave } : {} });
const hibpUltimaFuga = () => hibp("/latestbreach");
const hibpCatalogo = () => hibp("/breaches");
async function hibpDominioVerificado(chave, dominio) {
  const lista = (await hibp("/subscribeddomains", chave)) || [];
  return lista.some((x) => String(x.DomainName).toLowerCase() === dominio);
}
const hibpDominio = (chave, dominio) => hibp("/breacheddomain/" + encodeURIComponent(dominio), chave);

module.exports = { hudsonResumo, ransomwareProcurar, hibpUltimaFuga, hibpCatalogo, hibpDominioVerificado, hibpDominio, pedido };
