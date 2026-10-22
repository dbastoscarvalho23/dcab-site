/* Área reservada DCAB — modelo de dados e cálculos
 * Replica as fórmulas do ficheiro "Controlo_Execucao_Candidatura_IA_Dcab_Consulting.xlsx".
 * Módulo sem dependências: pode ser testado fora do navegador.
 */

// Quadro de Investimento Aprovado (Dossier de Projeto IA, SelectAdvisor, Lda., pág. 4)
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
export const LINHA = Object.fromEntries(QUADRO.map((l) => [l.codigo, l]));

export const ESTADOS_DESPESA = ["Lançada", "Paga", "Submetida em PP", "Validada", "Não elegível"];
export const MEIOS_PAGAMENTO = ["Transferência bancária", "Débito direto", "Cartão", "Cheque", "Processamento salarial", "Outro"];
export const TIPOS_PEDIDO = ["Adiantamento", "Pedido de pagamento intercalar", "Pedido de pagamento de saldo final", "Reembolso / Acerto"];
export const ESTADOS_PEDIDO = ["Em preparação", "Submetido", "Em análise", "Aprovado", "Pago", "Com correções"];
export const ESTADOS_FECHADOS = ["Submetido", "Em análise", "Aprovado", "Pago"];

export const PEDIDOS_INICIAIS = [
  { codigo: "ADT", tipo: "Adiantamento" },
  ...Array.from({ length: 12 }, (_, i) => ({ codigo: "PP" + String(i + 1).padStart(2, "0"), tipo: "Pedido de pagamento intercalar" })),
  { codigo: "PSF", tipo: "Pedido de pagamento de saldo final" },
];

const n = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const arred = (v) => Math.round(v * 100) / 100;
// Taxa de comparticipação por rubrica: a aprovada, ou a alterada pelo administrador (parametros.taxas)
export function taxaRubrica(rubrica, parametros) {
  const t = parametros && parametros.taxas ? parametros.taxas[rubrica] : undefined;
  return typeof t === "number" && t >= 0 && t <= 1 ? t : RUBRICAS[rubrica].taxa;
}
export const taxaLinha = (codigo, parametros) => (LINHA[codigo] ? taxaRubrica(LINHA[codigo].rubrica, parametros) : null);

// Ordena pedidos: ADT, PP01..PPnn, PSF, restantes
export function ordemPedido(c) {
  if (c === "ADT") return 0;
  if (/^PP\d+$/.test(c)) return Number(c.slice(2));
  if (c === "PSF") return 900;
  return 1000;
}

// Datas no formato AAAA-MM-DD; EDATE(início, meses) - 1 dia
export function fimElegibilidade(inicio, duracao) {
  if (!inicio || !duracao) return "";
  const [a, m, d] = inicio.split("-").map(Number);
  const fim = new Date(Date.UTC(a, m - 1 + Number(duracao), d));
  fim.setUTCDate(fim.getUTCDate() - 1);
  return fim.toISOString().slice(0, 10);
}

export function mesesProjeto(inicio, duracao) {
  if (!inicio || !duracao) return [];
  const [a, m] = inicio.split("-").map(Number);
  return Array.from({ length: Number(duracao) }, (_, i) => {
    const dt = new Date(Date.UTC(a, m - 1 + i, 1));
    return dt.toISOString().slice(0, 7); // AAAA-MM
  });
}

/* Calcula os campos automáticos e as verificações de todas as despesas.
 * despesas: lista ordenada pelo campo "ordem" (equivalente à ordem das linhas no Excel). */
export function calcularDespesas(despesas, parametros, pedidos) {
  const fim = fimElegibilidade(parametros.inicio, parametros.duracao);
  const contagemDoc = {};
  for (const d of despesas) {
    if (d.nif && d.documento) {
      const k = d.nif.trim() + "|" + d.documento.trim().toUpperCase();
      contagemDoc[k] = (contagemDoc[k] || 0) + 1;
    }
  }
  const acumulado = {};
  const ordenadas = [...despesas].sort((a, b) => n(a.ordem) - n(b.ordem));

  return ordenadas.map((d, i) => {
    const linha = LINHA[d.linha];
    const taxa = taxaLinha(d.linha, parametros);
    const semIva = typeof d.semIva === "number" ? d.semIva : null;
    const iva = n(d.iva);
    const valorTotal = semIva === null && !d.iva ? null : arred(n(semIva) + iva);
    const elegivel = semIva === null ? null : arred(semIva + (d.ivaElegivel ? iva : 0));
    const naoElegivel = d.estado === "Não elegível";
    const comparticipacao = elegivel === null || taxa === null ? null : naoElegivel ? 0 : arred(elegivel * taxa);
    const compValidada = typeof d.valorValidado === "number" && taxa !== null ? arred(d.valorValidado * taxa) : null;

    const alertas = [];
    if (!linha) alertas.push("Linha inválida");
    if (d.nif && d.documento && contagemDoc[d.nif.trim() + "|" + d.documento.trim().toUpperCase()] > 1) alertas.push("Fatura duplicada");
    if (d.dataDocumento && parametros.inicio && (d.dataDocumento < parametros.inicio || d.dataDocumento > fim)) alertas.push("Fora do período");
    if (linha && elegivel !== null && !naoElegivel) {
      acumulado[d.linha] = arred(n(acumulado[d.linha]) + elegivel);
      if (acumulado[d.linha] > linha.valor) alertas.push("Excede saldo da linha");
    }
    if (linha && linha.rubrica === 4 && !d.mesReferencia) alertas.push("Falta mês de referência");
    if (semIva === null) alertas.push("Falta valor");
    if (!d.dataPagamento) alertas.push("Sem data de pagamento");
    if (!d.pedido) alertas.push("Sem pedido de pagamento");

    const pedido = d.pedido ? pedidos[d.pedido] : null;
    const fechado = !!(pedido && ESTADOS_FECHADOS.includes(pedido.estado));

    return { ...d, numero: i + 1, rubrica: linha ? linha.rubrica : null, taxa, valorTotal, elegivel, comparticipacao, compValidada, alertas, fechado };
  });
}

