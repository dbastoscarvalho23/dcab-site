/* Testes das regras do Firestore da área reservada: secções, incidentes e ligações do início.
 * Executar no Cloud Shell, nesta pasta:  npm install && npm test   (precisa de Java, que o Cloud Shell já tem) */
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp, writeBatch } from "firebase/firestore";

let env;
const pessoas = {
  "admin@dcabconsulting.com": { papel: "admin", ativo: true, seccoes: ["candidatura", "vigilancia", "incidentes"] },
  "editor@dcabconsulting.com": { papel: "editor", ativo: true, seccoes: ["candidatura", "vigilancia", "incidentes"] },
  "leitor@dcabconsulting.com": { papel: "leitor", ativo: true, seccoes: ["incidentes"] },
  "antigo@dcabconsulting.com": { papel: "editor", ativo: true },
  "ana@cliente.pt": { papel: "cliente", ativo: true, clientes: ["camara"], seccoes: ["vigilancia", "incidentes"] },
  "rui@cliente.pt": { papel: "cliente", ativo: true, clientes: ["camara"], seccoes: ["vigilancia"] },
  "eva@outro.pt": { papel: "cliente", ativo: true, clientes: ["outro"], seccoes: ["incidentes"] },
  "velho@cliente.pt": { papel: "cliente", ativo: true, clientes: ["camara"] },
  "seminc@dcabconsulting.com": { papel: "editor", ativo: true, seccoes: ["candidatura"] },
  "cve@dcabconsulting.com": { papel: "editor", ativo: true, seccoes: ["vulnerabilidades"] },
  "leitorcve@dcabconsulting.com": { papel: "leitor", ativo: true, seccoes: ["vulnerabilidades"] },
  "rita@cliente.pt": { papel: "cliente", ativo: true, clientes: ["camara"], seccoes: ["vulnerabilidades"] },
};
const ctx = (email, mfa = true) => env.authenticatedContext(email, {
  email, email_verified: true, firebase: { sign_in_provider: "google.com", ...(mfa ? { sign_in_second_factor: "totp" } : {}) } }).firestore();

const incidente = (email, extra = {}) => ({
  referencia: "INC-2026-001", titulo: "Ransomware", tipo: "Código malicioso", estado: "Aberto", detetadoEm: "2026-10-18T08:00:00.000Z",
  descricao: "", regimes: { nis2: true, rgpd: false, dora: false }, qualificacao: "Por confirmar", significativo: "Em avaliação",
  verificadoEm: "", fundamentacao: "", fimImpactoEm: "", suspeitaIlicito: "Em avaliação", transfronteirico: "Em avaliação",
  servicosAfetados: "", impacto: "", medidas: "", causa: "", iocs: "",
  dados: { pessoais: "Em avaliação", conhecimentoEm: "", risco: "Por avaliar", categorias: "", titulares: "" },
  entidadeNome: "Câmara", nipc: "", contactos: { responsavel: "", pontoContacto: "", epd: "" }, notificacoes: {},
  criadoEm: serverTimestamp(), criadoPor: email, atualizadoEm: serverTimestamp(), atualizadoPor: email, ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-dcab", firestore: { rules: readFileSync("../firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    for (const [e, a] of Object.entries(pessoas)) await setDoc(doc(db, "acessos", e), a);
    await setDoc(doc(db, "clientes", "camara"), { nome: "Câmara" });
    await setDoc(doc(db, "clientes", "outro"), { nome: "Outro" });
    await setDoc(doc(db, "projetos", "ai4cybersecurity"), { parametros: { entidade: "DCAB", projeto: "AI", duracao: 24 } });
    await setDoc(doc(db, "clientes", "camara", "incidentes", "i1"), { ...incidente("editor@dcabconsulting.com"), criadoEm: new Date(), atualizadoEm: new Date() });
    await setDoc(doc(db, "portal", "ligacoes"), { itens: [] });
  });
});

test("sem segundo fator não se lê nada", async () => {
  await assertFails(getDoc(doc(ctx("admin@dcabconsulting.com", false), "clientes", "camara", "incidentes", "i1")));
});

test("secções: o leitor só com incidentes não lê a candidatura; o acesso antigo sem lista lê tudo", async () => {
  await assertFails(getDoc(doc(ctx("leitor@dcabconsulting.com"), "projetos", "ai4cybersecurity")));
  await assertSucceeds(getDoc(doc(ctx("leitor@dcabconsulting.com"), "clientes", "camara", "incidentes", "i1")));
  await assertSucceeds(getDoc(doc(ctx("antigo@dcabconsulting.com"), "projetos", "ai4cybersecurity")));
});

