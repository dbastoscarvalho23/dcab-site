/* DCAB Consulting — pré-seleciona o assunto do formulário a partir do endereço (?assunto=…).
 * Usado pelas ligações do Observatório («Receber plano de correção priorizado», exclusão de domínio)
 * e pelo botão «Pedir apoio urgente» da página de resposta a incidentes (?assunto=incidente). */
document.addEventListener("DOMContentLoaded", () => {
  const MAPA = {
    plano: "Diagnóstico completo e plano de correção",
    exclusao: "Exclusão de domínio do Observatório",
    dados: "Proteção de dados",
    incidente: "Incidente: pedido de apoio urgente",
  };
  const chave = new URLSearchParams(location.search).get("assunto");
  const campo = document.getElementById("assunto");
  if (!chave || !campo || !MAPA[chave]) return;
  if ([...campo.options].some((o) => o.value === MAPA[chave] || o.text === MAPA[chave])) campo.value = MAPA[chave];
});