// Quadro de Investimento: execução por linha (comparticipação limitada ao valor aprovado)
export function calcularQuadro(calculadas, parametros) {
  return QUADRO.map((l) => {
    const taxa = taxaRubrica(l.rubrica, parametros);
    const daLinha = calculadas.filter((d) => d.linha === l.codigo);
    const executada = arred(daLinha.filter((d) => d.estado !== "Não elegível").reduce((s, d) => s + n(d.elegivel), 0));
    const validada = arred(daLinha.reduce((s, d) => s + n(d.valorValidado), 0));
    return {
      ...l,
      taxa,
      taxaAprovada: RUBRICAS[l.rubrica].taxa,
      taxaAlterada: taxa !== RUBRICAS[l.rubrica].taxa,
      compAprovada: arred(l.valor * taxa),
      contribuicaoPropria: arred(l.valor - l.valor * taxa),
      executada,
      compExecutada: arred(Math.min(executada, l.valor) * taxa),
      validada,
      compValidada: arred(Math.min(validada, l.valor) * taxa),
      saldo: arred(l.valor - executada),
      percentagem: l.valor ? executada / l.valor : 0,
    };
  });
}

export function calcularRubricas(quadro) {
  return Object.entries(RUBRICAS).map(([num, r]) => {
    const ls = quadro.filter((l) => l.rubrica === Number(num));
    const soma = (k) => arred(ls.reduce((s, l) => s + l[k], 0));
    const aprovado = soma("valor");
    return {
      numero: Number(num), nome: r.nome, curto: r.curto, taxa: ls.length ? ls[0].taxa : r.taxa,
      taxaAlterada: ls.length ? ls[0].taxaAlterada : false, aprovado,
      compAprovada: soma("compAprovada"), executada: soma("executada"),
      percentagem: aprovado ? soma("executada") / aprovado : 0,
      compExecutada: soma("compExecutada"), compValidada: soma("compValidada"), saldo: soma("saldo"),
    };
  });
}

// Controlo de transferências por pedido
export function calcularPedidos(pedidos, calculadas) {
  return Object.values(pedidos)
    .sort((a, b) => ordemPedido(a.codigo) - ordemPedido(b.codigo) || a.codigo.localeCompare(b.codigo))
    .map((p) => {
      const ds = calculadas.filter((d) => d.pedido === p.codigo);
      const imputada = arred(ds.filter((d) => d.estado !== "Não elegível").reduce((s, d) => s + n(d.elegivel), 0));
      const apresentada = arred(ds.reduce((s, d) => s + n(d.comparticipacao), 0));
      const validada = arred(ds.reduce((s, d) => s + n(d.compValidada), 0));
      const temTransf = typeof p.valorTransferido === "number";
      const diferenca = !temTransf && apresentada === 0 ? null : arred(n(p.valorTransferido) - (validada > 0 ? validada : apresentada));
      return { ...p, imputada, apresentada, validada, diferenca, fechado: ESTADOS_FECHADOS.includes(p.estado), despesas: ds.length };
    });
}

export function calcularContratacao(parametros, calculadas, hoje) {
  const meses = mesesProjeto(parametros.inicio, parametros.duracao);
  const referencia = parametros.duracao ? arred(LINHA["4.1"].valor / Number(parametros.duracao)) : null;
  const mesAtual = hoje.slice(0, 7);
  const porConsultor = (codigo) => meses.map((mes, i) => {
    const valor = arred(calculadas
      .filter((d) => d.linha === codigo && d.mesReferencia === mes && d.estado !== "Não elegível")
      .reduce((s, d) => s + n(d.elegivel), 0));
    const estado = valor > 0 ? "Lançado" : mes <= mesAtual ? "Em falta" : "Por lançar";
    return { numero: i + 1, mes, valor, estado, desvio: valor > 0 && referencia !== null ? arred(valor - referencia) : null };
  });
  const c1 = porConsultor("4.1");
  const c2 = porConsultor("4.2");
  return {
    referencia, c1, c2,
    emFalta: c1.filter((m) => m.estado === "Em falta").length + c2.filter((m) => m.estado === "Em falta").length,
  };
}