test("o cliente lê os incidentes do seu cliente e não os de outro", async () => {
  await assertSucceeds(getDoc(doc(ctx("ana@cliente.pt"), "clientes", "camara", "incidentes", "i1")));
  await assertFails(getDoc(doc(ctx("eva@outro.pt"), "clientes", "camara", "incidentes", "i1")));
  await assertFails(getDoc(doc(ctx("rui@cliente.pt"), "clientes", "camara", "incidentes", "i1")));
  await assertFails(getDoc(doc(ctx("ana@cliente.pt"), "projetos", "ai4cybersecurity")));
});

test("o editor cria incidentes válidos; dados fora do esquema são recusados", async () => {
  const db = ctx("editor@dcabconsulting.com");
  await assertSucceeds(setDoc(doc(db, "clientes", "camara", "incidentes", "novo"), incidente("editor@dcabconsulting.com", { referencia: "INC-2026-002" })));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "x"), incidente("editor@dcabconsulting.com", { tipo: "Inventado" })));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "y"), incidente("editor@dcabconsulting.com", { senha: "abc" })));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "z"), incidente("outra@pessoa.pt")));
});

test("o cliente cria incidentes e só altera o registo das comunicações", async () => {
  const db = ctx("ana@cliente.pt");
  await assertSucceeds(setDoc(doc(db, "clientes", "camara", "incidentes", "c1"), incidente("ana@cliente.pt", { referencia: "INC-2026-003" })));
  const ref = doc(db, "clientes", "camara", "incidentes", "i1");
  await assertSucceeds(updateDoc(ref, { "notificacoes.cncs-inicial": { estado: "Enviada", enviadaEm: "2026-10-18T10:00:00.000Z", referencia: "MYC-1", por: "ana@cliente.pt" }, atualizadoEm: serverTimestamp(), atualizadoPor: "ana@cliente.pt" }));
  await assertFails(updateDoc(ref, { titulo: "Outro", atualizadoEm: serverTimestamp(), atualizadoPor: "ana@cliente.pt" }));
  await assertFails(updateDoc(ref, { "notificacoes.cncs-inicial": { estado: "Talvez", enviadaEm: "", referencia: "", por: "" }, atualizadoEm: serverTimestamp(), atualizadoPor: "ana@cliente.pt" }));
  await assertFails(deleteDoc(ref));
});

test("cronologia: só criação, com a hora do servidor", async () => {
  const db = ctx("ana@cliente.pt");
  const col = collection(db, "clientes", "camara", "incidentes", "i1", "eventos");
  const r = await assertSucceeds(addDoc(col, { texto: "Servidor isolado", por: "ana@cliente.pt", em: serverTimestamp() }));
  await assertFails(updateDoc(r, { texto: "alterado" }));
  await assertFails(addDoc(col, { texto: "x", por: "ana@cliente.pt", em: new Date("2020-01-01") }));
  await assertFails(addDoc(collection(db, "clientes", "camara", "incidentes", "naoexiste", "eventos"), { texto: "x", por: "ana@cliente.pt", em: serverTimestamp() }));
});

test("incidente e primeiro registo da cronologia no mesmo lote", async () => {
  const db = ctx("editor@dcabconsulting.com");
  const b = writeBatch(db);
  const ref = doc(db, "clientes", "camara", "incidentes", "lote");
  b.set(ref, incidente("editor@dcabconsulting.com", { referencia: "INC-2026-009" }));
  b.set(doc(collection(ref, "eventos")), { texto: "Incidente registado", por: "editor@dcabconsulting.com", em: serverTimestamp() });
  await assertSucceeds(b.commit());
});

test("só o administrador apaga incidentes", async () => {
  await assertFails(deleteDoc(doc(ctx("editor@dcabconsulting.com"), "clientes", "camara", "incidentes", "i1")));
  await assertSucceeds(deleteDoc(doc(ctx("admin@dcabconsulting.com"), "clientes", "camara", "incidentes", "i1")));
});

