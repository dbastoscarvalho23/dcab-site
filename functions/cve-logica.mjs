/* Área reservada DCAB — alertas de vulnerabilidades por fabricante (lógica partilhada, sem dependências).
 * Usada no navegador (catálogo, importação da lista de ativos) e nas funções (cópia em functions/cve-logica.mjs,
 * verificada por teste e pelo publicar.sh).
 *
 * Fontes: lista CVE (registos JSON 5 da CVE Program), NVD (NIST), catálogo KEV (CISA), EPSS (FIRST) e EUVD (ENISA).
 * A correspondência usa o fabricante, o produto e, quando o cliente a indica, a versão.
 */

/* ---------- Catálogo de fabricantes ----------
 * id: identificador interno; nome: como aparece ao cliente;
 * cve: nomes do fabricante nos registos CVE (affected[].vendor), já normalizados (ver norm());
 * cpe: nome do fabricante nos CPE do NVD (cpe:2.3:*:FABRICANTE:…);
 * kev: vendorProject no catálogo KEV da CISA (normalizado);
 * produtos: nomes usados pelo cliente → nomes usados nos registos (para «FortiGate» corresponder a «FortiOS», por exemplo).
 * O catálogo pode crescer sem alterar o resto do código.
 */
export const FABRICANTES = [
  { id: "checkpoint", nome: "Check Point", cve: ["check point", "check point software", "check point software technologies", "checkpoint"], cpe: ["checkpoint"], kev: ["check point"],
    produtos: { "Quantum Security Gateway": ["quantum security gateway", "security gateway", "quantum gateway"], "Gaia": ["gaia os", "gaia"], "Remote Access VPN": ["remote access vpn", "mobile access"],
      "Harmony Endpoint": ["harmony endpoint", "endpoint security"], "SmartConsole": [], "Quantum Smart-1": ["smart 1", "security management"], "CloudGuard": [] } },
  { id: "cisco", nome: "Cisco", cve: ["cisco", "cisco systems"], cpe: ["cisco"], kev: ["cisco"],
    produtos: { "ASA": ["adaptive security appliance", "asa software"], "Firepower Threat Defense": ["firepower threat defense", "secure firewall threat defense"], "IOS XE": ["ios xe"], "IOS XR": ["ios xr"], "IOS": ["ios"],
      "NX-OS": ["nx os"], "ISE": ["identity services engine"], "Secure Client (AnyConnect)": ["secure client", "anyconnect"], "Meraki": ["meraki"], "Catalyst Center": ["catalyst center", "dna center"],
      "Unified Communications Manager": ["unified communications manager"], "Webex": [], "Small Business": ["small business"] } },
  { id: "crowdstrike", nome: "CrowdStrike", cve: ["crowdstrike"], cpe: ["crowdstrike"], kev: ["crowdstrike"],
    produtos: { "Falcon Sensor": ["falcon sensor", "falcon"], "Falcon": ["falcon"] } },
  { id: "cubebackup", nome: "CubeBackup", cve: ["cubebackup"], cpe: ["cubebackup"], kev: ["cubebackup"],
    produtos: { "CubeBackup for Google Workspace": ["cubebackup"], "CubeBackup for Microsoft 365": ["cubebackup"] } },
  { id: "dell", nome: "Dell", cve: ["dell", "dell technologies", "dell emc"], cpe: ["dell"], kev: ["dell"],
    produtos: { "iDRAC": ["idrac", "integrated dell remote access controller"], "PowerEdge": ["poweredge"], "PowerScale OneFS": ["powerscale onefs", "onefs"], "PowerStore": [], "PowerProtect Data Domain": ["powerprotect dd", "data domain"],
      "PowerProtect Data Manager": ["powerprotect data manager"], "Unity": ["unity"], "OpenManage": ["openmanage"], "Avamar": [], "NetWorker": [], "SupportAssist": [], "BIOS": ["bios"] } },
  { id: "fortinet", nome: "Fortinet", cve: ["fortinet"], cpe: ["fortinet"], kev: ["fortinet"],
    produtos: { "FortiGate": ["fortios"], "FortiOS": [], "FortiProxy": [], "FortiManager": [], "FortiAnalyzer": [], "FortiWeb": [], "FortiClient": ["forticlient"], "FortiClient EMS": ["forticlientems", "forticlient ems"],
      "FortiSIEM": [], "FortiSwitch": [], "FortiAP": [], "FortiMail": [], "FortiSandbox": [], "FortiNAC": [], "FortiVoice": [], "FortiADC": [], "FortiAuthenticator": [], "FortiSwitchManager": [] } },
  { id: "fujitsu", nome: "Fujitsu (inclui Fsas Technologies)", cve: ["fujitsu", "fujitsu fsas technologies", "fsas technologies"], cpe: ["fujitsu", "fsas technologies"], kev: ["fujitsu"],
    produtos: { "PRIMERGY": ["primergy"], "iRMC": ["irmc"], "ETERNUS": ["eternus"] } },
  { id: "hpe", nome: "HPE (inclui Aruba)", cve: ["hewlett packard enterprise", "hewlett packard enterprise hpe", "hpe", "hpe aruba networking", "aruba networks", "aruba"], cpe: ["hpe", "arubanetworks"],
    cpeRestrito: { hp: ["integrated lights out", "ilo", "oneview", "proliant", "storeonce", "3par", "nimble", "alletra", "primera", "arubaos", "clearpass", "superdome", "synergy", "apollo"] }, kev: ["hewlett packard enterprise hpe", "hewlett packard enterprise", "hpe", "aruba networks", "aruba"],
    produtos: { "iLO": ["integrated lights out", "ilo"], "OneView": [], "ProLiant": ["proliant"], "ArubaOS": ["arubaos", "aruba os"], "AOS-CX": ["aos cx", "arubaos cx"], "ClearPass": ["clearpass policy manager", "clearpass"], "Aruba Instant On": ["instant on"],
      "Nimble Storage": ["nimble"], "Alletra": ["alletra"], "Primera": ["primera"], "3PAR": ["3par"], "StoreOnce": [], "Compute Ops Management": [] } },
  { id: "lenovo", nome: "Lenovo", cve: ["lenovo"], cpe: ["lenovo"], kev: ["lenovo"],
    produtos: { "XClarity Controller": ["xclarity controller", "xcc"], "XClarity Administrator": ["xclarity administrator", "lxca"], "ThinkSystem": [], "ThinkPad": [], "ThinkCentre": [], "ThinkStation": [], "Vantage": ["lenovo vantage"], "BIOS": ["bios"] } },
  { id: "netapp", nome: "NetApp", cve: ["netapp"], cpe: ["netapp"], kev: ["netapp"],
    produtos: { "ONTAP": ["ontap"], "StorageGRID": [], "SnapCenter": [], "Active IQ Unified Manager": ["active iq unified manager"], "SANtricity": [], "BlueXP": [] } },
  { id: "netskope", nome: "Netskope", cve: ["netskope"], cpe: ["netskope"], kev: ["netskope"],
    produtos: { "Netskope Client": [], "Netskope Private Access": ["private access"] } },
  { id: "paloalto", nome: "Palo Alto Networks", cve: ["palo alto networks", "paloaltonetworks", "palo alto"], cpe: ["paloaltonetworks"], kev: ["palo alto networks"],
    produtos: { "PAN-OS": ["pan os"], "Firewall": ["pan os"], "Panorama": ["pan os"], "GlobalProtect": ["globalprotect"], "Prisma Access": [], "Cortex XDR": ["cortex xdr"], "Expedition": [] } },
  { id: "purestorage", nome: "Pure Storage", cve: ["purestorage", "pure storage"], cpe: ["purestorage"], kev: ["pure storage"],
    produtos: { "FlashArray (Purity//FA)": ["purity fa", "flasharray"], "FlashBlade (Purity//FB)": ["purity fb", "flashblade"], "Portworx": [] } },
  { id: "splunk", nome: "Splunk", cve: ["splunk"], cpe: ["splunk"], kev: ["splunk"],
    produtos: { "Splunk Enterprise": [], "Splunk Cloud Platform": [], "Universal Forwarder": ["universal forwarder"], "Splunk SOAR": [], "Enterprise Security": ["enterprise security"] } },
  { id: "veeam", nome: "Veeam", cve: ["veeam", "veeam software"], cpe: ["veeam"], kev: ["veeam"],
    produtos: { "Backup & Replication": ["backup replication"], "Veeam ONE": ["veeam one"], "Service Provider Console": ["service provider console"], "Agent for Windows": ["agent for microsoft windows", "agent for windows"],
      "Backup for Microsoft 365": ["backup for microsoft 365"], "Recovery Orchestrator": [] } },
  { id: "zscaler", nome: "Zscaler", cve: ["zscaler"], cpe: ["zscaler"], kev: ["zscaler"],
    produtos: { "Client Connector": ["client connector"], "Private Access (ZPA)": ["private access", "app connector"], "Internet Access (ZIA)": ["internet access"] } },
];

