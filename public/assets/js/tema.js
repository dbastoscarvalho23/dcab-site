/* DCAB Consulting — tema claro e escuro (versão 1.5).
 * Carregado no <head> sem «defer», para aplicar o tema antes de a página aparecer.
 * Sem escolha guardada, segue a preferência do sistema. A escolha fica só neste
 * navegador (localStorage), não é enviada a lado nenhum e não usa cookies.
 */
(function () {
  "use strict";
  var CHAVE = "dcab-tema";
  var raiz = document.documentElement;
  function ler() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function gravar(v) { try { localStorage.setItem(CHAVE, v); } catch (e) { /* sem armazenamento */ } }
  var guardado = ler();
  if (guardado === "dark" || guardado === "light") raiz.setAttribute("data-theme", guardado);

  function escuro() {
    var t = raiz.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function atualizar() {
    var e = escuro();
    var botoes = document.querySelectorAll("[data-tema]");
    for (var i = 0; i < botoes.length; i++) {
      var b = botoes[i];
      b.setAttribute("aria-pressed", e ? "true" : "false");
      var r = b.querySelector("span");
      if (r) r.textContent = e ? "Tema claro" : "Tema escuro";
      b.setAttribute("aria-label", e ? "Mudar para o tema claro" : "Mudar para o tema escuro");
    }
  }
  function iniciar() {
    var botoes = document.querySelectorAll("[data-tema]");
    for (var i = 0; i < botoes.length; i++) {
      botoes[i].hidden = false;
      botoes[i].addEventListener("click", function () {
        var novo = escuro() ? "light" : "dark";
        raiz.setAttribute("data-theme", novo);
        gravar(novo);
        atualizar();
      });
    }
    atualizar();
    if (window.matchMedia) {
      var m = window.matchMedia("(prefers-color-scheme: dark)");
      if (m.addEventListener) m.addEventListener("change", atualizar);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