test("ligações do início: a equipa lê, o cliente não; só o administrador grava", async () => {
  await assertSucceeds(getDoc(doc(ctx("leitor@dcabconsulting.com"), "portal", "ligacoes")));
  await assertFails(getDoc(doc(ctx("ana@cliente.pt"), "portal", "ligacoes")));
  const dados = (e) => ({ itens: [{ titulo: "CRM", url: "https://crm.dcabconsulting.com", descricao: "" }], atualizadoEm: serverTimestamp(), atualizadoPor: e });
  await assertFails(setDoc(doc(ctx("editor@dcabconsulting.com"), "portal", "ligacoes"), dados("editor@dcabconsulting.com")));
  await assertSucceeds(setDoc(doc(ctx("admin@dcabconsulting.com"), "portal", "ligacoes"), dados("admin@dcabconsulting.com")));
});

test("acessos de cliente sem lista ficam só com a vigilância", async () => {
  await assertFails(getDoc(doc(ctx("velho@cliente.pt"), "clientes", "camara", "incidentes", "i1")));
});

test("sem a secção de incidentes não se cria nem se lê", async () => {
  await assertFails(setDoc(doc(ctx("rui@cliente.pt"), "clientes", "camara", "incidentes", "r1"), incidente("rui@cliente.pt", { referencia: "INC-2026-010" })));
  await assertFails(setDoc(doc(ctx("seminc@dcabconsulting.com"), "clientes", "camara", "incidentes", "s1"), incidente("seminc@dcabconsulting.com", { referencia: "INC-2026-011" })));
  await assertFails(setDoc(doc(ctx("eva@outro.pt"), "clientes", "camara", "incidentes", "e1"), incidente("eva@outro.pt", { referencia: "INC-2026-012" })));
  await assertFails(addDoc(collection(ctx("eva@outro.pt"), "clientes", "camara", "incidentes", "i1", "eventos"), { texto: "x", por: "eva@outro.pt", em: serverTimestamp() }));
});

test("não se substitui um incidente com a mesma referência", async () => {
  await assertFails(setDoc(doc(ctx("editor@dcabconsulting.com"), "clientes", "camara", "incidentes", "i1"), incidente("editor@dcabconsulting.com")));
});

test("registos de envio: chave conhecida e data obrigatória quando enviada", async () => {
  const ref = doc(ctx("ana@cliente.pt"), "clientes", "camara", "incidentes", "i1");
  const carimbo = { atualizadoEm: serverTimestamp(), atualizadoPor: "ana@cliente.pt" };
  await assertFails(updateDoc(ref, { "notificacoes.inventada": { estado: "Enviada", enviadaEm: "2026-10-18T10:00:00.000Z", referencia: "", por: "" }, ...carimbo }));
  await assertFails(updateDoc(ref, { "notificacoes.cnpd": { estado: "Enviada", enviadaEm: "", referencia: "", por: "" }, ...carimbo }));
  await assertFails(updateDoc(ref, { criadoPor: "ana@cliente.pt", ...carimbo }));
  await assertFails(updateDoc(ref, { referencia: "INC-2026-099", ...carimbo }));
});

/* ---------- Versão 1.3: incidentes automáticos, provas, clientes, pedidos por triar ---------- */

const doServidor = () => env.withSecurityRulesDisabled(async (c) => {
  const db = c.firestore();
  await setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-020"), {
    ...incidente("sistema", { referencia: "INC-2026-020", estado: "Por triar", tipo: "Outro" }), criadoEm: new Date(), atualizadoEm: new Date(),
    origem: "formulario", responsavelDcab: "editor@dcabconsulting.com", contactosEmail: ["ana@cliente.pt"], alertasEnviados: {}, resumoEm: "2026-10-19",
    pastaId: "pasta1234567", pastaUrl: "https://drive.google.com/x", provasPastaId: "provas123456", provasPastaUrl: "https://drive.google.com/y",
  });
  await setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-020", "provas", "P01"), {
    numero: "P01", descricao: "Registos", responsavelEmail: "ana@cliente.pt", prazo: "2026-10-20T08:00:00.000Z", estado: "Pedida", notas: "",
    lembreteEm: "2026-10-19T08:00:00.000Z", pastaId: "p01pasta1234", criadoEm: new Date(), criadoPor: "sistema", atualizadoEm: new Date(), atualizadoPor: "sistema",
  });
  await setDoc(doc(db, "pedidosIncidente", "pedido1"), { estado: "Por triar", nome: "Zé", empresa: "Y", email: "ze@y.pt", mensagem: "m", recebidoEm: "2026-10-19T08:00:00.000Z" });
});

