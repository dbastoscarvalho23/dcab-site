/* Testes dos alertas de vulnerabilidades (sem rede). Executar na pasta functions: node --test */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as C from "../cve-logica.mjs";
import * as S from "../cve-servidor.mjs";

test("a cópia da lógica nas funções é igual à da área reservada", () => {
  const a = readFileSync(new URL("../cve-logica.mjs", import.meta.url));
  const b = readFileSync(new URL("../../public/reservado/cve.js", import.meta.url));
  assert.ok(a.equals(b), "copie public/reservado/cve.js para functions/cve-logica.mjs");
});

test("catálogo: 16 fabricantes, identificadores únicos e nomes já normalizados", () => {
  assert.equal(C.FABRICANTES.length, 16);
  assert.equal(new Set(C.FABRICANTES.map((f) => f.id)).size, 16);
  for (const f of C.FABRICANTES) for (const x of [...f.cve, ...f.cpe, ...f.kev]) assert.equal(C.norm(x), x, f.id + ": " + x);
  // Nenhum nome de fabricante pertence a dois fabricantes
  const vistos = {};
  for (const f of C.FABRICANTES) for (const x of f.cve) { assert.ok(!vistos[x], x + " em " + vistos[x] + " e " + f.id); vistos[x] = f.id; }
});

test("normalização e fabricante", () => {
  assert.equal(C.norm("Check Point Software Technologies Ltd."), "check point software technologies");
  assert.equal(C.fabricanteDe("Fortinet, Inc."), "fortinet");
  assert.equal(C.fabricanteDe("Palo Alto Networks"), "paloalto");
  assert.equal(C.fabricanteDe("paloaltonetworks", "cpe"), "paloalto");
  assert.equal(C.fabricanteDe("Hewlett Packard Enterprise (HPE)"), "hpe");
  assert.equal(C.fabricanteDe("n/a"), null);
  assert.equal(C.fabricanteDe("Microsoft"), null);
});

test("produtos: nomes alternativos e frases completas", () => {
  assert.ok(C.produtoCorresponde("fortinet", "FortiGate 60F", "FortiOS"));
  assert.ok(C.produtoCorresponde("fortinet", "FortiOS", "FortiOS, FortiProxy"));
  // Conservador: «FortiOS-6K7K» contém «FortiOS» e conta como correspondência por produto (melhor um alerta a mais do que um a menos)
  assert.ok(C.produtoCorresponde("fortinet", "FortiOS", "FortiOS-6K7K"));
  assert.ok(C.produtoCorresponde("paloalto", "Firewall", "PAN-OS"));
  assert.ok(C.produtoCorresponde("veeam", "Backup & Replication", "Veeam Backup & Replication"));
  assert.ok(!C.produtoCorresponde("veeam", "Veeam ONE", "Veeam Backup & Replication"));
  assert.ok(!C.produtoCorresponde("fortinet", "FortiWeb", "FortiOS"));
  assert.ok(!C.produtoCorresponde("cisco", "ASA", "n/a"));
});

test("versões: comparação e intervalos do registo CVE 5", () => {
  assert.equal(C.compararVersoes("7.4.10", "7.4.3"), 1);
  assert.equal(C.compararVersoes("17.9(4)", "17.12(1)"), -1);
  assert.equal(C.compararVersoes("10.2.3-h4", "10.2.3"), 1);
  assert.equal(C.compararVersoes("7.4", "7.4.0"), 0);
  const fortios = [{ version: "7.4.0", lessThanOrEqual: "7.4.2", status: "affected", versionType: "semver" }, { version: "7.2.0", lessThanOrEqual: "7.2.6", status: "affected" }];
  assert.equal(C.avaliarVersao("7.4.1", fortios, "unaffected"), "afetada");
  assert.equal(C.avaliarVersao("7.4.3", fortios, "unaffected"), "nao-afetada");
  assert.equal(C.avaliarVersao("7.0.12", fortios, "unaffected"), "nao-afetada");
  assert.equal(C.avaliarVersao("", fortios, "unaffected"), "indeterminada");
  // Palo Alto: «versão afetada abaixo de» com hotfix
  const panos = [{ version: "10.2", lessThan: "10.2.9-h1", status: "affected", versionType: "custom" }, { version: "11.0", lessThan: "11.0.4-h1", status: "affected" }];
  assert.equal(C.avaliarVersao("10.2.8", panos, "unaffected"), "afetada");
  assert.equal(C.avaliarVersao("10.2.9-h1", panos, "unaffected"), "nao-afetada");
  assert.equal(C.avaliarVersao("11.1.2", panos, "unaffected"), "nao-afetada");
  // Limite com asterisco e lista sem intervalos comparáveis
  assert.equal(C.avaliarVersao("7.4.5", [{ version: "7.4.0", lessThan: "7.4.*", status: "affected" }], "unaffected"), "afetada");
  assert.equal(C.avaliarVersao("7.6.0", [{ version: "7.4.0", lessThan: "7.4.*", status: "affected" }], "unaffected"), "nao-afetada");
  assert.equal(C.avaliarVersao("7.4.1", [{ version: "n/a", status: "affected" }], "unaffected"), "indeterminada");
  assert.equal(C.avaliarVersao("12.1.2", [{ version: "0", lessThan: "*", status: "affected" }], "unaffected"), "afetada");
});