const PORID = () => Object.fromEntries(FABRICANTES.map((f) => [f.id, f]));
export const fabricante = (id) => PORID()[id] || null;

/* ---------- Normalização ---------- */
const SUFIXOS = new Set(["inc", "incorporated", "ltd", "limited", "llc", "corp", "corporation", "co", "company", "gmbh", "sa", "ag", "plc", "bv", "nv", "srl", "sro", "kk"]);
export function norm(v) {
  return String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((p) => p && !SUFIXOS.has(p)).join(" ");
}
const contemFrase = (texto, frase) => !!frase && (" " + texto + " ").includes(" " + frase + " ");

// Fabricante do catálogo a que corresponde um nome visto numa fonte (ou null).
// cpeRestrito: nomes de CPE partilhados com outra empresa (por exemplo «hp», da HP Inc. e da HPE), aceites só com estes produtos.
export function fabricanteDe(nome, tipo = "cve", produto = "") {
  const n = norm(nome);
  if (!n || n === "n a") return null;
  for (const f of FABRICANTES) {
    const lista = tipo === "cpe" ? f.cpe : tipo === "kev" ? f.kev : f.cve;
    if ((lista || []).some((x) => x === n)) return f.id;
    const restrito = tipo === "cpe" && f.cpeRestrito && f.cpeRestrito[n];
    if (restrito && restrito.some((p) => contemFrase(norm(produto), p))) return f.id;
  }
  return null;
}

