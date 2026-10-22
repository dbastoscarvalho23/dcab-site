// Testes da automatização dos incidentes (incidentes-api.js) — node --test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { calcularPrazos } from "../incidentes-prazos.mjs";
const require = createRequire(import.meta.url);
const IA = require("../incidentes-api.js");
const H = 3600000;

test("a cópia dos prazos nas funções é igual à da área reservada", () => {
  const a = readFileSync(new URL("../incidentes-prazos.mjs", import.meta.url));
  const b = readFileSync(new URL("../../public/reservado/incidentes.js", import.meta.url));
  assert.ok(a.equals(b), "copie public/reservado/incidentes.js para functions/incidentes-prazos.mjs");
});

test("assinatura: aceita a correta e recusa alterada, fora de prazo ou sem segredo", () => {
  const agora = 1760000000000, id = "a1b2c3d4e5f6a7b8c9d0", corpo = '{"x":1}';
  const cab = { "x-dcab-data": String(agora), "x-dcab-id": id, "x-dcab-assinatura": IA.assinar("s3gr3do", String(agora), id, corpo) };
  assert.equal(IA.verificarAssinatura("s3gr3do", cab, corpo, agora + 1000), id);
  assert.throws(() => IA.verificarAssinatura("s3gr3do", cab, '{"x":2}', agora), { estado: 401 });
  assert.throws(() => IA.verificarAssinatura("outro", cab, corpo, agora), { estado: 401 });
  assert.throws(() => IA.verificarAssinatura("s3gr3do", cab, corpo, agora + 6 * 60000), /janela/);
  assert.throws(() => IA.verificarAssinatura("", cab, corpo, agora), { estado: 500 });
  assert.throws(() => IA.verificarAssinatura("s3gr3do", {}, corpo, agora), { estado: 401 });
});

test("pedido do formulário: valida campos e normaliza o email", () => {
  const p = IA.lerPedidoFormulario({ nome: " Ana ", empresa: "Exemplo, Lda.", email: "Ana@Exemplo.PT", mensagem: "Ficheiros cifrados", recebidoEm: "2026-10-19T08:00:00.000Z" });
  assert.equal(p.email, "ana@exemplo.pt");
  assert.equal(p.nome, "Ana");
  assert.throws(() => IA.lerPedidoFormulario({ nome: "Ana", empresa: "X", email: "errado", mensagem: "m", recebidoEm: "2026-10-19T08:00:00.000Z" }), { estado: 400 });
  assert.throws(() => IA.lerPedidoFormulario({ nome: "Ana", empresa: "X", email: "a@b.pt", mensagem: "m", recebidoEm: "ontem" }), { estado: 400 });
});

test("identificação do cliente: acesso, domínio único, nunca domínios gratuitos", () => {
  assert.equal(IA.identificarCliente("a@x.pt", { ativo: true, papel: "cliente", clientes: ["cli-x"] }, []), "cli-x");
  assert.equal(IA.identificarCliente("a@x.pt", { ativo: true, papel: "cliente", clientes: ["a", "b"] }, []), null);
  assert.equal(IA.identificarCliente("a@x.pt", { ativo: false, papel: "cliente", clientes: ["cli-x"] }, ["cli-y"]), "cli-y");
  assert.equal(IA.identificarCliente("a@x.pt", null, ["c1", "c2"]), null);
  assert.equal(IA.identificarCliente("a@gmail.com", null, ["c1"]), null);
});

test("referências e identificadores de cliente", () => {
  assert.equal(IA.proximaReferencia(2026, ["INC-2026-004", "INC-2025-010", "x"]), "INC-2026-005");
  assert.equal(IA.proximaReferencia(2026, []), "INC-2026-001");
  assert.equal(IA.slugCliente("Câmara Municipal de Ílhavo", []), "camara-municipal-de-ilhavo");
  assert.equal(IA.slugCliente("Exemplo", ["exemplo"]), "exemplo-2");
});

test("novo incidente: estado «Por triar», sem prazos a correr e com as provas iniciais", () => {
  const inc = IA.novoIncidente({ referencia: "INC-2026-001", titulo: "Pedido", descricao: "d", detetadoEm: "2026-10-19T08:00:00.000Z", entidadeNome: "X",
    nipc: "12345", origem: "formulario", responsavelDcab: "eq@dcab.pt", contactosEmail: ["A@x.pt", "a@x.pt", "mau"], criadoPor: "sistema" }, {});
  assert.equal(inc.estado, "Por triar");
  assert.equal(inc.nipc, "");
  assert.deepEqual(inc.contactosEmail, ["a@x.pt"]);
  assert.equal(calcularPrazos(inc, new Date("2026-10-19T09:00:00Z")).filter((p) => p.limite).length, 0);
  const pr = IA.provasIniciais("a@x.pt", Date.parse("2026-10-19T08:00:00Z"), "sistema", {});
  assert.deepEqual(pr.map((p) => p.id), ["P01", "P02", "P03"]);
  assert.equal(pr[0].dados.prazo, "2026-10-20T08:00:00.000Z");
});