const registoFortios = {
  cve: "CVE-2026-11111", cvss: 9.8,
  afetados: [{ fabricante: "Fortinet", produto: "FortiOS", defaultStatus: "unaffected", versoes: [{ version: "7.4.0", lessThanOrEqual: "7.4.2", status: "affected" }] }],
  cpes: [],
};
const ativos = [
  { id: "a1", fabricante: "fortinet", produto: "FortiGate", versao: "7.4.1" },
  { id: "a2", fabricante: "fortinet", produto: "FortiGate", versao: "7.4.5" },
  { id: "a3", fabricante: "fortinet", produto: "", versao: "" },
  { id: "a4", fabricante: "fortinet", produto: "FortiWeb", versao: "" },
  { id: "a5", fabricante: "veeam", produto: "", versao: "" },
  { id: "a6", fabricante: "fortinet", produto: "FortiOS", versao: "" },
];

test("correspondência: versão afetada, versão corrigida, fabricante inteiro, produto sem versão", () => {
  const r = C.correspondencias(registoFortios, ativos);
  const por = Object.fromEntries(r.map((x) => [x.ativo, x.nivel]));
  assert.equal(por.a1, "versao");
  assert.equal(por.a2, undefined, "7.4.5 está corrigida");
  assert.equal(por.a3, "fabricante");
  assert.equal(por.a4, undefined, "outro produto");
  assert.equal(por.a5, undefined, "outro fabricante");
  assert.equal(por.a6, "produto");
});

test("correspondência pelo CPE do NVD e pelo KEV quando a CNA não indica o fabricante", () => {
  const nvd = { cve: "CVE-2026-22222", afetados: [{ fabricante: "n/a", produto: "n/a", versoes: [] }],
    cpes: [{ fabricante: "paloaltonetworks", produto: "pan-os", inicio: "10.2.0", fim: "10.2.9" }] };
  const at = [{ id: "p1", fabricante: "paloalto", produto: "PAN-OS", versao: "10.2.4" }, { id: "p2", fabricante: "paloalto", produto: "PAN-OS", versao: "11.1.0" }];
  const r = C.correspondencias(nvd, at);
  assert.deepEqual(r.map((x) => [x.ativo, x.nivel]), [["p1", "versao"]]);
  const kev = { cve: "CVE-2026-33333", afetados: [], cpes: [], kev: { fabricante: "Veeam", produto: "Backup & Replication" } };
  assert.deepEqual(C.correspondencias(kev, [{ id: "v1", fabricante: "veeam", produto: "Backup & Replication", versao: "12.1" }]).map((x) => x.nivel), ["produto"]);
});

test("prioridade: explorada ou crítica com EPSS alto → imediato; CVSS ≥ 7 → diário", () => {
  assert.equal(C.prioridade({ cvss: 5, kev: true }), "imediato");
  assert.equal(C.prioridade({ cvss: 6, euvd: { explorada: true } }), "imediato");
  assert.equal(C.prioridade({ cvss: 9.8, epss: { percentil: 0.95 } }), "imediato");
  assert.equal(C.prioridade({ cvss: 9.8 }), "diario", "sem EPSS ainda: resumo diário");
  assert.equal(C.prioridade({ cvss: 9.8 }, { imediatoCriticas: true }), "imediato");
  assert.equal(C.prioridade({ cvss: 7.5 }), "diario");
  assert.equal(C.prioridade({ cvss: 6.9 }), "registo");
  assert.equal(C.prioridade({ cvss: null }), "registo");
});

test("lista de ativos (CSV): cabeçalho, separadores, fabricantes fora do catálogo", () => {
  const r = C.lerListaAtivos("fabricante;produto;versão;designação\nFortinet;FortiOS;7.4.3;Firewall sede\nPalo Alto Networks,PAN-OS,10.2.4,\nMicrosoft;Windows;11;\nveeam;;;\nDell;iDRAC;sem versão;");
  assert.equal(r.ativos.length, 3);
  assert.deepEqual(r.ativos[0], { fabricante: "fortinet", produto: "FortiOS", versao: "7.4.3", designacao: "Firewall sede" });
  assert.equal(r.ativos[1].fabricante, "paloalto");
  assert.equal(r.ativos[2].fabricante, "veeam");
  assert.equal(r.erros.length, 2);
  assert.match(r.erros[0], /Microsoft/);
});

