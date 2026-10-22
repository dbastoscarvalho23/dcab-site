/**
 * DCAB Consulting — automatização dos incidentes (ficheiro novo no mesmo projeto Apps Script do formulário)
 *
 * O que faz:
 *  1. Quando chega pelo formulário um pedido com o assunto «Incidente: pedido de apoio urgente»:
 *     - pede às funções do site que abram o incidente (se o remetente for de um cliente conhecido);
 *     - cria a pasta do incidente no Google Drive e as subpastas das provas pedidas;
 *     - responde ao cliente com a referência, a pasta para entregar as provas e os primeiros cuidados;
 *     - avisa a equipa.
 *  2. De 15 em 15 minutos (tarefasIncidentes):
 *     - cria pastas para incidentes abertos à mão ou pelo CRM e mantém a partilha da pasta de entregas;
 *     - regista os ficheiros entregues (nome, tamanho, SHA-256) e guarda uma cópia que só a DCAB vê;
 *     - envia por email os lembretes das provas, os avisos de prazos de notificação e o resumo diário;
 *     - envia os alertas de vulnerabilidades dos clientes com o serviço ativo (imediatos e resumo diário).
 *
 * Os emails não levam a descrição do incidente: só a referência, o título, os prazos e as ligações.
 *
 * Propriedades do script (Definições do projeto › Propriedades do script):
 *   INCIDENTES_SEGREDO  = o mesmo valor guardado no Secret Manager do Firebase (INCIDENTES_SEGREDO)
 *   PASTA_INCIDENTES_ID = ID da pasta-mãe dos incidentes, de preferência numa unidade partilhada do Google Drive
 *   URL_API             = (opcional) https://dcabconsulting.com/api/incidentes
 *
 * Instalação: executar uma vez instalarTarefas() no editor e autorizar.
 */

const INC_ASSUNTO = "Incidente: pedido de apoio urgente";
const INC_REMETENTE = "DCAB Consulting · Incidentes";
const INC_PASTA_CLIENTE = "Entregas do cliente";
const INC_PASTA_COPIAS = "Cópias de integridade (só DCAB)";
const INC_MAX_HASH = 45 * 1024 * 1024; // acima disto o SHA-256 vem do Google Drive (serviço avançado) ou fica por calcular
const INC_TEMPO_MAX_MS = 4.5 * 60 * 1000;
const INC_EMAILS = ["lembrete-prova", "escalar-prova", "prazo", "resumo-diario", "triagem", "cve-imediato", "cve-resumo"];

/* ---------------- Configuração ---------------- */
function cfgInc_() {
  const p = PropertiesService.getScriptProperties();
  const c = {
    segredo: (p.getProperty("INCIDENTES_SEGREDO") || "").trim(),
    raiz: (p.getProperty("PASTA_INCIDENTES_ID") || "").trim(),
    url: (p.getProperty("URL_API") || "https://dcabconsulting.com/api/incidentes").replace(/\/+$/, ""),
  };
  if (!c.segredo || !c.raiz) throw new Error("Falta INCIDENTES_SEGREDO ou PASTA_INCIDENTES_ID nas propriedades do script");
  return c;
}

// Executar uma vez: cria a tarefa de 15 em 15 minutos (apaga as anteriores desta função) e testa a ligação
function instalarTarefas() {
  ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === "tarefasIncidentes"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("tarefasIncidentes").timeBased().everyMinutes(15).create();
  DriveApp.getFolderById(cfgInc_().raiz).getName();
  const r = chamarApi_("tarefas", {});
  console.log("Tarefa instalada. Ações pendentes neste momento: " + (r.acoes || []).length);
}

/* ---------------- Chamada assinada às funções do site ---------------- */
function hex_(bytes) {
  return bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}
