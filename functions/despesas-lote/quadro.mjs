// Cópia do quadro de investimento de public/reservado/modelo.js (o servidor não lê ficheiros de public/).
// Tem de ser igual: verificado pelo teste test/despesas-lote.test.mjs.
export const RUBRICAS = {
  1: { nome: "Aquisição de equipamentos e componentes para incorporação das soluções de IA", curto: "Equipamentos", taxa: 0.75 },
  2: { nome: "Aquisição de software, incluindo subscrições SaaS", curto: "Software e SaaS", taxa: 0.75 },
  3: { nome: "Aquisição de software, incluindo subscrições SaaS (infraestrutura e plataforma)", curto: "Software e SaaS — infraestrutura", taxa: 0.75 },
  4: { nome: "Contratação de até 2 técnicos ou gestores de plataformas (24 meses)", curto: "Contratação", taxa: 1 },
  5: { nome: "Intervenção de contabilista certificado ou ROC na validação dos pedidos de pagamento", curto: "Contabilista / ROC", taxa: 1 },
};

export const QUADRO = [
  { codigo: "1.1", rubrica: 1, descricao: "Servidores NVIDIA (2 unidades)", valor: 10200 },
  { codigo: "1.2", rubrica: 1, descricao: "Workstations IA HP ZBook 8 (5 unidades)", valor: 13500 },
  { codigo: "2.1", rubrica: 2, descricao: "Office 365 Copilot", valor: 12500 },
  { codigo: "2.2", rubrica: 2, descricao: "Gemini Pro – subscrição 24 meses", valor: 13950 },
  { codigo: "2.3", rubrica: 2, descricao: "Integração LLM – subscrição 24 meses", valor: 45500 },
  { codigo: "2.4", rubrica: 2, descricao: "OpenAI – subscrição 24 meses", valor: 2000 },
  { codigo: "2.5", rubrica: 2, descricao: "Claude Users", valor: 500 },
  { codigo: "2.6", rubrica: 2, descricao: "Budgyt – subscrição 24 meses", valor: 6000 },
  { codigo: "2.7", rubrica: 2, descricao: "CRM Inteligente – subscrição 24 meses", valor: 12000 },
  { codigo: "2.8", rubrica: 2, descricao: "Tableau – subscrição 24 meses", valor: 20000 },
  { codigo: "3.1", rubrica: 3, descricao: "Frontend PROD – 24 meses", valor: 1800 },
  { codigo: "3.2", rubrica: 3, descricao: "Backend PROD – 24 meses", valor: 4200 },
  { codigo: "3.3", rubrica: 3, descricao: "Desenvolvimento – 24 meses", valor: 1440 },
  { codigo: "3.4", rubrica: 3, descricao: "DR (Disaster Recovery) – 24 meses", valor: 4080 },
  { codigo: "3.5", rubrica: 3, descricao: "Storage Frontend/Backend/Desenvolvimento & DR – 24 meses", valor: 960 },
  { codigo: "3.6", rubrica: 3, descricao: "Plataforma de Computação IA", valor: 60000 },
  { codigo: "3.7", rubrica: 3, descricao: "Integração LLM Público", valor: 18000 },
  { codigo: "3.8", rubrica: 3, descricao: "AWS Web Application Firewall", valor: 36000 },
  { codigo: "4.1", rubrica: 4, descricao: "Consultor Sénior 1 – Analista de Risco e Maturidade (24 meses)", valor: 65662.5 },
  { codigo: "4.2", rubrica: 4, descricao: "Consultor Sénior 2 – Analista de Risco e Maturidade (24 meses)", valor: 65662.5 },
  { codigo: "5.1", rubrica: 5, descricao: "Contabilista Certificado ou Revisor Oficial de Contas", valor: 2500 },
];

export const TOTAL_APROVADO = 396455;
export const NIF_BENEFICIARIO = "518180964"; // DCAB Consulting, Lda.

export function fimElegibilidade(inicio, duracao) {
  if (!inicio || !duracao) return "";
  const [a, m, d] = inicio.split("-").map(Number);
  const fim = new Date(Date.UTC(a, m - 1 + Number(duracao), d));
  fim.setUTCDate(fim.getUTCDate() - 1);
  return fim.toISOString().slice(0, 10);
}

