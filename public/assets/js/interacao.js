/* DCAB Consulting — interações da versão 1.5.
 * 1. Rasura de «não pode perder.» no título da página inicial.
 * 2. Demonstração de prevenção de fuga de dados (dados fictícios; nada é enviado).
 * 3. Escala de classificação da informação.
 * Com «movimento reduzido» ativo, os resultados aparecem sem animação.
 */
(function () {
  "use strict";
  var reduzido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. Rasura do título */
  function iniciarRasura() {
    var realce = document.querySelector(".abertura .realce");
    if (!realce || reduzido) return;
    function rasurar() {
      realce.classList.remove("rasura");
      void realce.offsetWidth;
      realce.classList.add("rasura");
    }
    var feito = false;
    function primeira() { if (!feito) { feito = true; rasurar(); } }
    var entrada = document.querySelector(".abertura__video--entrada");
    if (entrada) entrada.addEventListener("ended", primeira, { once: true });
    setTimeout(primeira, 4200);
    realce.addEventListener("mouseenter", rasurar);
  }

  /* 2. Demonstração de prevenção de fuga de dados */
  function iniciarDemo() {
    var demo = document.querySelector("[data-demo-dlp]");
    if (!demo) return;
    var botao = demo.querySelector("[data-demo-enviar]");
    var para = demo.querySelector("[data-demo-para]");
    var corpo = demo.querySelector(".email__corpo");
    var varr = demo.querySelector(".email__varrimento");
    var carimbo = demo.querySelector(".email__carimbo");
    var registo = demo.querySelector(".email__registo");
    var dados = [].slice.call(demo.querySelectorAll(".sensivel"));
    var opcoes = [].slice.call(demo.querySelectorAll('input[name="demo-destino"]'));
    var vazio = registo.innerHTML;
    var temporizadores = [];

    function limpar() {
      temporizadores.forEach(clearTimeout); temporizadores = [];
      dados.forEach(function (d) { d.className = "sensivel"; d.removeAttribute("aria-label"); });
      registo.innerHTML = vazio;
      carimbo.className = "email__carimbo"; carimbo.textContent = "";
      varr.style.opacity = "0";
      botao.disabled = false;
    }
    opcoes.forEach(function (o) {
      o.addEventListener("change", function () { para.textContent = o.getAttribute("data-endereco"); limpar(); });
    });
    function linha(estado, classe, texto) {
      var d = document.createElement("div"); d.className = "registo";
      var b = document.createElement("b"); b.textContent = estado; if (classe) b.className = classe;
      var s = document.createElement("span"); s.textContent = texto;
      d.appendChild(b); d.appendChild(s); registo.appendChild(d);
      if (reduzido) d.classList.add("registo--visivel");
      else requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add("registo--visivel"); }); });
    }
    function depois(ms, f) { if (reduzido) f(); else temporizadores.push(setTimeout(f, ms)); }

    botao.addEventListener("click", function () {
      var externo = opcoes.some(function (o) { return o.checked && o.value === "externo"; });
      limpar();
      botao.disabled = true;
      registo.innerHTML = "";
      function concluir() {
        varr.style.opacity = "0";
        dados.forEach(function (d) { d.className = "sensivel sensivel--detetado"; });
        linha("Analisado", "", dados.length + " dados sensíveis: NIF, IBAN, utilizador e palavra-passe");
        depois(700, function () {
          if (externo) {
            dados.forEach(function (d) { d.className = "sensivel sensivel--rasurado"; d.setAttribute("aria-label", "dado ocultado"); });
            linha("Bloqueado", "bloqueado", "Documento confidencial para um endereço fora da organização");
            carimbo.className = "email__carimbo email__carimbo--bloqueado"; carimbo.textContent = "Bloqueado";
          } else {
            dados.forEach(function (d) { d.className = "sensivel sensivel--cifrado"; });
            linha("Permitido", "permitido", "Destinatário interno autorizado; a mensagem segue cifrada");
            carimbo.className = "email__carimbo email__carimbo--enviado"; carimbo.textContent = "Enviado cifrado";
          }
        });
        depois(1300, function () {
          linha("Registado", "", externo ? "Evento guardado para auditoria e alerta ao responsável" : "Evento guardado para auditoria");
          botao.disabled = false;
        });
      }
      if (reduzido) { concluir(); return; }
      var altura = corpo.offsetHeight, inicio = null, duracao = 1400;
      varr.style.opacity = "1";
      requestAnimationFrame(function passo(t) {
        if (inicio === null) inicio = t;
        var p = Math.min(1, (t - inicio) / duracao), y = altura * p;
        varr.style.transform = "translateY(" + y + "px)";
        dados.forEach(function (d) { if (d.offsetTop <= y && d.className === "sensivel") d.className = "sensivel sensivel--detetado"; });
        if (p < 1) requestAnimationFrame(passo); else concluir();
      });
    });
  }

  /* 3. Escala de classificação */
  var NIVEIS = {
    publico: { quem: "Qualquer pessoa, dentro ou fora da organização.", ex: "Tabela de preços publicada, comunicado de imprensa.", ctrl: "Sem restrições de envio. Controlo de versões." },
    interno: { quem: "Todos os colaboradores.", ex: "Procedimentos internos, organograma, atas de equipa.", ctrl: "Partilha externa só com aprovação. Etiqueta visível no documento." },
    confidencial: { quem: "Equipas e pessoas autorizadas.", ex: "Propostas a clientes, contratos, dados de faturação.", ctrl: "Cifragem, bloqueio de envio para domínios externos e registo de acessos." },
    restrito: { quem: "Pessoas nomeadas, caso a caso.", ex: "Planos de fusão, credenciais de sistemas críticos, processos disciplinares.", ctrl: "Gestão de direitos sobre o documento, sem cópia nem impressão, e auditoria de cada acesso." }
  };
  function iniciarEscala() {
    [].forEach.call(document.querySelectorAll("[data-escala]"), function (escala) {
      var botoes = [].slice.call(escala.querySelectorAll("[data-nivel]"));
      var det = escala.parentNode.querySelector(".escala__detalhe");
      if (!det) return;
      function escolher(nivel) {
        botoes.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-nivel") === nivel ? "true" : "false"); });
        var n = NIVEIS[nivel];
        det.innerHTML = "";
        [["Quem pode ver", n.quem], ["Exemplos", n.ex], ["Controlos aplicados", n.ctrl]].forEach(function (par) {
          var w = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
          dt.textContent = par[0]; dd.textContent = par[1];
          w.appendChild(dt); w.appendChild(dd); det.appendChild(w);
        });
      }
      botoes.forEach(function (b) { b.addEventListener("click", function () { escolher(b.getAttribute("data-nivel")); }); });
      var inicial = botoes.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })[0];
      escolher(inicial ? inicial.getAttribute("data-nivel") : "confidencial");
    });
  }

  function iniciar() { iniciarRasura(); iniciarDemo(); iniciarEscala(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