const base = (extra = {}) => ({
  ...IA.novoIncidente({ referencia: "INC-2026-001", titulo: "Ransomware", descricao: "", detetadoEm: "2026-10-19T06:00:00.000Z", entidadeNome: "X",
    origem: "formulario", responsavelDcab: "eq@dcab.pt", contactosEmail: ["ana@x.pt"], criadoPor: "sistema" }, {}),
  estado: "Aberto", pastaId: "pasta123456", provasPastaId: "provas123456", ...extra,
});

test("tarefas: pasta primeiro; depois ficheiros, provas, prazos e resumo", () => {
  const agora = Date.parse("2026-10-19T09:00:00Z"); // 10h em Lisboa
  const semPasta = IA.calcularAcoes({ incidentes: [{ cliente: "x", clienteNome: "X", criadoMs: Date.parse("2026-10-19T08:00:00Z"), id: "INC-2026-001", dados: { ...base(), pastaId: "" }, provas: [], contactos: ["b@x.pt"] }] }, agora, calcularPrazos);
  assert.deepEqual(semPasta.map((a) => a.tipo), ["pasta"]);
  assert.deepEqual(semPasta[0].partilharCom, ["b@x.pt", "ana@x.pt"]);

  const inc = base({ significativo: "Sim", verificadoEm: "2026-10-18T13:00:00.000Z" }); // limite CNCS 19-10 13:00 Z → faltam 4 h
  const provas = [
    { id: "P01", dados: { numero: "P01", descricao: "Logs", responsavelEmail: "ana@x.pt", prazo: "2026-10-19T10:30:00.000Z", estado: "Pedida" } },
    { id: "P02", dados: { numero: "P02", descricao: "Nota", responsavelEmail: "ana@x.pt", prazo: "2026-10-19T08:00:00.000Z", estado: "Pedida", pastaId: "p2pasta12345" } },
    { id: "P03", dados: { numero: "P03", descricao: "Lista", responsavelEmail: "ana@x.pt", prazo: "2026-10-20T08:00:00.000Z", estado: "Validada" } },
    { id: "P04", dados: { numero: "P04", descricao: "Ecrã", responsavelEmail: "ana@x.pt", prazo: "2026-10-19T10:30:00.000Z", estado: "Pedida", pastaId: "p4pasta12345" } },
  ];
  const a = IA.calcularAcoes({ config: { responsavelPadrao: "eq@dcab.pt" }, incidentes: [{ cliente: "x", clienteNome: "X", criadoMs: Date.parse("2026-10-19T08:00:00Z"), id: "INC-2026-001", dados: inc, provas, contactos: [] }] }, agora, calcularPrazos);
  const tipos = a.map((x) => x.tipo);
  assert.ok(tipos.includes("ficheiros"));
  assert.ok(a.some((x) => x.tipo === "prova-pasta" && x.prova === "P01"));
  assert.ok(!a.some((x) => x.tipo === "lembrete-prova" && x.prova === "P01"), "sem pasta, o pedido por email espera");
  assert.ok(a.some((x) => x.tipo === "lembrete-prova" && x.prova === "P04" && x.duasHoras));
  const partilha = a.find((x) => x.tipo === "partilha");
  assert.ok(partilha && partilha.acrescentar.includes("ana@x.pt"));
  assert.ok(a.some((x) => x.tipo === "escalar-prova" && x.prova === "P02"));
  assert.ok(!a.some((x) => x.prova === "P03"));
  const prazo = a.find((x) => x.tipo === "prazo" && x.chave === "cncs-inicial:" + Date.parse("2026-10-19T13:00:00.000Z") + ":6h");
  assert.ok(prazo, "aviso de 6 horas da notificação inicial");
  assert.ok(prazo.para.includes("eq@dcab.pt") && prazo.para.includes("ana@x.pt"));
  assert.ok(tipos.includes("resumo-diario"));

  // repetição: com os resultados gravados, a mesma hora não volta a gerar os mesmos emails
  const inc2 = { ...inc, alertasEnviados: { [prazo.chave]: "x" }, resumoEm: IA.diaLisboa(agora), partilhadaCom: partilha.esperado };
  const provas2 = provas.map((p) => ({ ...p, dados: { ...p.dados, lembrete2h: true, lembreteEm: new Date(agora).toISOString(), escaladaEm: "x", pastaId: "pp1234567890" } }));
  const b = IA.calcularAcoes({ incidentes: [{ cliente: "x", clienteNome: "X", criadoMs: Date.parse("2026-10-19T08:00:00Z"), id: "INC-2026-001", dados: inc2, provas: provas2, contactos: [] }] }, agora + 10 * 60000, calcularPrazos);
  assert.deepEqual(b.map((x) => x.tipo), ["ficheiros"]);

  // a equipa corrige a hora da verificação: o aviso do novo prazo volta a sair
  const inc3 = { ...inc2, verificadoEm: "2026-10-18T14:00:00.000Z" };
  const c = IA.calcularAcoes({ incidentes: [{ cliente: "x", clienteNome: "X", criadoMs: Date.parse("2026-10-19T08:00:00Z"), id: "INC-2026-001", dados: inc3, provas: provas2, contactos: [] }] }, agora + 10 * 60000, calcularPrazos);
  assert.ok(c.some((x) => x.tipo === "prazo"));
});

