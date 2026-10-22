/* DCAB Consulting — formulário de contacto
 *
 * O formulário envia os dados para um Google Apps Script (ver /apps-script/Codigo.gs).
 * O endereço de email de destino fica guardado apenas no Apps Script:
 * nunca aparece no código do site nem é visível para o público.
 */

const CONFIG = {
  // Colar aqui o URL da aplicação web do Apps Script (termina em /exec)
  ENDPOINT: "https://script.google.com/macros/s/AKfycbyG3dG0H0i0wARUyt5CUQRN8GPajtTAg0Vafrd2X_JeKfS3c0kZ2av9JSHgV9prrkJOkw/exec",
};

document.addEventListener("DOMContentLoaded", () => {
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();

  const form = document.getElementById("formulario-contacto");
  if (!form) return;

  const carregadoEm = Date.now();
  const botao = document.getElementById("botao-enviar");
  const estado = document.getElementById("estado");
  const assunto = document.getElementById("assunto");

  // Botões com data-assunto pré-selecionam o assunto do pedido
  document.querySelectorAll("[data-assunto]").forEach((el) => {
    el.addEventListener("click", () => { assunto.value = el.dataset.assunto; });
  });

  const mensagens = {
    nome: "Indique o seu nome.",
    empresa: "Indique o nome da empresa.",
    email: "Indique um email válido, por exemplo nome@empresa.pt.",
    assunto: "Selecione o assunto do pedido.",
    mensagem: "Escreva uma breve descrição do pedido.",
    consentimento: "Para enviarmos uma resposta, é necessário autorizar o tratamento dos dados.",
  };

  function marcarErro(id, texto) {
    const campo = document.getElementById(id);
    const erro = document.getElementById(id + "-erro");
    if (texto) {
      campo.setAttribute("aria-invalid", "true");
      campo.setAttribute("aria-describedby", id + "-erro");
    } else {
      campo.removeAttribute("aria-invalid");
      campo.removeAttribute("aria-describedby");
    }
    if (erro) erro.textContent = texto || "";
  }

  function validar() {
    let primeiroInvalido = null;
    Object.keys(mensagens).forEach((id) => {
      const campo = document.getElementById(id);
      let valido;
      if (campo.type === "checkbox") valido = campo.checked;
      else if (campo.type === "email") valido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(campo.value.trim());
      else valido = campo.value.trim().length > 0;
      marcarErro(id, valido ? "" : mensagens[id]);
      if (!valido && !primeiroInvalido) primeiroInvalido = campo;
    });
    if (primeiroInvalido) primeiroInvalido.focus();
    return !primeiroInvalido;
  }

  form.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true") marcarErro(e.target.id, "");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    estado.textContent = "";
    estado.classList.remove("erro");

    if (!validar()) return;

    if (!CONFIG.ENDPOINT.startsWith("https://script.google.com/")) {
      estado.textContent = "O formulário ainda não está ligado ao serviço de envio. Configure o ENDPOINT em principal.js.";
      estado.classList.add("erro");
      return;
    }

    const dados = {
      nome: form.nome.value.trim(),
      empresa: form.empresa.value.trim(),
      email: form.email.value.trim(),
      telefone: form.telefone.value.trim(),
      assunto: form.assunto.value,
      mensagem: form.mensagem.value.trim(),
      consentimento: form.consentimento.checked,
      website: form.website.value,           // campo-armadilha
      tempo: Date.now() - carregadoEm,       // envios instantâneos são tratados como automáticos
      origem: window.location.href,
    };

    botao.disabled = true;
    botao.textContent = "A enviar…";

    try {
      // Sem cabeçalho Content-Type personalizado: o pedido segue como text/plain,
      // o que evita o pré-voo CORS que o Apps Script não suporta.
      const resposta = await fetch(CONFIG.ENDPOINT, {
        method: "POST",
        body: JSON.stringify(dados),
      });
      const resultado = await resposta.json();
      if (!resultado.ok) throw new Error(resultado.erro || "falha");

      const caixa = document.createElement("div");
      caixa.className = "confirmacao";
      caixa.tabIndex = -1;
      const titulo = document.createElement("h3");
      titulo.textContent = "Pedido enviado";
      const texto = document.createElement("p");
      texto.textContent = "Obrigado pelo contacto. A equipa da DCAB Consulting vai responder para o email indicado.";
      caixa.append(titulo, texto);
      form.replaceChildren(caixa);
      caixa.focus();
    } catch (err) {
      estado.textContent = "Não foi possível enviar o pedido. Verifique a ligação à internet e tente novamente.";
      estado.classList.add("erro");
      botao.disabled = false;
      botao.textContent = "Enviar pedido";
    }
  });
});
