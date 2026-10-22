/* DCAB Consulting — vídeo da abertura.
 * A entrada toca uma vez; depois passa, sem corte, para um ciclo contínuo e lento.
 * Com «movimento reduzido» ou «poupança de dados» ativos, mostra só a imagem final.
 * O ciclo pausa quando a abertura sai do ecrã e há um botão para parar a animação
 * (WCAG 2.2.2). A escolha fica guardada neste navegador.
 */
document.addEventListener("DOMContentLoaded", () => {
  const abertura = document.querySelector(".abertura");
  const entrada = document.querySelector(".abertura__video--entrada");
  const ciclo = document.querySelector(".abertura__video--ciclo");
  if (!abertura || !entrada || !ciclo) return;

  const CHAVE = "dcab-animacao";
  const ler = () => { try { return localStorage.getItem(CHAVE); } catch { return null; } };
  const gravar = (v) => { try { v ? localStorage.setItem(CHAVE, v) : localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } };

  const estatica = () => {
    abertura.classList.add("abertura--estatica");
    for (const v of [entrada, ciclo]) { v.removeAttribute("autoplay"); v.preload = "none"; v.pause(); }
  };
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const poupanca = navigator.connection && navigator.connection.saveData;
  if (reduzido || poupanca) return estatica();

  // Botão para parar e retomar a animação
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "abertura__pausa";
  const rotulo = (parada) => {
    botao.textContent = parada ? "Retomar animação" : "Parar animação";
    botao.setAttribute("aria-pressed", parada ? "true" : "false");
  };
  abertura.appendChild(botao);

  if (ler() === "parada") { estatica(); rotulo(true); }
  else rotulo(false);

  let emCiclo = false;
  const passarAoCiclo = () => {
    if (emCiclo || abertura.classList.contains("abertura--estatica")) return;
    emCiclo = true;
    ciclo.currentTime = 0;
    const p = ciclo.play();
    const esconder = () => { entrada.hidden = true; };
    if (p && p.then) p.then(esconder).catch(esconder); else esconder();
  };

  botao.addEventListener("click", () => {
    const parar = !abertura.classList.contains("abertura--estatica");
    if (parar) { estatica(); gravar("parada"); }
    else {
      gravar(null);
      abertura.classList.remove("abertura--estatica");
      entrada.hidden = true;
      emCiclo = false;
      ciclo.preload = "auto";
      passarAoCiclo();
    }
    rotulo(parar);
  });

  if (abertura.classList.contains("abertura--estatica")) return;

  // O ciclo só começa a descarregar depois de a entrada arrancar (não atrasa o carregamento inicial)
  entrada.addEventListener("playing", () => { ciclo.preload = "auto"; ciclo.load(); }, { once: true });
  entrada.addEventListener("ended", passarAoCiclo);
  entrada.addEventListener("error", passarAoCiclo);
  const p = entrada.play();
  if (p && p.catch) p.catch(() => { estatica(); rotulo(true); });

  // Pausa o ciclo fora do ecrã
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      if (!emCiclo || abertura.classList.contains("abertura--estatica")) return;
      if (e.isIntersecting) ciclo.play().catch(() => {}); else ciclo.pause();
    }).observe(abertura);
  }
});