test("1.3 · a equipa edita um incidente aberto pelo servidor sem mexer nos campos do sistema", async () => {
  await doServidor();
  const ref = doc(ctx("editor@dcabconsulting.com"), "clientes", "camara", "incidentes", "INC-2026-020");
  const carimbo = { atualizadoEm: serverTimestamp(), atualizadoPor: "editor@dcabconsulting.com" };
  await assertSucceeds(updateDoc(ref, { estado: "Aberto", tipo: "Código malicioso", contactosEmail: ["ana@cliente.pt", "rui@cliente.pt"], ...carimbo }));
  await assertFails(updateDoc(ref, { pastaId: "outra1234567", ...carimbo }));
  await assertFails(updateDoc(ref, { "alertasEnviados.cncs-inicial:6h": "x", ...carimbo }));
  await assertFails(updateDoc(ref, { origem: "manual", ...carimbo }));
  await assertFails(updateDoc(ref, { responsavelDcab: "não é email", ...carimbo }));
});

test("1.3 · quem cria à mão não pode pôr campos do sistema", async () => {
  const db = ctx("editor@dcabconsulting.com");
  const base = incidente("editor@dcabconsulting.com", { referencia: "INC-2026-030", origem: "manual", responsavelDcab: "editor@dcabconsulting.com", contactosEmail: ["ana@cliente.pt"] });
  await assertSucceeds(setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-030"), base));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-031"), { ...base, referencia: "INC-2026-031", pastaId: "abcdefghijk" }));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-032"), { ...base, referencia: "INC-2026-032", origem: "inventada" }));
});

test("1.3 · provas: a equipa pede e valida; o cliente só lê; os lembretes só se retiram", async () => {
  await doServidor();
  const ed = ctx("editor@dcabconsulting.com");
  const col = (db) => collection(db, "clientes", "camara", "incidentes", "INC-2026-020", "provas");
  const nova = { numero: "P04", descricao: "Cópia do email de phishing", responsavelEmail: "ana@cliente.pt", prazo: "2026-10-21T08:00:00.000Z", estado: "Pedida", notas: "",
    criadoEm: serverTimestamp(), criadoPor: "editor@dcabconsulting.com", atualizadoEm: serverTimestamp(), atualizadoPor: "editor@dcabconsulting.com" };
  await assertSucceeds(setDoc(doc(col(ed), "P04"), nova));
  await assertFails(setDoc(doc(col(ed), "P05"), { ...nova, numero: "P04" }));
  await assertFails(setDoc(doc(col(ed), "P06"), { ...nova, numero: "P06", lembrete2h: true }));
  await assertFails(setDoc(doc(col(ctx("ana@cliente.pt")), "P07"), { ...nova, numero: "P07", criadoPor: "ana@cliente.pt", atualizadoPor: "ana@cliente.pt" }));
  await assertSucceeds(getDoc(doc(col(ctx("ana@cliente.pt")), "P01")));
  await assertFails(getDoc(doc(col(ctx("eva@outro.pt")), "P01")));
  const p1 = doc(col(ed), "P01");
  const carimbo = { atualizadoEm: serverTimestamp(), atualizadoPor: "editor@dcabconsulting.com" };
  await assertSucceeds(updateDoc(p1, { estado: "Validada", ...carimbo }));
  await assertFails(updateDoc(p1, { lembreteEm: "2026-10-19T09:00:00.000Z", ...carimbo }));
  await assertFails(updateDoc(p1, { pastaId: "outra1234567", ...carimbo }));
  const { deleteField } = await import("firebase/firestore");
  await assertSucceeds(updateDoc(p1, { estado: "Pedida", prazo: "2026-10-22T08:00:00.000Z", lembreteEm: deleteField(), ...carimbo }));
  await assertFails(deleteDoc(p1));
  await assertFails(setDoc(doc(ed, "clientes", "camara", "incidentes", "INC-2026-020", "ficheiros", "f1"), { nome: "x" }));
});

