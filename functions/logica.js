/* DCAB Consulting — gestão de acessos à área reservada (lógica do servidor).
 * Independente do Firebase: recebe um "contexto" com as operações de dados,
 * o que permite testá-la sem ligação ao projeto.
 */
"use strict";
const crypto = require("crypto");

const PAPEIS = ["admin", "editor", "leitor", "cliente"];
// Papel «cliente»: só vê a vigilância, os incidentes e as vulnerabilidades dos clientes indicados em «clientes» (identificadores dos documentos em /clientes)
function lerClientes(papel, lista) {
  if (papel !== "cliente") return [];
  const ids = [...new Set((Array.isArray(lista) ? lista : String(lista || "").split(/[,;\s]+/)).map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
  if (!ids.length || ids.length > 10 || !ids.every((x) => /^[a-z0-9-]{2,40}$/.test(x))) {
    throw new ErroAcesso("invalid-argument", "Indique entre 1 e 10 identificadores de cliente (letras minúsculas, números e hífenes).");
  }
  return ids;
}
const METODOS = ["google", "email"];

// Secções da área reservada. O papel define o máximo; a lista restringe (as regras do Firestore aplicam-na).
const SECCOES = ["candidatura", "vigilancia", "incidentes", "vulnerabilidades"];
function lerSeccoes(papel, lista) {
  if (papel === "admin") return SECCOES.slice();
  const permitidas = papel === "cliente" ? ["vigilancia", "incidentes", "vulnerabilidades"] : SECCOES;
  if (lista === undefined || lista === null) return permitidas.slice();
  const ids = [...new Set((Array.isArray(lista) ? lista : []).map((x) => String(x)))].filter((x) => permitidas.includes(x));
  if (!ids.length) throw new ErroAcesso("invalid-argument", "Escolha pelo menos uma secção.");
  return ids;
}

class ErroAcesso extends Error {
  constructor(codigo, mensagem) { super(mensagem); this.codigo = codigo; }
}

const normalizarEmail = (e) => String(e || "").trim().toLowerCase();
const emailValido = (e) => e.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// Palavra-passe temporária forte (ninguém a usa: a pessoa define a sua pelo email de convite)
function senhaTemporaria() {
  return crypto.randomBytes(24).toString("base64").replace(/[+/=]/g, "x") + "-Aa9!";
}

// Só administradores ativos, com email verificado e segundo fator na sessão atual
async function verificarAdmin(ctx, auth) {
  if (!auth || !auth.token) throw new ErroAcesso("unauthenticated", "Sessão inválida. Entre novamente.");
  const t = auth.token;
  if (!t.email || t.email_verified !== true) throw new ErroAcesso("permission-denied", "Email não verificado.");
  if (!t.firebase || t.firebase.sign_in_second_factor !== "totp") throw new ErroAcesso("permission-denied", "É obrigatório o segundo fator.");
  const email = normalizarEmail(t.email);
  const acesso = await ctx.lerAcesso(email);
  if (!acesso || acesso.ativo !== true || acesso.papel !== "admin") throw new ErroAcesso("permission-denied", "Apenas o administrador pode gerir acessos.");
  return email;
}

async function convidar(ctx, auth, dados) {
  const por = await verificarAdmin(ctx, auth);
  const email = normalizarEmail(dados && dados.email);
  const nome = String((dados && dados.nome) || "").trim().slice(0, 120);
  const papel = dados && dados.papel;
  const metodo = dados && dados.metodo;
  if (!emailValido(email)) throw new ErroAcesso("invalid-argument", "Email inválido.");
  if (!PAPEIS.includes(papel)) throw new ErroAcesso("invalid-argument", "Papel inválido.");
  if (!METODOS.includes(metodo)) throw new ErroAcesso("invalid-argument", "Método de entrada inválido.");

  const clientes = lerClientes(papel, dados && dados.clientes);
  const seccoes = lerSeccoes(papel, dados && dados.seccoes);
  const existente = await ctx.lerAcesso(email);
  if (existente && existente.ativo === true) throw new ErroAcesso("already-exists", "Este email já tem acesso.");

  let contaCriada = false;
  if (metodo === "email") {
    const conta = await ctx.obterUtilizador(email);
    if (!conta) { await ctx.criarUtilizador(email, nome, senhaTemporaria()); contaCriada = true; }
    else if (conta.desativada) await ctx.atualizarUtilizador(conta.uid, { disabled: false });
  }

  await ctx.gravarAcesso(email, {
    papel, clientes, seccoes, ativo: true, nome, metodo, convidadoPor: por, convidadoEm: ctx.agora(),
  });
  await ctx.auditar({ acao: "convidar", colecao: "acessos", docId: email, resumo: papel + (clientes.length ? " (" + clientes.join(", ") + ")" : "") + " · " + seccoes.join("/") + " · " + metodo + (nome ? " · " + nome : ""), por });
  return { email, metodo, contaCriada };
}

async function listar(ctx, auth) {
  await verificarAdmin(ctx, auth);
  const acessos = await ctx.listarAcessos();
  const linhas = [];
  for (const a of acessos) {
    const conta = await ctx.obterUtilizador(a.email);
    linhas.push({
      email: a.email, nome: a.nome || "", papel: a.papel, clientes: a.clientes || [], seccoes: Array.isArray(a.seccoes) ? a.seccoes : null, ativo: a.ativo === true, metodo: a.metodo || "",
      convidadoEm: a.convidadoEm || null,
      conta: !!conta, mfa: !!(conta && conta.mfa), desativada: !!(conta && conta.desativada),
      ultimoAcesso: conta ? conta.ultimoAcesso || null : null,
    });
  }
  return linhas.sort((x, y) => x.email.localeCompare(y.email));
}

async function alterar(ctx, auth, dados) {
  const por = await verificarAdmin(ctx, auth);
  const email = normalizarEmail(dados && dados.email);
  const acao = dados && dados.acao;
  const acesso = await ctx.lerAcesso(email);
  if (!acesso) throw new ErroAcesso("not-found", "Este email não tem convite.");

  // Proteções contra ficar sem administrador
  const proprio = email === por;
  if (proprio && (acao === "desativar" || (acao === "papel" && dados.papel !== "admin"))) {
    throw new ErroAcesso("failed-precondition", "Não pode retirar o seu próprio acesso de administrador.");
  }
  if (acesso.papel === "admin" && (acao === "desativar" || (acao === "papel" && dados.papel !== "admin"))) {
    if ((await ctx.contarAdminsAtivos()) <= 1) throw new ErroAcesso("failed-precondition", "Tem de existir pelo menos um administrador ativo.");
  }

  const conta = await ctx.obterUtilizador(email);
  let resumo;
  if (acao === "desativar") {
    await ctx.gravarAcesso(email, { ativo: false }, true);
    if (conta) { await ctx.atualizarUtilizador(conta.uid, { disabled: true }); await ctx.revogarSessoes(conta.uid); }
    resumo = "acesso desativado";
  } else if (acao === "reativar") {
    await ctx.gravarAcesso(email, { ativo: true }, true);
    if (conta && conta.desativada) await ctx.atualizarUtilizador(conta.uid, { disabled: false });
    resumo = "acesso reativado";
  } else if (acao === "papel") {
    if (!PAPEIS.includes(dados.papel)) throw new ErroAcesso("invalid-argument", "Papel inválido.");
    const clientes = lerClientes(dados.papel, dados.clientes);
    const seccoes = lerSeccoes(dados.papel, dados.seccoes);
    await ctx.gravarAcesso(email, { papel: dados.papel, clientes, seccoes }, true);
    resumo = "papel alterado para " + dados.papel + (clientes.length ? " (" + clientes.join(", ") + ")" : "") + " · " + seccoes.join("/");
  } else if (acao === "reporMfa") {
    if (proprio) throw new ErroAcesso("failed-precondition", "Não pode repor o seu próprio segundo fator a partir daqui.");
    if (!conta) throw new ErroAcesso("not-found", "Esta pessoa ainda não tem conta.");
    await ctx.atualizarUtilizador(conta.uid, { multiFactor: { enrolledFactors: null } });
    await ctx.revogarSessoes(conta.uid);
    resumo = "segundo fator reposto";
  } else {
    throw new ErroAcesso("invalid-argument", "Ação desconhecida.");
  }
  await ctx.auditar({ acao: "alterar", colecao: "acessos", docId: email, resumo, por });
  return { email, acao };
}

// Executada pelo Firebase antes de criar qualquer conta: só aceita emails com convite ativo
async function permitirCriacao(ctx, utilizador) {
  const email = normalizarEmail(utilizador && utilizador.email);
  const acesso = email ? await ctx.lerAcesso(email) : null;
  if (!acesso || acesso.ativo !== true) throw new ErroAcesso("permission-denied", "Acesso apenas por convite.");
}

module.exports = { convidar, listar, alterar, permitirCriacao, verificarAdmin, ErroAcesso, PAPEIS, METODOS, SECCOES, lerSeccoes, senhaTemporaria };
