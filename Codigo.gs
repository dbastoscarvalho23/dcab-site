/**
 * DCAB Consulting — receção dos pedidos de contacto do site
 *
 * O email de destino fica guardado nas Propriedades do script (não no código),
 * por isso não aparece no site nem neste ficheiro.
 *
 * Configuração (uma vez): Definições do projeto (ícone de engrenagem) >
 * Propriedades do script > Adicionar propriedade:
 *   EMAIL_DESTINO  = caixa que recebe os pedidos (ex.: a caixa oculta criada no Google Workspace)
 *   FOLHA_ID       = (opcional) ID de uma Google Sheet para registo dos pedidos
 */

const LIMITE_POR_EMAIL = 3;          // pedidos por remetente...
const JANELA_SEGUNDOS = 600;         // ...em 10 minutos
const TEMPO_MINIMO_MS = 3000;        // envios mais rápidos que isto são tratados como automáticos
const ASSUNTOS = [
  "Prevenção de fuga de dados (DLP)", "Classificação e proteção da informação",
  "Continuidade de negócio", "Demonstração da AnkoraOne", "Parcerias", "Proteção de dados",
  "Diagnóstico completo e plano de correção", "Exclusão de domínio do Observatório",
  "Incidente: pedido de apoio urgente", "Outro"
];

// Executar uma vez no editor para autorizar o envio de email e testar a configuração
function testarEnvio() {
  const destino = PropertiesService.getScriptProperties().getProperty("EMAIL_DESTINO");
  MailApp.sendEmail(destino, "[Site DCAB] Teste de configuração", "O formulário do site está configurado corretamente.");
}

function doPost(e) {
  try {
    // Execução manual no editor (sem pedido do site): não faz nada
    if (!e || !e.postData) return resposta_({ ok: false, erro: "sem_dados" });
    const d = JSON.parse(e.postData.contents || "{}");

    // Bots: campo-armadilha preenchido ou envio instantâneo → responde "ok" sem enviar nada
    if (d.website || Number(d.tempo) < TEMPO_MINIMO_MS) return resposta_({ ok: true });

    const limpo = {
      nome: texto_(d.nome, 120),
      empresa: texto_(d.empresa, 120),
      email: texto_(d.email, 160).toLowerCase(),
      telefone: texto_(d.telefone, 30),
      assunto: ASSUNTOS.indexOf(d.assunto) >= 0 ? d.assunto : "Outro",
      mensagem: texto_(d.mensagem, 3000),
      origem: texto_(d.origem, 200),
    };

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpo.email);
    if (!limpo.nome || !limpo.empresa || !emailValido || !limpo.mensagem || d.consentimento !== true) {
      return resposta_({ ok: false, erro: "dados_invalidos" });
    }

    // Limite simples de envios por remetente
    const cache = CacheService.getScriptCache();
    const chave = "rl_" + Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, limpo.email));
    const contagem = Number(cache.get(chave) || 0);
    if (contagem >= LIMITE_POR_EMAIL) return resposta_({ ok: false, erro: "limite" });
    cache.put(chave, String(contagem + 1), JANELA_SEGUNDOS);

    const props = PropertiesService.getScriptProperties();
    const destino = props.getProperty("EMAIL_DESTINO");
    if (!destino) throw new Error("EMAIL_DESTINO não configurado");

    const quando = Utilities.formatDate(new Date(), "Europe/Lisbon", "dd/MM/yyyy HH:mm");

    MailApp.sendEmail({
      to: destino,
      replyTo: limpo.email,
      name: "Site DCAB Consulting",
      subject: "[Site DCAB] " + limpo.assunto + " — " + limpo.empresa,
      htmlBody:
        '<div style="font-family:Arial,sans-serif;font-size:14px;color:#000">' +
        '<p style="font-size:16px"><strong>Novo pedido de contacto</strong></p>' +
        '<table cellpadding="6" style="border-collapse:collapse">' +
        linha_("Data", quando) +
        linha_("Nome", limpo.nome) +
        linha_("Empresa", limpo.empresa) +
        linha_("Email", limpo.email) +
        linha_("Telefone", limpo.telefone || "—") +
        linha_("Assunto", limpo.assunto) +
        "</table>" +
        '<p style="margin-top:16px"><strong>Mensagem</strong></p>' +
        '<p style="white-space:pre-wrap;border-left:3px solid #00A2DB;padding-left:12px">' + escapar_(limpo.mensagem) + "</p>" +
        '<p style="color:#666;font-size:12px">Para contactar o remetente, responda a esta mensagem. O consentimento RGPD foi dado no formulário.</p>' +
        "</div>",
    });

    // Pedido de apoio a incidente: abre o processo (Incidentes.gs). Uma falha aqui não impede a resposta ao site.
    if (limpo.assunto === "Incidente: pedido de apoio urgente" && typeof tratarPedidoIncidente === "function") {
      try { tratarPedidoIncidente(limpo); } catch (errInc) { console.error("Incidentes: " + errInc); }
    }

    // Registo opcional numa Google Sheet
    const folhaId = props.getProperty("FOLHA_ID");
    if (folhaId) {
      const folha = SpreadsheetApp.openById(folhaId).getSheets()[0];
      if (folha.getLastRow() === 0) {
        folha.appendRow(["Data", "Nome", "Empresa", "Email", "Telefone", "Assunto", "Mensagem", "Estado"]);
      }
      folha.appendRow([quando, limpo.nome, limpo.empresa, limpo.email, limpo.telefone,
        limpo.assunto, limpo.mensagem, "Novo"].map(protegerFolha_));
    }

    return resposta_({ ok: true });
  } catch (err) {
    console.error(err);
    return resposta_({ ok: false, erro: "interno" });
  }
}

// Permite testar no navegador que a aplicação web está publicada
function doGet() {
  return resposta_({ ok: true, servico: "formulario-dcab" });
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function texto_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
function escapar_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function linha_(rotulo, valor) {
  return '<tr><td style="color:#46525C;border-bottom:1px solid #eee">' + rotulo +
    '</td><td style="border-bottom:1px solid #eee">' + escapar_(valor) + "</td></tr>";
}
// Evita injeção de fórmulas na folha de cálculo
function protegerFolha_(v) {
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