function chamarApi_(rota, dados) {
  const c = cfgInc_();
  const corpo = JSON.stringify(dados);
  const data = String(Date.now());
  const id = Utilities.getUuid();
  const ass = hex_(Utilities.computeHmacSha256Signature(data + "." + id + "." + corpo, c.segredo, Utilities.Charset.UTF_8));
  const r = UrlFetchApp.fetch(c.url + "/" + rota, {
    method: "post", contentType: "application/json; charset=utf-8", payload: Utilities.newBlob(corpo, "application/json", "c").getBytes(),
    headers: { "x-dcab-data": data, "x-dcab-id": id, "x-dcab-assinatura": ass }, muteHttpExceptions: true, followRedirects: false,
  });
  const txt = r.getContentText();
  let j = {};
  try { j = JSON.parse(txt); } catch (e) { /* resposta não JSON */ }
  if (r.getResponseCode() !== 200 || !j.ok) throw new Error("API " + rota + ": " + r.getResponseCode() + " " + (j.erro || txt.slice(0, 200)));
  return j;
}

/* ---------------- Pedido de apoio pelo formulário ---------------- */
// Chamado por doPost (Codigo.gs) depois de enviar o email habitual à DCAB
function tratarPedidoIncidente(limpo) {
  // Não corre ao mesmo tempo que a tarefa de 15 em 15 minutos (evita duas árvores de pastas para o mesmo incidente)
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("Tarefa automática ocupada; o incidente fica para a próxima execução");
  try { tratarPedidoIncidente_(limpo); } finally { lock.releaseLock(); }
}
function tratarPedidoIncidente_(limpo) {
  const r = chamarApi_("pedido", {
    nome: limpo.nome, empresa: limpo.empresa, email: limpo.email, telefone: limpo.telefone,
    mensagem: limpo.mensagem, recebidoEm: new Date().toISOString(),
  });
  const agora = new Date();
  const quando = "em " + Utilities.formatDate(agora, "Europe/Lisbon", "dd/MM/yyyy") + ", às " + Utilities.formatDate(agora, "Europe/Lisbon", "HH:mm");
  const cuidados = [
    "Enquanto aguarda o nosso contacto:",
    "- não desligue nem reinstale os equipamentos afetados; se for preciso travar o ataque, desligue-os da rede (cabo e Wi-Fi);",
    "- não apague mensagens, ficheiros nem registos, mesmo que pareçam inúteis;",
    "- não pague nenhum resgate nem responda aos atacantes;",
    "- anote a hora a que deu pelo problema e o que viu.",
  ];
  // Remetente não reconhecido: sem resposta automática (o endereço não é verificado); a equipa já recebeu o email do formulário
  if (r.resultado !== "incidente") return;
  const pasta = criarPastaIncidente_(r.nomePasta, r.contactos || []);
  const resultados = [{ acao: { tipo: "pasta", cliente: r.cliente, incidente: r.incidente }, resultado: pasta }];
  const provas = (r.provas || []).map(function (p) {
    const s = criarSubpasta_(pasta.provasPastaId, (p.numero + " · " + p.descricao).slice(0, 100));
    resultados.push({ acao: { tipo: "prova-pasta", cliente: r.cliente, incidente: r.incidente, prova: p.id }, resultado: s });
    return p.numero + " — " + p.descricao + ": " + s.pastaUrl;
  });
  chamarApi_("resultados", { resultados: resultados });
  const prazo = r.provas && r.provas[0]
    ? Utilities.formatDate(new Date(r.provas[0].prazo), "Europe/Lisbon", "dd/MM/yyyy") + ", às " + Utilities.formatDate(new Date(r.provas[0].prazo), "Europe/Lisbon", "HH:mm") : "";
  // Sem o nome nem o texto do remetente: o endereço do formulário não é verificado
  enviarInc_(r.contactos || [limpo.email], r.equipa || [], "[" + r.referencia + "] Recebemos o seu pedido de apoio",
    ["Olá,", "", "Recebemos o pedido de apoio feito pelo formulário do site " + quando + " (hora de Lisboa) e abrimos o incidente " + r.referencia + ".",
      "A equipa da DCAB vai entrar em contacto consigo. Use esta referência em todas as comunicações.",
      "Se não fez este pedido, avise-nos respondendo a este email.", "",
      "Para a análise e para as notificações obrigatórias, precisamos destas provas" + (prazo ? " até " + prazo : "") + ":"]
      .concat(provas).concat(["", "Entregue os ficheiros na pasta de cada prova (" + pasta.provasPastaUrl + "). Se não conseguir abrir a pasta, ligue para a DCAB.",
        "Não envie as provas nem dados do incidente por email.", ""]).concat(cuidados)
      .concat(["", "Se tiver acesso à área reservada (" + "https://dcabconsulting.com/reservado" + "), acompanhe lá os prazos e o registo.", "", "DCAB Consulting"]));
}