export function calcularResumo(quadro, pedidosCalc, calculadas, contratacao) {
  const compAprovada = arred(quadro.reduce((s, l) => s + l.compAprovada, 0));
  const compExecutada = arred(quadro.reduce((s, l) => s + l.compExecutada, 0));
  const compValidada = arred(quadro.reduce((s, l) => s + l.compValidada, 0));
  const executada = arred(quadro.reduce((s, l) => s + l.executada, 0));
  const recebido = arred(pedidosCalc.reduce((s, p) => s + n(p.valorTransferido), 0));
  const apresentada = arred(pedidosCalc.reduce((s, p) => s + p.apresentada, 0));
  return {
    totalAprovado: TOTAL_APROVADO,
    compAprovada, compExecutada, compValidada, executada, recebido, apresentada,
    saldoReceber: arred(compAprovada - recebido),
    porJustificar: arred(Math.max(0, recebido - apresentada)),
    semPedido: arred(calculadas.filter((d) => !d.pedido).reduce((s, d) => s + n(d.comparticipacao), 0)),
    execucaoGlobal: TOTAL_APROVADO ? executada / TOTAL_APROVADO : 0,
    comAlertas: calculadas.filter((d) => d.alertas.length).length,
    mesesEmFalta: contratacao.emFalta,
  };
}

// Validação de uma despesa antes de gravar (espelha as regras do Firestore)
export function validarDespesa(d) {
  const erros = [];
  if (!LINHA[d.linha]) erros.push("Escolha a linha orçamental.");
  if (typeof d.semIva !== "number" || d.semIva < 0) erros.push("Indique o valor sem IVA.");
  if (d.iva !== null && (typeof d.iva !== "number" || d.iva < 0)) erros.push("O IVA tem de ser um valor positivo.");
  if (d.nif && !/^\d{9}$/.test(d.nif)) erros.push("O NIF tem de ter 9 dígitos.");
  if (!ESTADOS_DESPESA.includes(d.estado)) erros.push("Escolha o estado da despesa.");
  if (LINHA[d.linha] && LINHA[d.linha].rubrica === 4 && !d.mesReferencia) erros.push("Nas linhas de contratação, o mês de referência é obrigatório.");
  return erros;
}

/* Leitura do QR code das faturas portuguesas (Portaria n.º 195/2020, especificações técnicas da AT).
 * Formato: campos "CHAVE:valor" separados por "*". Devolve null se o texto não for um QR de fatura. */
export function lerQrFatura(texto) {
  if (typeof texto !== "string" || texto.length > 2000) return null;
  const c = {};
  for (const parte of texto.trim().split("*")) {
    const i = parte.indexOf(":");
    if (i > 0) c[parte.slice(0, i).trim().toUpperCase()] = parte.slice(i + 1).trim();
  }
  if (!/^\d{9}$/.test(c.A || "") || !/^\d{8}$/.test(c.F || "") || c.O === undefined) return null;
  const num = (k) => { const v = Number(c[k]); return c[k] !== undefined && c[k] !== "" && isFinite(v) ? v : 0; };
  const soma = (ks) => arred(ks.reduce((s, k) => s + num(k), 0));
  const bases = soma(["I2", "I3", "I5", "I7", "J2", "J3", "J5", "J7", "K2", "K3", "K5", "K7", "L"]);
  const iva = soma(["I4", "I6", "I8", "J4", "J6", "J8", "K4", "K6", "K8"]);
  const total = num("O"), selo = num("M"), impostos = num("N");
  const semIva = bases > 0 ? bases : arred(total - impostos);
  const dataDocumento = c.F.slice(0, 4) + "-" + c.F.slice(4, 6) + "-" + c.F.slice(6, 8);

  const avisos = [];
  if (c.B && c.B !== NIF_BENEFICIARIO) avisos.push("A fatura foi emitida ao NIF " + c.B + " e não ao NIF da DCAB (" + NIF_BENEFICIARIO + "). Pode não ser elegível.");
  if (c.E === "A") avisos.push("O documento está anulado.");
  if (c.D === "NC") avisos.push("É uma nota de crédito: confirme como a registar.");
  if (c.D === "OR" || c.D === "PF" || c.D === "FO") avisos.push("É um orçamento ou fatura pró-forma, que não é comprovativo de despesa.");
  if (Math.abs(semIva + iva + selo - total) > 0.05) avisos.push("Os valores lidos não somam o total do documento (" + total.toFixed(2) + " €). Confirme-os.");

  return {
    nif: c.A, adquirente: c.B || "", tipo: c.D || "", documento: (c.G || "").slice(0, 60), dataDocumento,
    atcud: c.H || "", semIva, iva, total, avisos,
  };
}