/* ---------- Produtos ----------
 * O produto do cliente corresponde ao da fonte quando um contém o outro como frase completa
 * («FortiOS» em «FortiOS, FortiProxy»), diretamente ou por um nome alternativo do catálogo.
 * Regra da especificidade: «IOS» não corresponde a «IOS XE» nem a «IOS XR», porque esses são outros produtos do catálogo;
 * «FortiClient EMS» não corresponde a «FortiClient». */
function produtosCatalogo(idFab) {
  const f = fabricante(idFab);
  return Object.entries((f && f.produtos) || {}).map(([chave, alias]) => ({ chave: norm(chave), nomes: [...new Set([norm(chave), ...alias.map(norm)])] }));
}
// Entrada do catálogo do produto do cliente: a de nome igual; senão, a de nome mais longo contido no do cliente («FortiGate 60F» → FortiGate)
function entradaDe(idFab, n) {
  const cat = produtosCatalogo(idFab);
  return cat.find((e) => e.chave === n) || cat.filter((e) => contemFrase(n, e.chave)).sort((a, b) => b.chave.length - a.chave.length)[0] || null;
}
export function nomesProduto(idFab, produto) {
  const n = norm(produto);
  if (!n) return [];
  const e = entradaDe(idFab, n);
  return [...new Set([n, ...(e ? e.nomes : [])])];
}
export function produtoCorresponde(idFab, produtoCliente, produtoFonte) {
  const fonte = norm(produtoFonte);
  if (!fonte || fonte === "n a") return false;
  const n = norm(produtoCliente);
  const meus = nomesProduto(idFab, produtoCliente);
  const casou = meus.filter((p) => fonte === p || contemFrase(fonte, p) || (fonte.length >= 4 && contemFrase(p, fonte)));
  if (!casou.length) return false;
  if (meus.includes(fonte)) return true;
  const propria = entradaDe(idFab, n);
  for (const e of produtosCatalogo(idFab)) {
    if (propria && e.chave === propria.chave) continue;
    if (e.nomes.some((q) => meus.includes(q))) continue; // nome partilhado com o produto do cliente (por exemplo «falcon»)
    for (const q of e.nomes) {
      // A fonte é outro produto do catálogo, mais específico do que o do cliente
      if ((fonte === q || contemFrase(fonte, q)) && casou.some((p) => q !== p && contemFrase(q, p)) && !contemFrase(n, q)) return false;
      // A fonte é exatamente outro produto do catálogo (o do cliente contém-no, mas é outro: «FortiClient EMS» e «FortiClient»)
      if (fonte === q && !casou.includes(fonte)) return false;
    }
  }
  if (!casou.some((p) => fonte === p || contemFrase(fonte, p))) {
    // Só o inverso (o nome da fonte contido no do cliente): aceite se a fonte não for outro produto do catálogo
    if (produtosCatalogo(idFab).some((e) => e.nomes.includes(fonte) && !(propria && e.chave === propria.chave))) return false;
  }
  return true;
}

