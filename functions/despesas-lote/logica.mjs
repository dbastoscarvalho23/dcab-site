// Submissão de faturas em lote: regras sem IA (normalização, chaves de repetição,
// validações aritméticas e de identificação). Sem dependências: testável com node --test.

export const LIMITES = Object.freeze({
  bytesMax: 15 * 1024 * 1024,
  ficheirosPorLote: 50,
  toleranciaCentimos: 2,
  textoMax: 500,
  linhasMax: 200,
});

export const ESTADOS = Object.freeze({
  POR_VALIDAR: 'por-validar',
  REPETIDA: 'repetida',
  POSSIVEL_REPETICAO: 'possivel-repeticao',
  ILEGIVEL: 'ilegivel',
  VALIDADA: 'validada',
  REJEITADA: 'rejeitada',
  ERRO: 'erro',
});

const TIPOS = new Set(['fatura', 'fatura-simplificada', 'fatura-recibo', 'nota-credito', 'nota-debito', 'recibo', 'outro']);

// Famílias para efeitos de repetição: uma nota de crédito com o mesmo número de uma fatura
// não é a mesma despesa.
export function familiaTipo(tipo) {
  if (tipo === 'nota-credito') return 'NC';
  if (tipo === 'nota-debito') return 'ND';
  if (tipo === 'recibo') return 'R';
  if (tipo === 'outro' || !tipo) return 'O';
  return 'F';
}

// ---------- Identificação fiscal ----------

