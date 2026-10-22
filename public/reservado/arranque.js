/* Área reservada — vigilância do arranque.
 * Se a aplicação não arrancar (biblioteca bloqueada, configuração em falta, erro de rede),
 * mostra a causa em vez de uma página vazia. Script clássico, carregado antes do módulo principal.
 */
(function () {
  var ultimoErro = "";
  function registar(msg) { if (msg && !ultimoErro) ultimoErro = String(msg).slice(0, 300); }
  window.addEventListener("error", function (e) {
    if (e && e.target && e.target.tagName === "SCRIPT") registar("Não foi possível carregar " + (e.target.src || "um script"));
    else registar(e && (e.message || (e.error && e.error.message)));
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    registar(r && (r.code ? r.code + " — " + (r.message || "") : r.message || r));
  });

  window.__falhaArranque = function (titulo, texto, detalhe) {
    var ecra = document.getElementById("ecra-carregar");
    if (!ecra) return;
    document.querySelectorAll(".ecra, #app").forEach(function (el) { el.hidden = el !== ecra; });
    document.getElementById("carregar-titulo").textContent = titulo;
    document.getElementById("carregar-texto").textContent = texto;
    var d = document.getElementById("carregar-detalhe");
    d.textContent = "Detalhe técnico: " + (detalhe || ultimoErro || "sem resposta dos serviços de autenticação");
    d.hidden = false;
  };

  setTimeout(function () {
    var ecra = document.getElementById("ecra-carregar");
    if (ecra && !ecra.hidden) {
      window.__falhaArranque(
        "Não foi possível iniciar a área reservada",
        "Recarregue a página com Cmd + Shift + R. Se o problema continuar, envie ao administrador o detalhe técnico abaixo."
      );
    }
  }, 12000);
})();
