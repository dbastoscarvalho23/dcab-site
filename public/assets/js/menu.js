/* DCAB Consulting — menu de navegação no telemóvel.
 * Sem JavaScript, o menu fica sempre visível (classe «sem-js» no elemento html).
 */
(function () {
  "use strict";
  document.documentElement.classList.remove("sem-js");
  function iniciar() {
    var botao = document.querySelector(".topo__menu");
    var nav = document.getElementById("menu-principal");
    if (!botao || !nav) return;
    function fechar() { nav.classList.remove("aberto"); botao.setAttribute("aria-expanded", "false"); }
    botao.addEventListener("click", function () {
      var aberto = nav.classList.toggle("aberto");
      botao.setAttribute("aria-expanded", aberto ? "true" : "false");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) fechar(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("aberto")) { fechar(); botao.focus(); }
    });
    window.matchMedia("(min-width: 861px)").addEventListener("change", function (m) { if (m.matches) fechar(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
