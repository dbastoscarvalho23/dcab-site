/* Testes dos prazos e das minutas de incidentes e das secções de acesso. Executar na pasta functions: node --test */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as I from "../../public/reservado/incidentes.js";
const L = createRequire(import.meta.url)("../logica.js");

test("feriados nacionais de 2026 (Páscoa a 5 de abril)", () => {
  const f = I.feriados(2026);
  assert.equal(I.pascoa(2026).toISOString().slice(0, 10), "2026-04-05");
  for (const d of ["2026-01-01", "2026-04-03", "2026-04-25", "2026-05-01", "2026-06-04", "2026-06-10", "2026-08-15", "2026-10-05", "2026-11-01", "2026-12-01", "2026-12-08", "2026-12-25"]) assert.ok(f.has(d), d);
  assert.ok(!f.has("2026-02-17"), "o Carnaval não é feriado obrigatório");
});

test("dias úteis saltam fins de semana e feriados", () => {
  const r = I.somarDiasUteis(new Date("2026-12-23T10:00:00Z"), 3);
  assert.equal(r.toISOString().slice(0, 10), "2026-12-29");
  const r2 = I.somarDiasUteis(new Date("2026-10-16T10:00:00Z"), 1); // sexta → segunda
  assert.equal(r2.toISOString().slice(0, 10), "2026-10-19");
  // Verão: fecha às 23:59:59 de Lisboa (22:59:59 UTC)
  assert.equal(I.somarDiasUteis(new Date("2026-07-14T09:00:00Z"), 1).toISOString(), "2026-07-15T22:59:59.000Z");
  // Envio às 00:30 de Lisboa conta desse dia, não do anterior em UTC
  assert.equal(I.somarDiasUteis(new Date("2026-07-14T23:30:00Z"), 1).toISOString(), "2026-07-16T22:59:59.000Z");
});

test("prazos correm com a verificação preenchida, mesmo em avaliação", () => {
  const p = I.calcularPrazos({ ...base, significativo: "Em avaliação" });
  assert.ok(p.find((x) => x.chave === "cncs-inicial"));
  const q = I.calcularPrazos({ ...base, significativo: "Em avaliação", verificadoEm: "" });
  assert.ok(!q.find((x) => x.chave === "cncs-inicial"));
  const c = I.calcularPrazos({ ...base, dados: { pessoais: "Em avaliação", conhecimentoEm: "2026-10-18T09:00:00.000Z", risco: "Por avaliar" } });
  assert.ok(c.find((x) => x.chave === "cnpd"));
});

const base = {
  regimes: { nis2: true, rgpd: false, dora: false }, significativo: "Sim",
  detetadoEm: "2026-10-18T08:00:00.000Z", verificadoEm: "2026-10-18T10:00:00.000Z", fimImpactoEm: "",
  dados: { pessoais: "Não", risco: "Por avaliar" }, notificacoes: {},
};

test("NIS2: 24 h e 72 h contam da verificação", () => {
  const p = I.calcularPrazos(base, new Date("2026-10-18T12:00:00Z"));
  const ini = p.find((x) => x.chave === "cncs-inicial");
  assert.equal(ini.limite.toISOString(), "2026-10-19T10:00:00.000Z");
  assert.equal(p.find((x) => x.chave === "cncs-atualizacao").limite.toISOString(), "2026-10-21T10:00:00.000Z");
  assert.equal(p.find((x) => x.chave === "cncs-final").limite, null, "sem envio do fim do impacto não há prazo final");
  assert.equal(ini.atraso, false);
  assert.equal(I.calcularPrazos(base, new Date("2026-10-19T11:00:00Z")).find((x) => x.chave === "cncs-inicial").atraso, true);
});

test("NIS2: resolvido em 2 horas basta o fim do impacto", () => {
  const p = I.calcularPrazos({ ...base, fimImpactoEm: "2026-10-18T09:30:00.000Z" });
  assert.ok(!p.find((x) => x.chave === "cncs-inicial"));
  assert.equal(p.find((x) => x.chave === "cncs-fim").limite.toISOString(), "2026-10-19T09:30:00.000Z");
});

test("NIS2: relatório final 30 dias úteis depois do envio do fim do impacto", () => {
  const inc = { ...base, fimImpactoEm: "2026-10-20T10:00:00.000Z", notificacoes: { "cncs-fim": { estado: "Enviada", enviadaEm: "2026-10-20T12:00:00.000Z" } } };
  const f = I.calcularPrazos(inc).find((x) => x.chave === "cncs-final");
  // 21/10 a 1/12: sem contar fins de semana, 1 e 1 de novembro (domingo) e 1 de dezembro
  assert.equal(f.limite.toISOString().slice(0, 10), "2026-12-02");
});

test("sem incidente significativo não há prazos do CNCS", () => {
  const p = I.calcularPrazos({ ...base, significativo: "Não" });
  assert.ok(!p.some((x) => x.chave.startsWith("cncs")));
});

test("RGPD: 72 h da CNPD, titulares só com risco elevado, registo sempre", () => {
  const dados = { pessoais: "Sim", conhecimentoEm: "2026-10-18T09:00:00.000Z", risco: "Risco elevado" };
  const p = I.calcularPrazos({ ...base, dados });
  assert.equal(p.find((x) => x.chave === "cnpd").limite.toISOString(), "2026-10-21T09:00:00.000Z");
  assert.ok(p.find((x) => x.chave === "titulares"));
  assert.ok(p.find((x) => x.chave === "registo-rgpd"));
  const q = I.calcularPrazos({ ...base, dados: { ...dados, risco: "Improvável" } });
  assert.ok(!q.find((x) => x.chave === "cnpd"));
  assert.ok(!q.find((x) => x.chave === "titulares"));
  assert.ok(q.find((x) => x.chave === "registo-rgpd"));
});

test("minutas preenchem os dados e marcam o que falta", () => {
  const t = I.MINUTAS["cncs-inicial"].texto({ ...base, referencia: "INC-2026-001", descricao: "Ransomware no servidor de ficheiros" }, { nome: "Cliente, S.A.", nipc: "" });
  assert.match(t, /Cliente, S\.A\./);
  assert.match(t, /\[NIPC\]/);
  assert.match(t, /Ransomware no servidor de ficheiros/);
  for (const [k, m] of Object.entries(I.MINUTAS)) assert.ok(m.texto({}, {}).length > 50, k);
});

test("referências seguem a numeração do ano", () => {
  assert.equal(I.gerarReferencia(2026, []), "INC-2026-001");
  assert.equal(I.gerarReferencia(2026, ["INC-2026-004", "INC-2025-010", null]), "INC-2026-005");
});

test("secções: o cliente nunca tem a candidatura; o administrador tem todas", () => {
  assert.deepEqual(L.lerSeccoes("admin", ["vigilancia"]), L.SECCOES);
  assert.deepEqual(L.lerSeccoes("cliente", undefined), ["vigilancia", "incidentes", "vulnerabilidades"]);
  assert.deepEqual(L.lerSeccoes("cliente", ["candidatura", "incidentes"]), ["incidentes"]);
  assert.deepEqual(L.lerSeccoes("leitor", ["candidatura"]), ["candidatura"]);
  assert.throws(() => L.lerSeccoes("editor", []), /pelo menos uma secção/);
});
