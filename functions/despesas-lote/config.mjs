// Coleções usadas pela submissão em lote (alinhadas com a área reservada 1.5).
// A candidatura é o documento projetos/{projeto}; as despesas, propostas, índice e auditoria ficam por baixo dele.
export const CONFIG = Object.freeze({
  candidaturas: 'projetos',
  despesas: 'despesas',
  propostas: 'despesasPropostas',
  indice: 'indiceDespesas',
  auditoria: 'auditoria',
  acessos: 'acessos', // documento por email, em minúsculas
  projetosPermitidos: ['ai4cybersecurity'],
});