export function nifPortuguesValido(valor) {
  const nif = String(valor ?? '').replace(/\D/g, '');
  if (!/^[1235689]\d{8}$/.test(nif) && !/^45\d{7}$/.test(nif) && !/^7[0-9]\d{7}$/.test(nif)) return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(nif[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(nif[8]);
}

// Formatos de número de IVA intracomunitário (verificação de forma, não de existência: para isso, VIES).
const FORMATOS_IVA_UE = {
  AT: /^U\d{8}$/, BE: /^[01]\d{9}$/, BG: /^\d{9,10}$/, CY: /^\d{8}[A-Z]$/, CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/, DK: /^\d{8}$/, EE: /^\d{9}$/, EL: /^\d{9}$/, ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^\d{8}$/, FR: /^[A-HJ-NP-Z0-9]{2}\d{9}$/, HR: /^\d{11}$/, HU: /^\d{8}$/, IE: /^\d{7}[A-W][A-I]?$|^\d[A-Z+*]\d{5}[A-W]$/,
  IT: /^\d{11}$/, LT: /^(\d{9}|\d{12})$/, LU: /^\d{8}$/, LV: /^\d{11}$/, MT: /^\d{8}$/,
  NL: /^\d{9}B\d{2}$/, PL: /^\d{10}$/, PT: /^\d{9}$/, RO: /^\d{2,10}$/, SE: /^\d{12}$/,
  SI: /^\d{8}$/, SK: /^\d{10}$/, XI: /^(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
};

export function normalizarIdFiscal(valor, paisSugerido) {
  let s = String(valor ?? '').toUpperCase().replace(/[\s.\-_/]/g, '');
  if (!s) return null;
  let pais = null;
  const m = s.match(/^([A-Z]{2})(.+)$/);
  if (m && (FORMATOS_IVA_UE[m[1]] || m[1] === 'GR' || /^[A-Z]{2}$/.test(m[1]) && /\d/.test(m[2]))) {
    pais = m[1] === 'GR' ? 'EL' : m[1];
    s = m[2];
  } else if (paisSugerido) {
    pais = String(paisSugerido).toUpperCase() === 'GR' ? 'EL' : String(paisSugerido).toUpperCase();
  }
  if (!pais && /^\d{9}$/.test(s) && nifPortuguesValido(s)) pais = 'PT';
  return { pais, numero: s, completo: (pais ?? '') + s };
}

export function verificarIdFiscal(valor, paisSugerido) {
  const id = normalizarIdFiscal(valor, paisSugerido);
  if (!id) return { estado: 'ausente' };
  if (id.pais === 'PT') return { ...id, estado: nifPortuguesValido(id.numero) ? 'valido' : 'invalido' };
  const formato = FORMATOS_IVA_UE[id.pais];
  if (!formato) return { ...id, estado: 'fora-ue' };
  return { ...id, estado: formato.test(id.numero) ? 'formato-valido' : 'formato-invalido' };
}

// ---------- Normalização para chaves ----------

const SUFIXOS_SOCIETARIOS = /\b(lda|limitada|unipessoal|sa|s a|sgps|inc|incorporated|ltd|limited|llc|gmbh|ag|bv|nv|srl|sl|sas|sarl|spa|plc|corp|corporation|co|company|oy|ab|as|aps|kg)\b/g;

export function normalizarNome(nome) {
  return String(nome ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,&'"()]/g, ' ')
    .replace(SUFIXOS_SOCIETARIOS, ' ')
    .replace(/[^a-z0-9]/g, '');
}

// Os modelos e as digitalizações perdem ou trocam separadores e zeros à esquerda:
// «FT A/0001», «fta-1» e «FT A 1» dão a mesma chave; «INV-000042» e «INV 42» também.
// Zeros no meio de números («2026/0123») mantêm-se.
export function normalizarNumeroDocumento(numero) {
  const s = String(numero ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s) return null;
  return s.replace(/([A-Z])0+(?=\d)/g, '$1').replace(/^0+(?=\d)/, '');
}

export function chaveFornecedor(fornecedor) {
  const id = verificarIdFiscal(fornecedor?.nif, fornecedor?.pais);
  if (id.estado === 'valido' || id.estado === 'formato-valido' || (id.estado === 'fora-ue' && id.numero.length >= 5)) {
    return 'id:' + id.completo;
  }
  const nome = normalizarNome(fornecedor?.nome);
  return nome.length >= 3 ? 'nome:' + nome : null;
}

// Chaves que identificam o mesmo documento. Qualquer coincidência numa delas = repetido.
export function chavesDocumento(dados) {
  const fornecedor = chaveFornecedor(dados.fornecedor);
  const numero = normalizarNumeroDocumento(dados.numero);
  const chaves = [];
  if (fornecedor && numero) chaves.push(`doc|${fornecedor}|${familiaTipo(dados.tipoDocumento)}|${numero}`);
  const atcud = String(dados.atcud ?? '').toUpperCase().replace(/\s/g, '');
  if (fornecedor && /^[A-Z0-9]{8,}-\d+$/.test(atcud)) chaves.push(`atcud|${fornecedor}|${atcud}`);
  return chaves;
}

// Identificador de documento Firestore seguro a partir de uma chave.
export async function idDeChave(chave) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(chave, 'utf8').digest('hex').slice(0, 40);
}

// ---------- Valores ----------

export const centimos = (v) => (Number.isFinite(v) ? Math.round(v * 100) : null);

export function verificarAritmetica(dados) {
  const avisos = [];
  const t = dados.totais ?? {};
  const base = centimos(t.base), imposto = centimos(t.imposto), total = centimos(t.total);
  const tol = LIMITES.toleranciaCentimos;
  if (total === null) avisos.push({ codigo: 'sem-total', texto: 'Não foi possível ler o total.' });
  if (base !== null && imposto !== null && total !== null && Math.abs(base + imposto - total) > tol) {
    avisos.push({ codigo: 'soma-total', texto: `Base + imposto (${(base + imposto) / 100}) é diferente do total (${total / 100}).` });
  }
  const linhas = (dados.linhas ?? []).map((l) => centimos(l.valorSemImposto)).filter((v) => v !== null);
  if (linhas.length && base !== null) {
    const soma = linhas.reduce((a, b) => a + b, 0);
    const tolLinhas = Math.max(tol, linhas.length); // arredondamentos por linha
    if (Math.abs(soma - base) > tolLinhas) {
      avisos.push({ codigo: 'soma-linhas', texto: `As linhas somam ${soma / 100}, mas a base é ${base / 100}. Pode faltar ler alguma linha ou desconto.` });
    }
  }
  return avisos;
}

export function verificarDocumento(dados, contexto) {
  const avisos = [...verificarAritmetica(dados)];
  const conf = dados.confianca ?? {};
  for (const [campo, nome] of [['numero', 'número'], ['data', 'data'], ['fornecedor', 'fornecedor'], ['totais', 'valores']]) {
    if (typeof conf[campo] === 'number' && conf[campo] < 0.8) avisos.push({ codigo: 'confianca-' + campo, texto: `Leitura do ${nome} com pouca confiança: confirmar.` });
  }
  if (!dados.numero) avisos.push({ codigo: 'sem-numero', texto: 'Número do documento não lido: não é possível confirmar se é repetido.' });
  if (!dados.dataEmissao) avisos.push({ codigo: 'sem-data', texto: 'Data de emissão não lida.' });
  if (dados.tipoDocumento === 'recibo') avisos.push({ codigo: 'recibo', texto: 'É um recibo, não uma fatura: em regra não justifica a despesa sozinho.' });
  if (dados.tipoDocumento === 'nota-credito') avisos.push({ codigo: 'nota-credito', texto: 'Nota de crédito: abate a uma despesa já registada.' });

  const forn = verificarIdFiscal(dados.fornecedor?.nif, dados.fornecedor?.pais);
  if (forn.estado === 'invalido') avisos.push({ codigo: 'nif-fornecedor', texto: 'NIF do fornecedor com dígito de controlo errado.' });
  if (forn.estado === 'formato-invalido') avisos.push({ codigo: 'iva-fornecedor', texto: `Número de IVA do fornecedor (${forn.completo}) sem o formato do país.` });
  if (forn.estado === 'ausente') avisos.push({ codigo: 'sem-id-fornecedor', texto: 'Sem NIF nem número de IVA do fornecedor.' });

  if (contexto?.nifBeneficiario) {
    const adq = normalizarIdFiscal(dados.adquirente?.nif);
    if (!adq) avisos.push({ codigo: 'sem-adquirente', texto: 'A fatura não indica o NIF do adquirente.' });
    else if (adq.numero !== String(contexto.nifBeneficiario).replace(/\D/g, '')) {
      avisos.push({ codigo: 'adquirente', texto: `A fatura está emitida a ${adq.completo}, não ao NIF do beneficiário.` });
    }
  }

  if (dados.moeda && dados.moeda !== 'EUR') avisos.push({ codigo: 'moeda', texto: `Valores em ${dados.moeda}: indicar a taxa de câmbio segundo a regra do programa.` });
  if (dados.autoliquidacao) avisos.push({ codigo: 'autoliquidacao', texto: 'Fatura sem IVA com autoliquidação pelo adquirente: confirmar o enquadramento com o contabilista.' });

  const p = contexto?.periodo;
  if (p && dados.dataEmissao) {
    if (p.inicio && dados.dataEmissao < p.inicio) avisos.push({ codigo: 'antes-periodo', texto: `Data anterior ao início do período de elegibilidade (${p.inicio}).` });
    if (p.fim && dados.dataEmissao > p.fim) avisos.push({ codigo: 'depois-periodo', texto: `Data posterior ao fim do período de elegibilidade (${p.fim}).` });
  }
  if (dados.rubrica?.codigo == null) avisos.push({ codigo: 'sem-rubrica', texto: 'Sem rubrica proposta: escolher manualmente.' });
  return avisos;
}

// Possível repetição (não exclui, só avisa): mesmo fornecedor, mesmo total e data próxima,
// com número diferente. Casos típicos: segunda via, fatura reemitida, número mal lido.
export function possiveisRepeticoes(dados, existentes, chaveForn = chaveFornecedor(dados.fornecedor)) {
  if (!chaveForn) return [];
  const total = centimos(dados.totais?.total);
  if (total === null) return [];
  const num = normalizarNumeroDocumento(dados.numero);
  return existentes.filter((e) => {
    if (e.fornecedorChave !== chaveForn) return false;
    if (Math.abs(centimos(e.total) - total) > LIMITES.toleranciaCentimos) return false;
    if (e.numeroNormalizado && num && e.numeroNormalizado === num) return false; // já apanhado pelas chaves
    if (!e.dataEmissao || !dados.dataEmissao) return true;
    const dias = Math.abs(Date.parse(e.dataEmissao) - Date.parse(dados.dataEmissao)) / 86400000;
    return dias <= 7;
  });
}

// ---------- Limpeza da resposta do modelo ----------
// O documento é escrito por terceiros: tudo o que vem do modelo é tratado como dado não confiável.

const txt = (v, max = LIMITES.textoMax) => (v == null ? null : String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) || null);
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  if (typeof v !== 'string') return null;
  let s = v.replace(/[^\d,.\-]/g, '');
  if (!/\d/.test(s)) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};
const conf = (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : null);
const data = (v) => {
  const s = txt(v, 10);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s ? s : null;
};

export function limparLeitura(bruto, codigosRubricas) {
  const r = bruto && typeof bruto === 'object' ? bruto : {};
  const tipo = TIPOS.has(r.tipoDocumento) ? r.tipoDocumento : 'outro';
  const moeda = typeof r.moeda === 'string' && /^[A-Z]{3}$/.test(r.moeda.trim().toUpperCase()) ? r.moeda.trim().toUpperCase() : null;
  const pais = typeof r.fornecedor?.pais === 'string' && /^[A-Za-z]{2}$/.test(r.fornecedor.pais.trim()) ? r.fornecedor.pais.trim().toUpperCase() : null;
  const codigos = new Set(codigosRubricas ?? []);
  const codigoRubrica = codigos.has(r.rubrica?.codigo) ? r.rubrica.codigo : null;
  return {
    legivel: r.legivel !== false,
    tipoDocumento: tipo,
    numero: txt(r.numero, 80),
    atcud: txt(r.atcud, 80),
    dataEmissao: data(r.dataEmissao),
    moeda,
    fornecedor: { nome: txt(r.fornecedor?.nome, 200), pais, nif: txt(r.fornecedor?.nif, 40) },
    adquirente: { nome: txt(r.adquirente?.nome, 200), nif: txt(r.adquirente?.nif, 40) },
    linhas: (Array.isArray(r.linhas) ? r.linhas : []).slice(0, LIMITES.linhasMax).map((l) => ({
      descricao: txt(l?.descricao, 300),
      quantidade: num(l?.quantidade),
      valorSemImposto: num(l?.valorSemImposto),
    })),
    totais: { base: num(r.totais?.base), imposto: num(r.totais?.imposto), total: num(r.totais?.total) },
    mencoesIva: (Array.isArray(r.mencoesIva) ? r.mencoesIva : []).slice(0, 10).map((m) => txt(m, 200)).filter(Boolean),
    autoliquidacao: r.autoliquidacao === true,
    rubrica: { codigo: codigoRubrica, justificacao: codigoRubrica ? txt(r.rubrica?.justificacao, 300) : null },
    confianca: {
      numero: conf(r.confianca?.numero), data: conf(r.confianca?.data), fornecedor: conf(r.confianca?.fornecedor),
      totais: conf(r.confianca?.totais), rubrica: conf(r.confianca?.rubrica),
    },
    observacoes: txt(r.observacoes, 500),
  };
}

// ---------- Ficheiros ----------

export function tipoPorAssinatura(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  return null;
}

// Caminho no Storage: lotes/{candidatura}/{lote}/{sha256}.{ext}
export function caminhoValido(caminho, candidaturaId, loteId) {
  const seguro = /^[A-Za-z0-9_-]{1,64}$/;
  if (!seguro.test(candidaturaId) || !seguro.test(loteId)) return false;
  return new RegExp(`^lotes/${candidaturaId}/${loteId}/[a-f0-9]{64}\\.(pdf|jpg|png)$`).test(String(caminho));
}

// ---------- Despesas já registadas (separador Despesas) ----------
// Converte uma despesa da área reservada para os campos usados nas chaves de repetição.
// A despesa só guarda NIF português; o fornecedor estrangeiro é reconhecido pelo nome.
export function dadosDeDespesa(d) {
  const nif = String(d?.nif ?? '').replace(/\D/g, '');
  const semIva = typeof d?.semIva === 'number' ? d.semIva : null;
  const iva = typeof d?.iva === 'number' ? d.iva : 0;
  return {
    tipoDocumento: 'fatura',
    numero: d?.documento || null,
    atcud: (String(d?.comprovativo ?? '').match(/ATCUD\s+([A-Z0-9]{8,}-\d+)/i) || [])[1] || null,
    dataEmissao: d?.dataDocumento || null,
    fornecedor: { nome: d?.fornecedor || null, nif: nif.length === 9 ? nif : null, pais: nif.length === 9 ? 'PT' : null },
    totais: { base: semIva, imposto: iva, total: semIva === null ? null : Math.round((semIva + iva) * 100) / 100 },
    moeda: 'EUR',
  };
}

export function resumoDe(leitura) {
  return {
    fornecedor: leitura.fornecedor?.nome ?? null,
    fornecedorChave: chaveFornecedor(leitura.fornecedor),
    numero: leitura.numero ?? null,
    numeroNormalizado: normalizarNumeroDocumento(leitura.numero),
    dataEmissao: leitura.dataEmissao ?? null,
    total: leitura.totais?.total ?? null,
    moeda: leitura.moeda ?? null,
  };
}

// Campos de uma despesa nova, exatamente como as regras do Firestore aceitam (despesaValida).
export function construirDespesa({ leitura, decisao, ficheiro, loteId, email, linhasQuadro, agora }) {
  const erros = [];
  const linha = linhasQuadro.find((l) => l.codigo === decisao.linha);
  if (!linha) erros.push('Escolha uma linha orçamental da candidatura.');
  if (leitura.tipoDocumento === 'nota-credito') erros.push('Notas de crédito não entram em lote: registe-as no separador Despesas, a corrigir a despesa original.');
  const eur = leitura.moeda && leitura.moeda !== 'EUR';
  const taxa = eur ? Number(decisao.taxaCambio) : 1;
  if (eur && !(taxa > 0 && taxa < 100000)) erros.push('Indique a taxa de câmbio para euros.');
  const conv = (v) => (typeof v === 'number' ? Math.round(v * taxa * 100) / 100 : null);
  let base = leitura.totais.base;
  if (base == null && leitura.totais.total != null) base = Math.round((leitura.totais.total - (leitura.totais.imposto ?? 0)) * 100) / 100;
  if (base == null) erros.push('Indique o valor sem IVA.');
  else if (base < 0) erros.push('Valor negativo: registe-o no separador Despesas.');
  const mes = String(decisao.mesReferencia ?? '');
  if (linha?.rubrica === 4 && !/^\d{4}-\d{2}$/.test(mes)) erros.push('Indique o mês de referência (linhas de contratação).');
  if (erros.length) return { erros };

  const id = verificarIdFiscal(leitura.fornecedor.nif, leitura.fornecedor.pais);
  const nifPt = id.estado === 'valido' ? id.numero : '';
  const obs = [
    `Submetida em lote (${loteId}); leitura por IA validada por ${email}.`,
    !nifPt && id.completo ? `Id. fiscal do fornecedor: ${id.completo}.` : null,
    eur ? `Valores em ${leitura.moeda} convertidos à taxa ${taxa}${decisao.fonteCambio ? ' (' + String(decisao.fonteCambio).slice(0, 60) + ')' : ''}.` : null,
    leitura.autoliquidacao ? 'Autoliquidação de IVA pelo adquirente.' : null,
    decisao.observacoes ? String(decisao.observacoes) : null,
  ].filter(Boolean).join(' ');
  const comprovativo = [leitura.atcud ? 'ATCUD ' + leitura.atcud : null, 'Arquivo: ' + ficheiro.caminho].filter(Boolean).join(' · ');
  const descricao = leitura.linhas.map((x) => x.descricao).filter(Boolean).join('; ') || leitura.observacoes || '';
  return {
    despesa: {
      linha: linha.codigo,
      fornecedor: String(leitura.fornecedor.nome ?? '').slice(0, 150),
      nif: nifPt,
      documento: String(leitura.numero ?? '').slice(0, 60),
      dataDocumento: leitura.dataEmissao ?? '',
      mesReferencia: linha.rubrica === 4 ? mes : '',
      descricao: descricao.slice(0, 300),
      semIva: conv(base),
      iva: conv(leitura.totais.imposto),
      ivaElegivel: decisao.ivaElegivel === true,
      dataPagamento: '',
      meioPagamento: '',
      pedido: '',
      estado: 'Lançada',
      valorValidado: null,
      comprovativo: comprovativo.slice(0, 200),
      observacoes: obs.slice(0, 500),
      ordem: agora,
      criadoPor: email,
      atualizadoPor: email,
    },
  };
}