/* ---------------- Tarefa de 15 em 15 minutos ---------------- */
function tarefasIncidentes() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const inicio = Date.now();
    const cache = CacheService.getScriptCache();
    const acoes = chamarApi_("tarefas", {}).acoes || [];
    const copias = {};
    for (let i = 0; i < acoes.length; i++) {
      if (Date.now() - inicio > INC_TEMPO_MAX_MS) break; // o resto fica para a próxima execução
      const a = acoes[i];
      // Um email já enviado (registado na cache do script durante 6 horas) não volta a sair, mesmo que a gravação do resultado tenha falhado
      const chave = INC_EMAILS.indexOf(a.tipo) >= 0 ? "enviado:" + String(a.id).slice(0, 230) : null;
      let resultado;
      if (chave && cache.get(chave)) resultado = { ok: true };
      else {
        try { resultado = executarAcao_(a, copias, inicio); } catch (e) { console.error(a.id + ": " + e); resultado = { ok: false }; }
        if (chave && resultado.ok) cache.put(chave, "1", 21600);
      }
      // Cada resultado é gravado logo a seguir; se a gravação falhar, a ação volta na execução seguinte (e o email não se repete)
      if (resultado.ok) {
        try { chamarApi_("resultados", { resultados: [{ acao: a, resultado: resultado }] }); } catch (e) { console.error("resultados " + a.id + ": " + e); }
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function executarAcao_(a, copias, inicio) {
  switch (a.tipo) {
    case "pasta": return criarPastaIncidente_(a.nomePasta, a.partilharCom || []);
    case "prova-pasta": return criarSubpasta_(a.provasPastaId, a.nomePasta);
    case "partilha": return atualizarPartilha_(a);
    case "ficheiros": return listarFicheiros_(a, copias, inicio);
    case "lembrete-prova": case "escalar-prova": case "prazo": case "resumo-diario": case "triagem":
    case "cve-imediato": case "cve-resumo":
      if (!a.para || !a.para.length) return { ok: false };
      enviarInc_(a.para, a.cc || [], a.assunto, a.linhas, a.remetente);
      return { ok: true };
    default: return { ok: false };
  }
}

/* ---------------- Google Drive ---------------- */
// Estrutura: «INC-… · Cliente» (só DCAB) › «Entregas do cliente» (partilhada com o cliente) e «Cópias de integridade (só DCAB)»
function criarPastaIncidente_(nome, partilharCom) {
  const raiz = DriveApp.getFolderById(cfgInc_().raiz);
  const existentes = raiz.getFoldersByName(nome);
  const pasta = existentes.hasNext() ? existentes.next() : raiz.createFolder(nome);
  const entregas = subpasta_(pasta, INC_PASTA_CLIENTE);
  subpasta_(pasta, INC_PASTA_COPIAS);
  const partilhada = [], naoPartilhada = [];
  (partilharCom || []).forEach(function (e) {
    try { entregas.addEditor(e); partilhada.push(e); } catch (err) { console.warn("Partilha falhou: " + err); naoPartilhada.push(e); }
  });
  return { ok: true, pastaId: pasta.getId(), pastaUrl: pasta.getUrl(), provasPastaId: entregas.getId(), provasPastaUrl: entregas.getUrl(),
    partilhada: partilhada, naoPartilhada: naoPartilhada };
}
// Acrescenta e retira só as pessoas que o sistema partilhou (a equipa e os membros da unidade partilhada não são tocados)
function atualizarPartilha_(a) {
  const pasta = DriveApp.getFolderById(a.provasPastaId);
  const feitos = [], retirados = [], falhas = [];
  (a.acrescentar || []).forEach(function (e) { try { pasta.addEditor(e); feitos.push(e); } catch (err) { console.warn("Partilha falhou: " + err); falhas.push(e); } });
  (a.retirar || []).forEach(function (e) { try { pasta.removeEditor(e); retirados.push(e); } catch (err) { console.warn("Retirar acesso falhou: " + err); } });
  const partilhadaCom = (a.esperado || []).filter(function (e) { return falhas.indexOf(e) < 0; });
  return { ok: true, partilhadaCom: partilhadaCom, acrescentados: feitos, retirados: retirados, falhas: falhas };
}
function subpasta_(pai, nome) {
  const it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}
function criarSubpasta_(paiId, nome) {
  const f = subpasta_(DriveApp.getFolderById(paiId), nome);
  return { ok: true, pastaId: f.getId(), pastaUrl: f.getUrl() };
}

// Ficheiros novos nas entregas do cliente: SHA-256 e cópia para a pasta só da DCAB.
// «conhecidos» vem do servidor (ficheiros já registados); a cópia só se faz se ainda não existir.
function listarFicheiros_(a, copias, inicio) {
  if (!a.provasPastaId || !a.pastaId) return { ok: false };
  const conhecidos = {};
  (a.conhecidos || []).forEach(function (id) { conhecidos[id] = true; });
  const destino = subpasta_(DriveApp.getFolderById(a.pastaId), INC_PASTA_COPIAS);
  const chave = destino.getId();
  if (!copias[chave]) {
    copias[chave] = {};
    const it = destino.getFiles();
    while (it.hasNext()) copias[chave][it.next().getName().split(" · ")[0]] = true;
  }
  const novos = [];
  const cheio = function () { return novos.length >= 20 || Date.now() - inicio > INC_TEMPO_MAX_MS; };
  // provaId: a subpasta de primeiro nível (P01 · …) a que o ficheiro pertence, mesmo dentro de subpastas
  const percorrer = function (f, provaId) {
    const fs = f.getFiles();
    while (fs.hasNext() && !cheio()) {
      const x = fs.next();
      if (conhecidos[x.getId()]) continue;
      const sha = sha256_(x);
      if (!copias[chave][x.getId()]) { x.makeCopy(x.getId() + " · " + x.getName(), destino); copias[chave][x.getId()] = true; }
      novos.push({ id: x.getId(), nome: x.getName(), tamanho: x.getSize(), sha256: sha, pastaId: provaId || f.getId(),
        modificadoEm: x.getLastUpdated().toISOString(), url: x.getUrl() });
    }
    const sub = f.getFolders();
    while (sub.hasNext() && !cheio()) { const g = sub.next(); percorrer(g, provaId || g.getId()); }
  };
  percorrer(DriveApp.getFolderById(a.provasPastaId), "");
  return { ok: true, ficheiros: novos };
}
function sha256_(ficheiro) {
  // Documentos, folhas e apresentações Google não têm bytes próprios: o valor mudaria a cada exportação
  if (String(ficheiro.getMimeType()).indexOf("application/vnd.google-apps") === 0) return "";
  try {
    if (typeof Drive !== "undefined" && Drive.Files) { // serviço avançado do Drive (opcional), sem limite de tamanho
      const m = Drive.Files.get(ficheiro.getId(), { fields: "sha256Checksum", supportsAllDrives: true });
      if (m && m.sha256Checksum) return m.sha256Checksum;
    }
    if (ficheiro.getSize() <= INC_MAX_HASH) return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, ficheiro.getBlob().getBytes()));
  } catch (e) { console.warn("SHA-256 por calcular: " + e); }
  return "";
}

/* ---------------- Email ---------------- */
function enviarInc_(para, cc, assunto, linhas, remetente) {
  const p = para.filter(Boolean), c = (cc || []).filter(function (e) { return e && p.indexOf(e) < 0; });
  if (!p.length) return;
  MailApp.sendEmail({ to: p.join(","), cc: c.join(","), subject: assunto, name: remetente || INC_REMETENTE, body: linhas.join("\n") });
}