const cve5 = {
  dataType: "CVE_RECORD", dataVersion: "5.1",
  cveMetadata: { cveId: "CVE-2026-11111", state: "PUBLISHED", datePublished: "2026-10-21T10:00:00.000Z", dateUpdated: "2026-10-21T12:00:00.000Z" },
  containers: {
    cna: {
      descriptions: [{ lang: "en", value: "A heap-based buffer overflow in FortiOS SSL-VPN allows remote code execution." }],
      affected: [{ vendor: "Fortinet", product: "FortiOS", defaultStatus: "unaffected", versions: [{ version: "7.4.0", lessThanOrEqual: "7.4.2", status: "affected", versionType: "semver" }] }],
      metrics: [{ format: "CVSS", cvssV3_1: { baseScore: 9.8, vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" } }],
      references: [{ url: "https://fortiguard.fortinet.com/psirt/FG-IR-26-001", tags: ["vendor-advisory"] }],
    },
    adp: [{ providerMetadata: { shortName: "CISA-ADP" }, metrics: [{ cvssV3_1: { baseScore: 9.1 } }] }],
  },
};

test("registo CVE 5 e NVD normalizados e juntos", () => {
  const r = S.deCve5(cve5);
  assert.equal(r.cve, "CVE-2026-11111");
  assert.equal(r.cvss, 9.8, "a pontuação da CNA tem precedência sobre a do ADP");
  assert.equal(r.afetados[0].fabricante, "Fortinet");
  assert.equal(r.aviso, "https://fortiguard.fortinet.com/psirt/FG-IR-26-001");
  const n = S.deNvd({ id: "CVE-2026-11111", vulnStatus: "Analyzed", published: "2026-10-21T10:15:00.000", lastModified: "2026-10-22T08:00:00.000",
    descriptions: [{ lang: "en", value: "x" }], metrics: { cvssMetricV31: [{ type: "Primary", cvssData: { baseScore: 9.6, vectorString: "CVSS:3.1/AV:N" } }] },
    configurations: [{ nodes: [{ cpeMatch: [{ vulnerable: true, criteria: "cpe:2.3:o:fortinet:fortios:*:*:*:*:*:*:*:*", versionStartIncluding: "7.4.0", versionEndExcluding: "7.4.3" }, { vulnerable: false, criteria: "cpe:2.3:h:fortinet:fortigate:-:*:*:*:*:*:*:*" }] }] }],
    cisaExploitAdd: "2026-10-22" });
  assert.equal(n.cpes.length, 1);
  const j = S.juntar(r, n);
  assert.equal(j.cvss, 9.6, "o CVSS do NIST tem precedência quando existe");
  assert.equal(j.afetados.length, 1);
  assert.equal(j.kevNvd.desde, "2026-10-22");
  assert.equal(S.deCve5({ cveMetadata: { cveId: "não é CVE" } }), null);
});

test("alerta: um por CVE, aviso conforme preferências; histórico sem aviso", () => {
  const r = S.deCve5(cve5);
  const corr = C.correspondencias(r, ativos);
  const agora = Date.parse("2026-10-22T10:00:00Z");
  const a = S.construirAlerta(r, corr, {}, { kev: null, euvd: null, epss: null }, agora);
  assert.equal(a.fabricante, "fortinet");
  assert.equal(a.nivel, "versao");
  assert.deepEqual(a.ativos.sort(), ["a1", "a3", "a6"]);
  assert.equal(a.prioridade, "diario");
  assert.equal(a.avisoPendente, "diario");
  assert.equal(a.estado, "Novo");
  assert.ok(a.expira instanceof Date);
  const k = S.construirAlerta(r, corr, { emailImediato: false }, { kev: ["2026-10-22", "Fortinet", "FortiOS", 1], euvd: null, epss: null }, agora);
  assert.equal(k.prioridade, "imediato");
  assert.equal(k.avisoPendente, "diario", "sem email imediato, vai no resumo");
  assert.equal(k.ransomware, true);
  const h = S.construirAlerta(r, corr, {}, { kev: ["2025-01-10", "Fortinet", "FortiOS", 0] }, agora, { historico: true });
  assert.equal(h.avisoPendente, "");
  assert.equal(S.pendente("diario", { resumoDiario: false }), "");
});

test("atualização: entra no KEV → sobe a imediato e volta a avisar; não mexe no estado nem apaga a exploração", () => {
  const antes = { cve: "CVE-2026-11111", prioridade: "diario", cvss: 9.8, kev: false, explorada: false, estado: "Em análise", ativos: ["a1"], produtos: ["FortiOS"], nivel: "versao", avisoPendente: "" };
  const novo = { kev: true, explorada: true, kevDesde: "2026-10-23", ativos: ["a1"], produtos: ["FortiOS"] };
  const c = S.atualizarAlerta(antes, novo, {});
  assert.equal(c.prioridade, "imediato");
  assert.equal(c.avisoPendente, "imediato");
  assert.equal(c.estado, undefined);
  assert.equal(S.atualizarAlerta({ ...antes, ...c }, { kev: false, explorada: false, ativos: ["a1"], produtos: ["FortiOS"] }, {}), null);
  // Alerta já corrigido: um EPSS mais alto não volta a avisar; passar a explorada volta
  const fechado = { ...antes, estado: "Corrigido" };
  const e = S.atualizarAlerta(fechado, { epssPercentil: 0.97, ativos: ["a1"] }, {});
  assert.equal(e.prioridade, "imediato");
  assert.equal(e.avisoPendente, undefined);
  assert.equal(S.atualizarAlerta(fechado, { kev: true, explorada: true, ativos: ["a1"] }, {}).avisoPendente, "imediato");
});

test("emails: imediato por CVE, resumo diário a partir das 8 horas, produto omitido a pedido", () => {
  const al = (cve, cvss, extra = {}) => ({ cve, cvss, fabricante: "fortinet", produtos: ["FortiOS"], nivel: "versao", prioridade: "diario", ...extra });
  const entrada = [{ cliente: "camara", clienteNome: "Câmara", prefs: { omitirProduto: true }, para: ["ana@cliente.pt"], cc: ["daniel.carvalho@dcabconsulting.com"],
    imediatos: [al("CVE-2026-1001", 9.8, { kev: true, explorada: true, prioridade: "imediato" })], diarios: [al("CVE-2026-1002", 7.5), al("CVE-2026-1003", 8.8)], resumoEm: "" }];
  const manha = Date.parse("2026-10-22T06:30:00Z"); // 7:30 em Lisboa (verão)
  let a = S.acoesCve(entrada, manha);
  assert.equal(a.length, 1);
  assert.equal(a[0].tipo, "cve-imediato");
  assert.match(a[0].assunto, /CVE-2026-1001 · Fortinet · explorada ativamente/);
  assert.ok(!a[0].linhas.join("\n").includes("FortiOS"), "produto omitido");
  a = S.acoesCve(entrada, Date.parse("2026-10-22T08:30:00Z"));
  const r = a.find((x) => x.tipo === "cve-resumo");
  assert.ok(r);
  assert.deepEqual(r.cves, ["CVE-2026-1002", "CVE-2026-1003"]);
  assert.match(r.linhas.join("\n"), /CVE-2026-1003.*\n.*CVE-2026-1002/, "ordenado pela gravidade");
  assert.equal(S.acoesCve([{ ...entrada[0], resumoEm: "2026-10-22", imediatos: [] }], Date.parse("2026-10-22T08:30:00Z")).length, 0);
  // Resultado: limpa o aviso e regista o dia do resumo
  const res = S.resultadoCve(r, { ok: true }, Date.now());
  assert.equal(res.filter((x) => x.alvo === "cve").length, 2);
  assert.deepEqual(res.find((x) => x.alvo === "cliente").campos, { cveResumoEm: "2026-10-22" });
  assert.deepEqual(S.resultadoCve(r, { ok: false }, Date.now()), []);
});

test("KEV: leitura do catálogo da CISA", () => {
  const m = S.lerKev({ vulnerabilities: [{ cveID: "CVE-2024-3400", vendorProject: "Palo Alto Networks", product: "PAN-OS", dateAdded: "2024-04-12", knownRansomwareCampaignUse: "Unknown" }, { cveID: "x" }] });
  assert.deepEqual(m, { "CVE-2024-3400": ["2024-04-12", "Palo Alto Networks", "PAN-OS", 0] });
});

test("revisão: versões com prefixo, .0 final, pré-versões e asterisco", () => {
  const r = [{ version: "7.4.0", lessThanOrEqual: "7.4.3", status: "affected" }];
  assert.equal(C.avaliarVersao("v7.4.3", r, "unaffected"), "afetada");
  assert.equal(C.avaliarVersao("FortiOS 7.4.2", r, "unaffected"), "afetada");
  assert.equal(C.compararVersoes("7.4", "7.4.0"), 0);
  assert.equal(C.avaliarVersao("7.4", [{ version: "0", lessThan: "7.4.0", status: "affected" }], "unaffected"), "nao-afetada");
  assert.equal(C.avaliarVersao("7.4", [{ version: "7.4.0", status: "affected" }], "unaffected"), "afetada");
  assert.equal(C.compararVersoes("2.0.0-rc1", "2.0.0"), -1);
  assert.equal(C.compararVersoes("10.2.3-h4", "10.2.3"), 1);
  assert.equal(C.avaliarVersao("7.40.1", [{ version: "7.4.*", status: "affected" }], "unaffected"), "nao-afetada");
  assert.equal(C.avaliarVersao("7.4.9", [{ version: "7.4.*", status: "affected" }], "unaffected"), "afetada");
  // CPE com início exclusivo
  const at = [{ id: "x", fabricante: "fortinet", produto: "FortiOS", versao: "7.2.0" }];
  assert.equal(C.correspondencias({ cpes: [{ fabricante: "fortinet", produto: "fortios", inicio: "7.2.0", inicioExcl: true, fim: "7.2.5" }] }, at).length, 0);
  assert.equal(C.correspondencias({ cpes: [{ fabricante: "fortinet", produto: "fortios", inicio: "7.2.0", fim: "7.2.5" }] }, at)[0].nivel, "versao");
  assert.equal(C.lerListaAtivos("Fortinet;FortiOS;v7.4.3;").ativos[0].versao, "7.4.3");
});

test("revisão: produtos mais específicos do catálogo não correspondem", () => {
  assert.ok(!C.produtoCorresponde("cisco", "IOS XE", "Cisco IOS XR Software"));
  assert.ok(!C.produtoCorresponde("cisco", "IOS", "Cisco IOS XE Software"));
  assert.ok(C.produtoCorresponde("cisco", "IOS", "Cisco IOS"));
  assert.ok(C.produtoCorresponde("cisco", "IOS XE", "Cisco IOS XE Software"));
  assert.ok(!C.produtoCorresponde("fortinet", "FortiClient EMS", "FortiClient"));
  assert.ok(C.produtoCorresponde("fortinet", "FortiClient EMS", "FortiClientEMS"));
  assert.ok(C.produtoCorresponde("crowdstrike", "Falcon Sensor", "Falcon"));
  assert.ok(C.produtoCorresponde("fortinet", "FortiGate 60F", "FortiOS"));
  assert.ok(C.produtoCorresponde("cisco", "ASA", "Cisco Adaptive Security Appliance (ASA) Software"));
});

test("revisão: CPE «hp» só para produtos da HPE; fabricante inteiro ignora entradas só com versões corrigidas", () => {
  assert.equal(C.fabricanteDe("hp", "cpe", "integrated lights out 5 firmware"), "hpe");
  assert.equal(C.fabricanteDe("hp", "cpe", "laserjet pro"), null);
  const r = { afetados: [{ fabricante: "Veeam", produto: "Veeam ONE", defaultStatus: "unaffected", versoes: [{ version: "12.2", status: "unaffected" }] }] };
  assert.equal(C.correspondencias(r, [{ id: "v", fabricante: "veeam", produto: "", versao: "" }]).length, 0);
});

test("revisão: passar a explorada volta a avisar, mesmo já com prioridade imediata", () => {
  const antes = { cve: "CVE-2026-1", prioridade: "imediato", cvss: 9.8, epssPercentil: 0.97, kev: false, explorada: false, estado: "Novo", ativos: ["a"], produtos: [], nivel: "versao", avisoPendente: "" };
  const c = S.atualizarAlerta(antes, { kev: true, explorada: true, ativos: ["a"] }, {});
  assert.equal(c.avisoPendente, "imediato");
  assert.equal(c.prioridade, undefined);
  const a = S.acoesCve([{ cliente: "c", clienteNome: "C", prefs: {}, para: ["x@y.pt"], imediatos: [{ ...antes, ...c, fabricante: "fortinet" }] }], Date.now());
  assert.match(a[0].id, /:explorada$/);
});

test("o módulo das fontes carrega e exporta só funções definidas", async () => {
  const { createRequire } = await import("node:module");
  const FC = createRequire(import.meta.url)("../fontes-cve.js");
  for (const k of ["deltaCve", "registoCve", "nvdAlterados", "kev", "epssDia", "euvdExploradas"]) assert.equal(typeof FC[k], "function", k);
  for (const [k, v] of Object.entries(FC)) assert.notEqual(v, undefined, k);
});
