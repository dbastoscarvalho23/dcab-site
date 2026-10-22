#!/usr/bin/env node
/* Teste dos alertas de vulnerabilidades com as fontes reais (correr no Cloud Shell, na pasta do site):
 *   node ferramentas/testar-cve.js            → últimas 24 horas da lista CVE
 *   node ferramentas/testar-cve.js 72         → últimas 72 horas
 *
 * Mostra:
 *  1. se cada fonte responde (lista CVE, NVD, KEV, EPSS, EUVD);
 *  2. quantas vulnerabilidades exploradas (KEV) do último ano cada fabricante do catálogo tem;
 *  3. os registos recentes da lista CVE de cada fabricante, com a gravidade e a prioridade que teriam;
 *  4. nomes de fabricante parecidos com os do catálogo que o catálogo ainda não reconhece (para o completar).
 * Não grava nada e não usa dados de clientes.
 */
"use strict";
const path = require("path");
const FC = require(path.join(__dirname, "..", "functions", "fontes-cve.js"));

(async () => {
  const C = await import(path.join(__dirname, "..", "functions", "cve-logica.mjs"));
  const S = await import(path.join(__dirname, "..", "functions", "cve-servidor.mjs"));
  const horas = Math.min(168, Math.max(1, Number(process.argv[2]) || 24));
  const agora = Date.now();
  const ok = (t) => console.log("  ✔ " + t), falha = (t) => console.log("  ✘ " + t);
  console.log("\n1. Fontes");

  let kev = {};
  try { kev = S.lerKev(await FC.kev()); ok(`KEV: ${Object.keys(kev).length} vulnerabilidades exploradas`); } catch (e) { falha("KEV: " + e.message); }
  let euvd = {};
  try { euvd = await FC.euvdExploradas(); ok(`EUVD: ${Object.keys(euvd).length} exploradas na resposta`); } catch (e) { falha("EUVD: " + e.message); }
  let entradas = [];
  try { entradas = await FC.deltaCve(new Date(agora - horas * 3600000).toISOString()); ok(`Lista CVE: ${entradas.length} atualizações em ${horas} h, ${new Set(entradas.flatMap((e) => e.ids)).size} registos`); } catch (e) { falha("Lista CVE: " + e.message); }
  let nvd = [];
  try { const r = await FC.nvdAlterados(new Date(agora - Math.min(horas, 24) * 3600000).toISOString(), new Date(agora).toISOString(), null, agora + 120000); nvd = r.registos; ok(`NVD: ${nvd.length} de ${r.total} registos alterados nas últimas ${Math.min(horas, 24)} h${r.completo ? "" : " (parcial)"}`); } catch (e) { falha("NVD: " + e.message); }
  try { const e = await FC.epssDia(new Set(["CVE-2024-3400", "CVE-2023-27997"])); ok(`EPSS (ficheiro do dia): ${Object.entries(e).map(([k, v]) => k + " percentil " + Math.round(v.percentil * 100) + " em " + v.data).join(", ") || "sem as duas de teste"}`); } catch (e) { falha("EPSS: " + e.message); }

  console.log("\n2. Exploradas (KEV) no último ano, por fabricante do catálogo");
  const porFab = {};
  const naoReconhecidos = {};
  for (const [id, k] of Object.entries(kev)) {
    const f = C.fabricanteDe(k[1], "kev");
    if (f && agora - Date.parse(k[0]) <= 365 * 86400000) (porFab[f] ||= []).push(id + " " + k[2]);
    if (!f) for (const x of C.FABRICANTES) if (C.norm(k[1]).includes(x.id.slice(0, 5)) || C.norm(k[1]).includes(C.norm(x.nome).split(" ")[0])) naoReconhecidos["KEV: " + k[1]] = x.id;
  }
  for (const f of C.FABRICANTES) console.log(`  ${f.nome.padEnd(22)} ${String((porFab[f.id] || []).length).padStart(3)}  ${(porFab[f.id] || []).slice(0, 3).join(" · ")}`);

  console.log(`\n3. Registos recentes da lista CVE por fabricante (${horas} h)`);
  const ids = [...new Set(entradas.flatMap((e) => e.ids))].slice(0, 1500);
  const nvdMapa = Object.fromEntries(nvd.map((c) => S.deNvd(c)).filter(Boolean).map((n) => [n.cve, n]));
  let lidos = 0;
  const achados = [];
  for (let i = 0; i < ids.length; i += 10) {
    const lote = await Promise.all(ids.slice(i, i + 10).map((id) => FC.registoCve(id).then((j) => (j ? S.deCve5(j) : null)).catch(() => null)));
    for (const r0 of lote) {
      if (!r0) continue;
      lidos++;
      const r = S.juntar(r0, nvdMapa[r0.cve] || null);
      const fabs = new Set();
      for (const a of r.afetados) {
        const f = C.fabricanteDe(a.fabricante);
        if (f) fabs.add(f);
        else for (const x of C.FABRICANTES) if ((x.cve || []).some((n) => C.norm(a.fabricante).includes(n.split(" ")[0]) && n.split(" ")[0].length >= 4)) naoReconhecidos["CVE: " + a.fabricante] = x.id;
      }
      for (const c of r.cpes) { const f = C.fabricanteDe(c.fabricante, "cpe"); if (f) fabs.add(f); }
      for (const f of fabs) {
        const prio = C.prioridade({ cvss: r.cvss, kev: !!kev[r.cve], euvd: euvd[r.cve] ? { explorada: true } : null });
        achados.push([f, r.cve, r.cvss, prio, r.afetados.filter((a) => C.fabricanteDe(a.fabricante) === f).map((a) => a.produto).slice(0, 2).join(", ")]);
      }
    }
  }
  console.log(`  ${lidos} registos lidos`);
  for (const f of C.FABRICANTES) {
    const l = achados.filter((x) => x[0] === f.id);
    if (!l.length) continue;
    console.log(`  ${f.nome} (${l.length})`);
    for (const x of l.slice(0, 8)) console.log(`     ${x[1].padEnd(16)} CVSS ${x[2] ?? "—"}  ${C.PRIORIDADES[x[3]].padEnd(22)} ${x[4]}`);
  }
  const resumo = { imediato: 0, diario: 0, registo: 0 };
  for (const x of achados) resumo[x[3]]++;
  console.log(`  Com todos os 16 fabricantes marcados: ${resumo.imediato} emails imediatos, ${resumo.diario} no resumo diário, ${resumo.registo} só na área reservada`);

  console.log("\n4. Nomes parecidos que o catálogo não reconhece (acrescentar ao catálogo se forem o mesmo fabricante)");
  const nomes = Object.entries(naoReconhecidos);
  if (!nomes.length) console.log("  nenhum");
  for (const [n, f] of nomes.slice(0, 40)) console.log(`  ${n}  → ${f}?`);
  console.log("");
})().catch((e) => { console.error("Erro:", e.message); process.exit(1); });
