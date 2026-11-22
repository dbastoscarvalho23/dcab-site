/* Configuração da área reservada DCAB Consulting.
 * Estes valores identificam o projeto Firebase e são públicos por natureza;
 * a proteção dos dados é feita pelas regras do Firestore e pela autenticação.
 */
export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyD5bcfJ7tKvuMuLcs-sjkZhihsVcTKn_GU",
    authDomain: "dcabconsulting.com",
    projectId: "dcab-consulting",
    appId: "1:921274534415:web:2387c3aebc151cbc5b717a",
  },
  projetoId: "ai4cybersecurity",
  // Bucket do Storage para as faturas em lote (versão 1.6). Confirmar o nome na Consola Firebase › Storage.
  storageBucket: "dcab-consulting.firebasestorage.app",
  dominioGoogle: "dcabconsulting.com",
  emissorMfa: "DCAB Consulting",
  inatividadeMinutos: 30,
};
