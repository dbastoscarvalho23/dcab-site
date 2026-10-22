/* Testes da vigilância (sem rede). Executar na pasta functions: node --test */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../vigilancia");
const L = require("../logica");

const hoje = new Date().toISOString();
test("Hudson Rock: situação inicial, depois só alerta quando os totais sobem", () => {
  const hojeIso = new Date().toISOString();
  const t1 = { total: 15, trabalhadores: 3, utilizadores: 12, terceiros: 0, ultimoTrabalhador: hojeIso, ultimoUtilizador: hojeIso };
  const inicial = V.alertasHudson(t1, null, "cliente.pt", "2026-10");
  assert.equal(inicial.length, 2);
  const trab = inicial.find((a) => a.dados.categoria === "Computador infetado");
  assert.equal(trab.dados.gravidade, "critical");
  assert.equal(trab.dados.requerAvaliacao, true);
  assert.match(trab.dados.titulo, /3 computadores de trabalhadores infetados \(situação inicial\)/);
  const util = inicial.find((a) => a.incremento);
  assert.equal(util.incremento, 12);
  assert.equal(util.dados.gravidade, "medium");
  // Sem alterações: nenhum alerta novo
  assert.deepEqual(V.alertasHudson(t1, t1, "cliente.pt", "2026-10"), []);
  // Mais um computador e 2 clientes: um alerta de trabalhadores e incremento de 2 no do mês
  const t2 = { ...t1, trabalhadores: 4, utilizadores: 14 };
  const seg = V.alertasHudson(t2, t1, "cliente.pt", "2026-10");
  assert.equal(seg.find((a) => a.dados.categoria === "Computador infetado").dados.detalhes.novos, 1);
  assert.equal(seg.find((a) => a.incremento).incremento, 2);
  assert.equal(seg.find((a) => a.incremento).id, util.id);
  // Infeção antiga: alta, sem avaliação obrigatória
  const velho = V.alertasHudson({ ...t1, ultimoTrabalhador: "2020-01-01T00:00:00Z", utilizadores: 0 }, null, "cliente.pt", "2026-10");
  assert.equal(velho[0].dados.gravidade, "high");
  assert.equal(velho[0].dados.requerAvaliacao, false);
});

test("ransomware.live: só aceita vítimas do cliente e limpa a descrição", () => {
  const v = { victim: "cliente.pt", group: "akira", attackdate: "2026-10-01", country: "PT", website: "www.cliente.pt",
    description: "Leaked: ceo@cliente.pt:Qwerty!2026 and contracts" };
  assert.equal(V.corresponde(v, ["cliente.pt"], []), true);
  assert.equal(V.corresponde({ victim: "outracliente.pt", website: "outracliente.pt" }, ["cliente.pt"], []), false);
  assert.equal(V.corresponde({ victim: "Câmara Municipal de Exemplo" }, ["cm-exemplo.pt"], ["Câmara Municipal de Exemplo"]), true);
  assert.equal(V.corresponde({ victim: "Exemplo SA" }, ["cliente.pt"], ["Exe"]), false);
  const a = V.alertaRansomware(v, "cliente.pt");
  assert.equal(a.dados.categoria, "Publicação de grupo de ransomware");
  assert.equal(a.dados.gravidade, "critical");
  assert.ok(!a.dados.resumo.includes("Qwerty"));
  assert.ok(a.dados.resumo.includes("c***@cliente.pt"));
});

test("HIBP: fuga com endereços mascarados e gravidade pela palavra-passe e pela data", () => {
  const f = { Name: "Loja", Title: "Loja X", BreachDate: hoje.slice(0, 10), AddedDate: hoje, DataClasses: ["Email addresses", "Passwords"] };
  const a = V.alertaFugaHibp(f, ["ana@cliente.pt", "rui@cliente.pt"], "cliente.pt");
  assert.equal(a.dados.gravidade, "high");
  assert.equal(a.dados.detalhes.total, 2);
  assert.ok(!JSON.stringify(a).includes("ana@"));
  assert.equal(V.alertaFugaHibp({ ...f, DataClasses: ["Email addresses"] }, ["a@cliente.pt"], "cliente.pt").dados.gravidade, "low");
});

test("papel cliente exige identificadores de cliente válidos", async () => {
  const gravados = {};
  const ctx = {
    agora: () => "2026-10-16T00:00:00Z",
    lerAcesso: async (e) => (e === "admin@dcab.pt" ? { papel: "admin", ativo: true } : gravados[e] || null),
    gravarAcesso: async (e, d) => { gravados[e] = d; },
    obterUtilizador: async () => null, criarUtilizador: async () => {}, auditar: async () => {},
  };
  const auth = { token: { email: "admin@dcab.pt", email_verified: true, firebase: { sign_in_second_factor: "totp" } } };
  await assert.rejects(L.convidar(ctx, auth, { email: "x@cliente.pt", papel: "cliente", metodo: "email", clientes: "" }), /identificadores/);
  await assert.rejects(L.convidar(ctx, auth, { email: "x@cliente.pt", papel: "cliente", metodo: "email", clientes: "Cliente Maiúsculo" }), /identificadores/);
  await L.convidar(ctx, auth, { email: "x@cliente.pt", papel: "cliente", metodo: "email", clientes: "camara-exemplo, camara-exemplo" });
  assert.deepEqual(gravados["x@cliente.pt"].clientes, ["camara-exemplo"]);
  await L.convidar(ctx, auth, { email: "y@dcab.pt", papel: "editor", metodo: "google", clientes: "ignorado" });
  assert.deepEqual(gravados["y@dcab.pt"].clientes, []);
});