test("1.3 · pedidos por triar: a equipa vê e converte; o cliente não vê", async () => {
  await doServidor();
  await assertSucceeds(getDoc(doc(ctx("leitor@dcabconsulting.com"), "pedidosIncidente", "pedido1")));
  await assertFails(getDoc(doc(ctx("ana@cliente.pt"), "pedidosIncidente", "pedido1")));
  await assertFails(updateDoc(doc(ctx("leitor@dcabconsulting.com"), "pedidosIncidente", "pedido1"), { estado: "Descartado", tratadoPor: "leitor@dcabconsulting.com", tratadoEm: serverTimestamp() }));
  const db = ctx("editor@dcabconsulting.com");
  await assertFails(updateDoc(doc(db, "pedidosIncidente", "pedido1"), { estado: "Convertido", cliente: "camara", incidente: "INC-2026-099", tratadoPor: "editor@dcabconsulting.com", tratadoEm: serverTimestamp() }));
  const b = writeBatch(db);
  const ref = doc(db, "clientes", "camara", "incidentes", "INC-2026-040");
  b.set(ref, incidente("editor@dcabconsulting.com", { referencia: "INC-2026-040", estado: "Por triar", origem: "formulario", contactosEmail: ["ze@y.pt"] }));
  b.update(doc(db, "pedidosIncidente", "pedido1"), { estado: "Convertido", cliente: "camara", incidente: "INC-2026-040", tratadoPor: "editor@dcabconsulting.com", tratadoEm: serverTimestamp() });
  await assertSucceeds(b.commit());
  await assertFails(updateDoc(doc(db, "pedidosIncidente", "pedido1"), { estado: "Descartado", tratadoPor: "editor@dcabconsulting.com", tratadoEm: serverTimestamp() }));
});

test("1.3 · clientes e configuração: só o administrador grava", async () => {
  const ficha = (e) => ({ nome: "Empresa Nova", nipc: "500000000", dominiosEmail: ["empresanova.pt"], crmEntidadeId: "", ativo: false,
    criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), atualizadoPor: e });
  await assertFails(setDoc(doc(ctx("editor@dcabconsulting.com"), "clientes", "empresa-nova"), ficha("editor@dcabconsulting.com")));
  await assertSucceeds(setDoc(doc(ctx("admin@dcabconsulting.com"), "clientes", "empresa-nova"), ficha("admin@dcabconsulting.com")));
  await assertFails(setDoc(doc(ctx("admin@dcabconsulting.com"), "clientes", "Maiusculas"), ficha("admin@dcabconsulting.com")));
  await assertFails(setDoc(doc(ctx("admin@dcabconsulting.com"), "clientes", "ligada"), { ...ficha("admin@dcabconsulting.com"), ativo: true }));
  const adm = ctx("admin@dcabconsulting.com");
  await assertSucceeds(updateDoc(doc(adm, "clientes", "camara"), { nipc: "501234567", dominiosEmail: ["cm.pt"], atualizadoEm: serverTimestamp(), atualizadoPor: "admin@dcabconsulting.com" }));
  await assertFails(updateDoc(doc(adm, "clientes", "camara"), { ativo: true, atualizadoEm: serverTimestamp(), atualizadoPor: "admin@dcabconsulting.com" }));
  const cfg = (e) => ({ responsavelPadrao: "editor@dcabconsulting.com", equipaEmails: ["admin@dcabconsulting.com"], atualizadoEm: serverTimestamp(), atualizadoPor: e });
  await assertFails(setDoc(doc(ctx("editor@dcabconsulting.com"), "config", "incidentes"), cfg("editor@dcabconsulting.com")));
  await assertSucceeds(setDoc(doc(adm, "config", "incidentes"), cfg("admin@dcabconsulting.com")));
  await assertSucceeds(getDoc(doc(ctx("leitor@dcabconsulting.com"), "config", "incidentes")));
  await assertFails(getDoc(doc(ctx("ana@cliente.pt"), "config", "incidentes")));
  await assertFails(getDoc(doc(adm, "api_pedidos", "x")));
});