test("tarefas: incidentes anteriores à automatização ficam de fora; emails inválidos recusados", () => {
  const agora = Date.parse("2026-10-19T09:00:00Z");
  const a = IA.calcularAcoes({ incidentes: [{ cliente: "x", clienteNome: "X", criadoMs: Date.parse("2026-10-10T08:00:00Z"), id: "I", dados: base({ pastaId: "" }), provas: [], contactos: [] }] }, agora, calcularPrazos);
  assert.equal(a.length, 0);
  for (const e of ["a,b@x.pt", "a;b@x.pt", "a/b@x.pt", "a b@x.pt", "A@x.pt"]) assert.equal(IA.emailOk(e), false, e);
  assert.equal(IA.emailOk("ana.silva+inc@cm-exemplo.pt"), true);
  assert.equal(IA.nomePasta("INC-2026-001", "A/B " + "x".repeat(200)).length, 120);
});

test("tarefas: incidente encerrado não gera nada; triagem avisa depois de 30 minutos, uma vez", () => {
  const agora = Date.parse("2026-10-19T09:00:00Z");
  const t = (min, extra = {}) => ({ id: "p" + min, dados: { estado: "Por triar", empresa: "Y", recebidoEm: new Date(agora - min * 60000).toISOString(), ...extra } });
  const a = IA.calcularAcoes({ config: { equipaEmails: ["eq@dcab.pt"] }, incidentes: [{ cliente: "x", clienteNome: "X", criadoMs: Date.parse("2026-10-19T08:00:00Z"), id: "I", dados: base({ estado: "Encerrado" }), provas: [] }],
    triagem: [t(10), t(40), t(50, { alertadoEm: "x" })] }, agora, calcularPrazos);
  assert.deepEqual(a.map((x) => x.id), ["triagem:p40"]);
  assert.deepEqual(a[0].para, ["eq@dcab.pt"]);
});

test("os emails não levam a descrição do incidente", () => {
  const agora = Date.parse("2026-10-19T09:00:00Z");
  const inc = base({ descricao: "CONFIDENCIAL dados de saúde", significativo: "Sim", verificadoEm: "2026-10-18T13:00:00.000Z" });
  const a = IA.calcularAcoes({ incidentes: [{ cliente: "x", clienteNome: "X", criadoMs: Date.parse("2026-10-19T08:00:00Z"), id: "I", dados: inc, provas: [], contactos: [] }] }, agora, calcularPrazos);
  for (const x of a) assert.ok(!JSON.stringify(x).includes("CONFIDENCIAL"));
});

test("resultados: só aceitam respostas válidas e marcam o que foi feito", () => {
  const agora = Date.parse("2026-10-19T09:00:00Z");
  assert.deepEqual(IA.resultadoParaAlteracoes({ tipo: "pasta" }, { ok: false }, agora), []);
  assert.deepEqual(IA.resultadoParaAlteracoes({ tipo: "pasta" }, { ok: true, pastaId: "../x", provasPastaId: "abcdefghij" }, agora), []);
  const p = IA.resultadoParaAlteracoes({ tipo: "pasta" }, { ok: true, pastaId: "abcdefghij", provasPastaId: "klmnopqrst", pastaUrl: "https://drive.google.com/x", partilhada: ["a"] }, agora);
  assert.equal(p[0].campos.provasPastaId, "klmnopqrst");
  assert.match(p[0].evento, /partilhada com 1/);
  const z = IA.resultadoParaAlteracoes({ tipo: "prazo", chave: "cncs-inicial:6h" }, { ok: true }, agora);
  assert.deepEqual(Object.keys(z[0].campos.alertasEnviados), ["cncs-inicial:6h"]);
  const sh = IA.resultadoParaAlteracoes({ tipo: "partilha" }, { ok: true, partilhadaCom: ["ana@x.pt", "mau"], acrescentados: ["ana@x.pt"], retirados: [], falhas: ["b@x.pt"] }, agora);
  assert.deepEqual(sh[0].campos.partilhadaCom, ["ana@x.pt"]);
  assert.match(sh[0].evento, /partilhe à mão/);
  const f = IA.resultadoParaAlteracoes({ tipo: "ficheiros" }, { ok: true, ficheiros: [
    { id: "ficheiro12345", nome: "logs.zip", tamanho: 2048, sha256: "a".repeat(64), pastaId: "p2pasta12345" }, { id: "x" }] }, agora);
  assert.equal(f.length, 1);
  assert.equal(f[0].campos.sha256, "a".repeat(64));
  assert.equal(f[0].pastaId, "p2pasta12345");
});
