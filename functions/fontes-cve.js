/* DCAB Consulting — fontes dos alertas de vulnerabilidades. Só descargas públicas: nenhum dado de cliente é enviado.
 *  - Lista CVE (CVE Program, repositório cvelistV5 no GitHub): deltaLog.json com os registos novos e atualizados
 *    e o registo JSON 5 de cada CVE (fabricante, produto e versões indicados pela CNA).
 *  - NVD (NIST), API 2.0: CPE e CVSS do NIST para os registos alterados num intervalo.
 *  - Catálogo KEV (CISA): vulnerabilidades exploradas.
 *  - EPSS (FIRST): probabilidade de exploração nos 30 dias seguintes (ficheiro completo do dia).
 *  - EUVD (ENISA): vulnerabilidades exploradas na base europeia.
 * Endereços fixos, sem redirecionamentos, com tempo máximo por pedido.
 */
"use strict";

const AGENTE = "DCAB-AlertasCVE/1.0 (+https://dcabconsulting.com)";
const TEMPO_MS = 30000;

const URL_DELTA = "https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/deltaLog.json";
const URL_REGISTO = (id) => {
  const [, ano, num] = /^CVE-(\d{4})-(\d+)$/.exec(id);
  return `https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/${ano}/${num.slice(0, -3) || "0"}xxx/${id}.json`;
};
const URL_NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const URL_KEV = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const URL_KEV_GITHUB = "https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json"; // cópia oficial da CISA no GitHub
// Ficheiro do dia: endereço atual e o anterior (o teste no Cloud Shell confirma qual responde)
const URLS_EPSS_DIA = ["https://epss.empiricalsecurity.com/epss_scores-current.csv.gz", "https://epss.cyentia.com/epss_scores-current.csv.gz"];
const URL_EUVD = "https://euvdservices.enisa.europa.eu/api";

async function obter(url, { cabecalhos = {}, tentativa = 0, json = true } = {}) {
  const r = await fetch(url, { headers: { "user-agent": AGENTE, accept: "application/json", ...cabecalhos }, redirect: "error", signal: AbortSignal.timeout(TEMPO_MS) });
  if ((r.status === 429 || r.status === 503) && tentativa < 2) {
    const espera = Math.min(30, Number(r.headers.get("retry-after")) || 6 * (tentativa + 1));
    await new Promise((ok) => setTimeout(ok, espera * 1000));
    return obter(url, { cabecalhos, tentativa: tentativa + 1, json });
  }
  if (r.status === 404) return null;
  if (!r.ok) {
    const e = new Error(`${new URL(url).hostname} respondeu ${r.status}`);
    e.estado = r.status;
    throw e;
  }
  return json ? r.json() : r.text();
}

/* ---------- Lista CVE ---------- */
// Registos novos e atualizados depois de «desde» (ISO), do mais antigo para o mais recente
async function deltaCve(desde) {
  const lista = (await obter(URL_DELTA)) || [];
  const entradas = (Array.isArray(lista) ? lista : []).filter((e) => e && e.fetchTime && (!desde || e.fetchTime > desde))
    .sort((a, b) => String(a.fetchTime).localeCompare(String(b.fetchTime)));
  return entradas.map((e) => ({
    fetchTime: e.fetchTime,
    ids: [...(e.new || []), ...(e.updated || [])].map((x) => x && x.cveId).filter((id) => /^CVE-\d{4}-\d{4,7}$/.test(id || "")),
  }));
}
const registoCve = (id) => obter(URL_REGISTO(id));

/* ---------- NVD ----------
 * Registos alterados entre «desde» e «ate» (ISO, intervalo máximo de 120 dias), todas as páginas até «prazo» (ms).
 * Sem chave: 5 pedidos em 30 segundos, por isso há uma pausa de 6,5 s entre páginas.
 * Devolve { registos, total, completo }: «completo» falso quando o prazo acabou antes da última página. */
async function nvdAlterados(desde, ate, chave, prazo = Infinity) {
  const registos = [];
  let total = 0, inicio = 0;
  for (let pagina = 0; pagina < 40; pagina++) {
    const fuso = (d) => String(d).replace(/Z$/, "+00:00"); // o NVD pede a data com o fuso por extenso
    const q = new URLSearchParams({ lastModStartDate: fuso(desde), lastModEndDate: fuso(ate), resultsPerPage: "2000", startIndex: String(inicio) });
    const r = await obter(URL_NVD + "?" + q, { cabecalhos: chave ? { apiKey: chave } : {} });
    if (!r) break;
    total = r.totalResults || 0;
    for (const v of r.vulnerabilities || []) if (v && v.cve) registos.push(v.cve);
    inicio += Number(r.resultsPerPage) || 2000;
    if (inicio >= total) return { registos, total, completo: true };
    if (Date.now() + 15000 > prazo) break;
    if (!chave) await new Promise((ok) => setTimeout(ok, 6500));
  }
  return { registos, total, completo: inicio >= total };
}

/* ---------- KEV ---------- */
async function kev() {
  try { const r = await obter(URL_KEV); if (r && Array.isArray(r.vulnerabilities)) return r; } catch (_) { /* tenta a cópia no GitHub */ }
  return obter(URL_KEV_GITHUB);
}

/* ---------- EPSS ----------
 * Ficheiro completo do dia (CSV comprimido, cerca de 300 000 linhas): as pontuações procuram-se aqui,
 * sem enviar ao FIRST os identificadores das vulnerabilidades dos clientes.
 * Linhas: «#model_version:…,score_date:…», «cve,epss,percentile», «CVE-…,0.00043,0.12…». Devolve { CVE: { epss, percentil, data } } só para «precisos». */
const zlib = require("zlib");
async function epssDia(precisos) {
  let r = null, ultimo = "";
  for (const url of URLS_EPSS_DIA) {
    try { r = await fetch(url, { headers: { "user-agent": AGENTE }, redirect: "follow", signal: AbortSignal.timeout(90000) }); if (r.ok) break; ultimo = new URL(url).hostname + " respondeu " + r.status; r = null; }
    catch (e) { ultimo = e.message; r = null; }
  }
  if (!r) throw new Error("EPSS: " + ultimo);
  const texto = zlib.gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8");
  const out = {};
  let data = "";
  for (const linha of texto.split("\n")) {
    if (linha.startsWith("#")) { const m = /score_date:(\d{4}-\d{2}-\d{2})/.exec(linha); if (m) data = m[1]; continue; }
    const c = linha.split(",");
    if (!precisos.has(c[0])) continue;
    const e = Number(c[1]), p = Number(c[2]);
    if (isFinite(e) && isFinite(p)) out[c[0]] = { epss: e, percentil: p, data };
  }
  return out;
}

/* ---------- EUVD ---------- */
// Vulnerabilidades exploradas mais recentes na EUVD (a resposta traz só as últimas; consulta-se de hora a hora); devolve { CVE: idEUVD }.
// «aliases» é texto com um identificador por linha.
async function euvdExploradas() {
  const r = await obter(URL_EUVD + "/exploitedvulnerabilities");
  const lista = Array.isArray(r) ? r : (r && (r.items || r.content || r.data)) || [];
  const out = {};
  for (const v of lista) {
    const id = String((v && v.id) || "");
    const cve = String((v && v.aliases) || "").split(/[\s,\n]+/).find((a) => /^CVE-\d{4}-\d{4,7}$/.test(a));
    if (cve && /^EUVD-\d{4}-\d+$/.test(id)) out[cve] = id;
  }
  return out;
}

module.exports = { deltaCve, registoCve, nvdAlterados, kev, epssDia, euvdExploradas, URL_REGISTO, obter };