test("1.3 · o cliente não escolhe o responsável da DCAB, a origem nem os contactos; o leitor não pede provas", async () => {
  await doServidor();
  const db = ctx("ana@cliente.pt");
  const base = incidente("ana@cliente.pt", { referencia: "INC-2026-050", origem: "manual" });
  await assertSucceeds(setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-050"), base));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-051"), { ...base, referencia: "INC-2026-051", responsavelDcab: "ana@cliente.pt" }));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-052"), { ...base, referencia: "INC-2026-052", origem: "crm" }));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-053"), { ...base, referencia: "INC-2026-053", contactosEmail: ["x@y.pt"] }));
  await assertFails(setDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-054"), { ...base, referencia: "INC-2026-054", estado: "Encerrado" }));
  await assertFails(updateDoc(doc(db, "clientes", "camara", "incidentes", "INC-2026-020"), { contactosEmail: ["x@y.pt"], atualizadoEm: serverTimestamp(), atualizadoPor: "ana@cliente.pt" }));
  const le = ctx("leitor@dcabconsulting.com");
  await assertFails(setDoc(doc(le, "clientes", "camara", "incidentes", "INC-2026-020", "provas", "P09"), { numero: "P09", descricao: "x", responsavelEmail: "ana@cliente.pt",
    prazo: "2026-10-21T08:00:00.000Z", estado: "Pedida", notas: "", criadoEm: serverTimestamp(), criadoPor: "leitor@dcabconsulting.com", atualizadoEm: serverTimestamp(), atualizadoPor: "leitor@dcabconsulting.com" }));
  const { deleteField } = await import("firebase/firestore");
  await assertFails(updateDoc(doc(ctx("editor@dcabconsulting.com"), "clientes", "camara", "incidentes", "INC-2026-020"), { alertasEnviados: deleteField(), atualizadoEm: serverTimestamp(), atualizadoPor: "editor@dcabconsulting.com" }));
  await assertFails(updateDoc(doc(ctx("editor@dcabconsulting.com"), "clientes", "camara", "incidentes", "INC-2026-020"), { contactosEmail: ["a,b@cliente.pt"], responsavelDcab: "a,b@dcab.pt", atualizadoEm: serverTimestamp(), atualizadoPor: "editor@dcabconsulting.com" }));
});

/* ---------- 1.4 · Alertas de vulnerabilidades ---------- */
const ativo = (e, extra = {}) => ({ fabricante: "fortinet", produto: "FortiOS", versao: "7.4.3", designacao: "Firewall da sede", origem: "manual",
  criadoEm: serverTimestamp(), criadoPor: e, atualizadoEm: serverTimestamp(), atualizadoPor: e, ...extra });
const alertaCve = { cve: "CVE-2026-11111", fabricante: "fortinet", estado: "Novo", responsavel: "", notas: "", prioridade: "imediato", avisoPendente: "imediato", expira: new Date() };

test("1.4 · ativos: o cliente com a secção e a equipa registam; o leitor só lê; outros clientes não veem", async () => {
  const rita = ctx("rita@cliente.pt");
  await assertSucceeds(setDoc(doc(rita, "clientes", "camara", "ativos", "a1"), ativo("rita@cliente.pt")));
  await assertSucceeds(setDoc(doc(ctx("cve@dcabconsulting.com"), "clientes", "camara", "ativos", "a2"), ativo("cve@dcabconsulting.com", { produto: "", versao: "" })));
  await assertFails(setDoc(doc(ctx("leitorcve@dcabconsulting.com"), "clientes", "camara", "ativos", "a3"), ativo("leitorcve@dcabconsulting.com")));
  await assertSucceeds(getDoc(doc(ctx("leitorcve@dcabconsulting.com"), "clientes", "camara", "ativos", "a1")));
  // Sem a secção (ana só tem vigilância e incidentes) e de outro cliente: nada
  await assertFails(getDoc(doc(ctx("ana@cliente.pt"), "clientes", "camara", "ativos", "a1")));
  await assertFails(getDoc(doc(ctx("eva@outro.pt"), "clientes", "camara", "ativos", "a1")));
  await assertFails(setDoc(doc(ctx("seminc@dcabconsulting.com"), "clientes", "camara", "ativos", "a4"), ativo("seminc@dcabconsulting.com")));
  // Esquema: fabricante com formato, campos a mais, origem desconhecida, autoria de outra pessoa
  await assertFails(setDoc(doc(rita, "clientes", "camara", "ativos", "a5"), ativo("rita@cliente.pt", { fabricante: "Forti Net" })));
  await assertFails(setDoc(doc(rita, "clientes", "camara", "ativos", "a6"), ativo("rita@cliente.pt", { ip: "10.0.0.1" })));
  await assertFails(setDoc(doc(rita, "clientes", "camara", "ativos", "a7"), ativo("rita@cliente.pt", { origem: "servidor" })));
  await assertFails(setDoc(doc(rita, "clientes", "camara", "ativos", "a7b"), ativo("rita@cliente.pt", { origem: "crm" })));
  await assertFails(setDoc(doc(rita, "clientes", "camara", "ativos", "a8"), ativo("rita@cliente.pt", { atualizadoPor: "outra@cliente.pt" })));
  // Cliente inexistente
  await assertFails(setDoc(doc(ctx("cve@dcabconsulting.com"), "clientes", "inexistente", "ativos", "a9"), ativo("cve@dcabconsulting.com")));
  // Editar mantém a autoria; apagar
  await assertSucceeds(updateDoc(doc(rita, "clientes", "camara", "ativos", "a1"), { versao: "7.4.4", atualizadoEm: serverTimestamp(), atualizadoPor: "rita@cliente.pt" }));
  await assertFails(updateDoc(doc(rita, "clientes", "camara", "ativos", "a1"), { criadoPor: "rita@cliente.pt2", atualizadoEm: serverTimestamp(), atualizadoPor: "rita@cliente.pt" }));
  await assertSucceeds(deleteDoc(doc(rita, "clientes", "camara", "ativos", "a2")));
});