/* ---------- Versões ----------
 * Compara versões por partes numéricas e de letras: 7.4.10 > 7.4.3; 17.9(4) < 17.12(1); 10.2.3-h4 > 10.2.3;
 * 7.4 = 7.4.0; 2.0.0-rc1 < 2.0.0. Ignora o que vem antes do primeiro algarismo («v7.4.3», «FortiOS 7.4.2»). */
export const limparVersao = (v) => { const t = String(v ?? "").trim(); const i = t.search(/\d/); return i < 0 ? "" : t.slice(i); };
const PRE = new Set(["alpha", "a", "beta", "b", "rc", "pre", "preview", "dev", "snapshot", "m"]);
function partes(v) {
  const p = limparVersao(v).toLowerCase().split(/[^0-9a-z]+/).filter(Boolean).flatMap((x) => x.match(/\d+|[a-z]+/g) || []);
  return p;
}
export function compararVersoes(a, b) {
  const x = partes(a), y = partes(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    // Parte numérica em falta vale 0 (7.4 = 7.4.0); antes de uma pré-versão é maior (2.0.0 > 2.0.0-rc1); antes de outra letra é menor (10.2.3 < 10.2.3-h4)
    if (x[i] === undefined || y[i] === undefined) {
      const outra = x[i] === undefined ? y[i] : x[i], sinal = x[i] === undefined ? 1 : -1;
      if (/^\d+$/.test(outra)) { if (Number(outra) === 0) continue; return -sinal; }
      return PRE.has(outra) ? sinal : -sinal;
    }
    const nx = /^\d+$/.test(x[i]), ny = /^\d+$/.test(y[i]);
    if (nx && ny) { const d = Number(x[i]) - Number(y[i]); if (d) return d < 0 ? -1 : 1; continue; }
    if (nx !== ny) return nx ? 1 : -1; // 10.2.3.1 > 10.2.3-h1
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}
const versaoUtil = (v) => typeof v === "string" && /\d/.test(v) && v.length <= 60;
const semVersao = (v) => !v || v === "*" || v === "-" || v === "n/a" || v === "0" || /^unspecified$/i.test(v);
// Prefixo antes de «*»: «7.4.*» → ["7","4"]; compara parte a parte (7.40.1 não está em 7.4.*)
const temPrefixo = (v, prefixo) => { const a = partes(v), p = partes(prefixo); return p.length > 0 && p.every((x, i) => a[i] === x); };

/* Avalia uma versão do cliente contra o bloco versions de um registo CVE 5.
 * Devolve "afetada", "nao-afetada" ou "indeterminada" (sem dados ou formato que não se consegue comparar). */
export function avaliarVersao(versaoCliente, versoes, defaultStatus) {
  const v = limparVersao(versaoCliente);
  if (!v || !versaoUtil(v)) return "indeterminada";
  const lista = Array.isArray(versoes) ? versoes : [];
  if (!lista.length) return defaultStatus === "affected" ? "afetada" : "indeterminada";
  let comparavel = false;
  for (const e of lista) {
    if (!e || typeof e !== "object") continue;
    const estado = e.status || "affected";
    const ini = e.version, ate = e.lessThan, ateIncl = e.lessThanOrEqual;
    const acimaDe = () => semVersao(ini) || (versaoUtil(ini) && (e.inicioExcluido ? compararVersoes(v, ini) > 0 : compararVersoes(v, ini) >= 0));
    let dentro = null;
    if (ate || ateIncl) {
      const limite = ate || ateIncl;
      if (limite === "*") dentro = acimaDe();
      else if (!versaoUtil(limite)) continue;
      else if (!semVersao(ini) && !versaoUtil(ini)) continue;
      else {
        // Um limite «7.4.*» vale como «até ao fim da 7.4»
        const prefixo = /\*$/.test(limite) ? limite.replace(/[.\-]?\*$/, "") : null;
        const abaixo = prefixo ? (compararVersoes(v, prefixo) <= 0 || temPrefixo(v, prefixo))
          : ate ? compararVersoes(v, ate) < 0 : compararVersoes(v, ateIncl) <= 0;
        dentro = acimaDe() && abaixo;
      }
    } else if (versaoUtil(ini)) {
      if (/\*$/.test(ini)) dentro = temPrefixo(v, ini.replace(/[.\-]?\*$/, ""));
      else dentro = compararVersoes(v, ini) === 0;
    } else continue;
    comparavel = true;
    if (dentro && estado === "affected") return "afetada";
    if (dentro && estado === "unaffected") return "nao-afetada";
  }
  if (!comparavel) return "indeterminada";
  return defaultStatus === "affected" ? "afetada" : "nao-afetada";
}
// Uma entrada afetados[] indica algum produto afetado (e não só versões corrigidas)?
const indicaAfetado = (a) => a.defaultStatus === "affected" || !(a.versoes || []).length || (a.versoes || []).some((v) => (v.status || "affected") !== "unaffected");

/* ---------- Correspondência entre um registo e os ativos do cliente ----------
 * registo: { cve, afetados: [{ fabricante, produto, versoes, defaultStatus }], cpes: [{ fabricante, produto, inicio, inicioExcl, fim, fimIncl, versao }], kev: { fabricante, produto } }
 * ativo:   { id, fabricante (id do catálogo), produto ("" = todos os produtos), versao ("" = qualquer) }
 * Devolve [{ ativo, fabricante, nivel: "versao" | "produto" | "fabricante", produto }] — só os ativos afetados ou possivelmente afetados. */
export function correspondencias(registo, ativos) {
  const out = [];
  const afetados = (registo.afetados || []).map((a) => ({ ...a, fab: fabricanteDe(a.fabricante, "cve") }));
  const cpes = (registo.cpes || []).map((c) => ({ ...c, fab: fabricanteDe(c.fabricante, "cpe", c.produto.replace(/_/g, " ")) }));
  const kev = registo.kev && registo.kev.fabricante ? { ...registo.kev, fab: fabricanteDe(registo.kev.fabricante, "kev") } : null;
  for (const at of ativos || []) {
    if (!at || !at.fabricante) continue;
    let melhor = null;
    const guardar = (nivel, produto) => {
      const ordem = { versao: 3, produto: 2, fabricante: 1 };
      if (!melhor || ordem[nivel] > ordem[melhor.nivel]) melhor = { ativo: at.id, fabricante: at.fabricante, nivel, produto: String(produto || "").slice(0, 120) };
    };
    const versao = limparVersao(at.versao);
    let excluido = false;
    // 1. Registo CVE 5 (o mais completo: fabricante, produto e versões da própria fonte)
    for (const a of afetados) {
      if (a.fab !== at.fabricante) continue;
      if (!at.produto) { if (indicaAfetado(a)) guardar("fabricante", a.produto); continue; }
      if (!produtoCorresponde(at.fabricante, at.produto, a.produto)) continue;
      const r = avaliarVersao(versao, a.versoes, a.defaultStatus);
      if (r === "afetada" && versao) guardar("versao", a.produto);
      else if (r === "nao-afetada") excluido = true;
      else if (indicaAfetado(a)) guardar("produto", a.produto);
    }
    // 2. CPE do NVD (quando o registo foi analisado pelo NIST)
    for (const c of cpes) {
      if (c.fab !== at.fabricante) continue;
      if (!at.produto) { guardar("fabricante", c.produto); continue; }
      if (!produtoCorresponde(at.fabricante, at.produto, c.produto.replace(/_/g, " "))) continue;
      const versoes = [];
      if (c.versao && !semVersao(c.versao)) versoes.push({ version: c.versao, status: "affected" });
      else if (c.inicio || c.fim || c.fimIncl) versoes.push({ version: c.inicio || "0", inicioExcluido: !!c.inicioExcl, ...(c.fimIncl ? { lessThanOrEqual: c.fimIncl } : c.fim ? { lessThan: c.fim } : { lessThan: "*" }), status: "affected" });
      const r = versoes.length ? avaliarVersao(versao, versoes, "unaffected") : "indeterminada";
      if (r === "afetada" && versao) guardar("versao", c.produto);
      else if (r === "indeterminada") guardar("produto", c.produto);
      else if (r === "nao-afetada" && !afetados.some((a) => a.fab === at.fabricante)) excluido = true;
    }
    // 3. KEV (fabricante e produto da CISA, sem versões)
    if (kev && kev.fab === at.fabricante) {
      if (!at.produto) guardar("fabricante", kev.produto);
      else if (produtoCorresponde(at.fabricante, at.produto, kev.produto)) guardar("produto", kev.produto);
    }
    // Uma versão do cliente fora de todos os intervalos afetados exclui a correspondência por produto
    if (melhor && excluido && melhor.nivel === "produto" && versao) continue;
    if (melhor) out.push(melhor);
  }
  return out;
}

/* ---------- Prioridade ----------
 * imediato: explorada (KEV ou EUVD), ou CVSS ≥ 9,0 com EPSS no percentil 90 ou acima
 *           (com a preferência «críticas de imediato», basta CVSS ≥ 9,0);
 * diario:   CVSS ≥ 7,0;
 * registo:  as restantes (só na área reservada). */
export const PRIORIDADES = { imediato: "Email imediato", diario: "Resumo diário", registo: "Só na área reservada" };
export function prioridade(r, prefs = {}) {
  const cvss = typeof r.cvss === "number" ? r.cvss : null;
  const pct = r.epss && typeof r.epss.percentil === "number" ? r.epss.percentil : null;
  if (r.kev || (r.euvd && r.euvd.explorada)) return "imediato";
  if (cvss !== null && cvss >= 9 && (prefs.imediatoCriticas === true || (pct !== null && pct >= 0.9))) return "imediato";
  if (cvss !== null && cvss >= 7) return "diario";
  return "registo";
}
export const ORDEM_PRIORIDADE = ["registo", "diario", "imediato"];
export const subiu = (antes, depois) => ORDEM_PRIORIDADE.indexOf(depois) > ORDEM_PRIORIDADE.indexOf(antes);

export function gravidade(cvss) {
  if (typeof cvss !== "number") return "Sem pontuação";
  return cvss >= 9 ? "Crítica" : cvss >= 7 ? "Alta" : cvss >= 4 ? "Média" : cvss > 0 ? "Baixa" : "Nenhuma";
}

export const ESTADOS = ["Novo", "Em análise", "Corrigido", "Mitigado", "Não afetado", "Risco aceite"];
export const abertoCve = (a) => a.estado === "Novo" || a.estado === "Em análise";
export const NIVEIS = { versao: "Versão afetada", produto: "Produto (confirmar a versão)", fabricante: "Fabricante" };

/* ---------- Lista de ativos (CSV) ----------
 * Colunas: fabricante; produto; versão; designação — separador «;» ou «,», cabeçalho opcional.
 * O fabricante aceita o nome do catálogo ou o identificador. Devolve { ativos, erros }. */
export function lerListaAtivos(texto, max = 500) {
  const linhas = String(texto || "").replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const ativos = [], erros = [];
  linhas.forEach((l, i) => {
    const sep = l.includes(";") ? ";" : ",";
    const c = l.split(sep).map((x) => x.trim().replace(/^"(.*)"$/, "$1").trim());
    if (i === 0 && /^fabricante$/i.test(norm(c[0]))) return;
    const f = FABRICANTES.find((x) => x.id === norm(c[0]).replace(/ /g, "-") || norm(x.nome) === norm(c[0]) || (x.cve || []).includes(norm(c[0])));
    if (!f) { erros.push(`Linha ${i + 1}: fabricante «${String(c[0]).slice(0, 40)}» fora do catálogo`); return; }
    const versao = limparVersao(c[2] || "").slice(0, 40);
    if ((c[2] || "").trim() && !versao) { erros.push(`Linha ${i + 1}: versão «${versao}» sem números`); return; }
    ativos.push({ fabricante: f.id, produto: (c[1] || "").slice(0, 80), versao, designacao: (c[3] || "").slice(0, 80) });
  });
  if (ativos.length > max) { erros.push(`Só são aceites ${max} linhas; as restantes foram ignoradas.`); ativos.length = max; }
  return { ativos, erros };
}

// Chave de um ativo, para não repetir o mesmo fabricante/produto/versão
export const chaveAtivo = (a) => [a.fabricante, norm(a.produto), limparVersao(a.versao).toLowerCase()].join("|");