test("1.4 · preferências e alertas: o cliente muda o estado e as notas; só o servidor cria", async () => {
  await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), "clientes", "camara", "cves", "CVE-2026-11111"), alertaCve); });
  const rita = ctx("rita@cliente.pt");
  const pref = (e, extra = {}) => ({ emailImediato: true, resumoDiario: false, omitirProduto: true, imediatoCriticas: false, atualizadoEm: serverTimestamp(), atualizadoPor: e, ...extra });
  await assertSucceeds(setDoc(doc(rita, "clientes", "camara", "preferencias", "vulnerabilidades"), pref("rita@cliente.pt")));
  await assertFails(setDoc(doc(rita, "clientes", "camara", "preferencias", "vulnerabilidades"), pref("rita@cliente.pt", { destinatarios: ["x@y.pt"] })));
  await assertFails(setDoc(doc(rita, "clientes", "camara", "preferencias", "outra"), pref("rita@cliente.pt")));
  await assertSucceeds(getDoc(doc(rita, "clientes", "camara", "cves", "CVE-2026-11111")));
  await assertSucceeds(updateDoc(doc(rita, "clientes", "camara", "cves", "CVE-2026-11111"), { estado: "Corrigido", notas: "Atualizado para 7.4.4", atualizadoEm: serverTimestamp(), atualizadoPor: "rita@cliente.pt" }));
  await assertFails(updateDoc(doc(rita, "clientes", "camara", "cves", "CVE-2026-11111"), { avisoPendente: "", atualizadoEm: serverTimestamp(), atualizadoPor: "rita@cliente.pt" }));
  await assertFails(updateDoc(doc(rita, "clientes", "camara", "cves", "CVE-2026-11111"), { estado: "Apagado", atualizadoEm: serverTimestamp(), atualizadoPor: "rita@cliente.pt" }));
  await assertFails(updateDoc(doc(ctx("leitorcve@dcabconsulting.com"), "clientes", "camara", "cves", "CVE-2026-11111"), { estado: "Em análise", atualizadoEm: serverTimestamp(), atualizadoPor: "leitorcve@dcabconsulting.com" }));
  await assertFails(setDoc(doc(rita, "clientes", "camara", "cves", "CVE-2026-22222"), alertaCve));
  await assertFails(deleteDoc(doc(ctx("admin@dcabconsulting.com"), "clientes", "camara", "cves", "CVE-2026-11111")));
  // Catálogos e cursores do servidor: ninguém lê
  await assertFails(getDoc(doc(ctx("admin@dcabconsulting.com"), "cve_estado", "recolha")));
});

test("1.4 · o administrador liga o serviço; o cliente lê a ficha com a secção de vulnerabilidades", async () => {
  const adm = ctx("admin@dcabconsulting.com");
  await assertSucceeds(updateDoc(doc(adm, "clientes", "camara"), { servicoCve: true, atualizadoEm: serverTimestamp(), atualizadoPor: "admin@dcabconsulting.com" }));
  await assertFails(updateDoc(doc(adm, "clientes", "camara"), { servicoCve: "sim", atualizadoEm: serverTimestamp(), atualizadoPor: "admin@dcabconsulting.com" }));
  await assertFails(updateDoc(doc(ctx("cve@dcabconsulting.com"), "clientes", "camara"), { servicoCve: false, atualizadoEm: serverTimestamp(), atualizadoPor: "cve@dcabconsulting.com" }));
  await assertSucceeds(getDoc(doc(ctx("rita@cliente.pt"), "clientes", "camara")));
});
