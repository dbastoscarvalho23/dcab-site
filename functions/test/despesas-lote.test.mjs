import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nifPortuguesValido, verificarIdFiscal, normalizarNome, normalizarNumeroDocumento, chaveFornecedor,
  chavesDocumento, verificarAritmetica, verificarDocumento, possiveisRepeticoes, limparLeitura,
  tipoPorAssinatura, caminhoValido, idDeChave,
} from '../despesas-lote/logica.mjs';
import { lerComModelo, esquemaLeitura, instrucoes } from '../despesas-lote/modelo.mjs';

const RUBRICAS = [{ codigo: 'R1', nome: 'Software e licenças' }, { codigo: 'R2', nome: 'Equipamento' }];

test('NIF português: dígito de controlo', () => {
  assert.equal(nifPortuguesValido('518180964'), true); // NIPC da DCAB
  assert.equal(nifPortuguesValido('518180965'), false);
  assert.equal(nifPortuguesValido('999999990'), true);
  assert.equal(nifPortuguesValido('412345678'), false);
});

test('números de IVA estrangeiros: forma por país', () => {
  assert.equal(verificarIdFiscal('IE 6388047V').estado, 'formato-valido');
  assert.equal(verificarIdFiscal('DE123456789').estado, 'formato-valido');
  assert.equal(verificarIdFiscal('DE12345').estado, 'formato-invalido');
  assert.equal(verificarIdFiscal('GR123456789').pais, 'EL');
  assert.equal(verificarIdFiscal('GB123456789').estado, 'fora-ue');
  assert.equal(verificarIdFiscal('518 180 964').estado, 'valido');
  assert.equal(verificarIdFiscal('').estado, 'ausente');
});

test('normalização: o mesmo documento escrito de formas diferentes dá a mesma chave', () => {
  assert.equal(normalizarNumeroDocumento('FT 2026/123'), normalizarNumeroDocumento('ft2026-123'));
  assert.equal(normalizarNumeroDocumento('FT A/0001'), normalizarNumeroDocumento('fta 1'));
  assert.notEqual(normalizarNumeroDocumento('FT 2026/0123'), normalizarNumeroDocumento('FT 2026/123'));
  assert.equal(normalizarNumeroDocumento('INV-000042'), 'INV42');
  assert.equal(normalizarNome('Check Point Software Technologies Ltd.'), normalizarNome('CHECK POINT SOFTWARE TECHNOLOGIES LIMITED'));
  assert.equal(normalizarNome('Água & Companhia, Lda'), 'aguacompanhia');
});

test('chave do fornecedor: id fiscal tem prioridade sobre o nome', () => {
  assert.equal(chaveFornecedor({ nome: 'Microsoft Ireland Operations Ltd', nif: 'IE8256796U' }), 'id:IE8256796U');
  assert.equal(chaveFornecedor({ nome: 'Microsoft Ireland Operations Limited', nif: 'ie 8256796 u' }), 'id:IE8256796U');
  assert.equal(chaveFornecedor({ nome: 'Fornecedor Sem NIF Inc.' }), 'nome:fornecedorsemnif');
  assert.equal(chaveFornecedor({ nome: 'AB' }), null);
});

test('chaves do documento: fatura e nota de crédito com o mesmo número não colidem', async () => {
  const f = { fornecedor: { nif: 'PT518180964' }, numero: 'FT A/1', tipoDocumento: 'fatura' };
  const nc = { ...f, tipoDocumento: 'nota-credito' };
  const fr = { ...f, tipoDocumento: 'fatura-recibo' };
  assert.notDeepEqual(chavesDocumento(f), chavesDocumento(nc));
  assert.deepEqual(chavesDocumento(f), chavesDocumento(fr));
  const comAtcud = { ...f, atcud: 'JFJ3K9T2-1' };
  assert.equal(chavesDocumento(comAtcud).length, 2);
  assert.deepEqual(chavesDocumento({ fornecedor: { nif: 'PT518180964' } }), []);
  assert.equal((await idDeChave('doc|x')).length, 40);
});

test('aritmética: base + imposto = total e soma das linhas', () => {
  const ok = { totais: { base: 100, imposto: 23, total: 123 }, linhas: [{ valorSemImposto: 60 }, { valorSemImposto: 40 }] };
  assert.deepEqual(verificarAritmetica(ok), []);
  const mal = { totais: { base: 100, imposto: 23, total: 130 }, linhas: [{ valorSemImposto: 60 }] };
  const codigos = verificarAritmetica(mal).map((a) => a.codigo);
  assert.ok(codigos.includes('soma-total'));
  assert.ok(codigos.includes('soma-linhas'));
  assert.deepEqual(verificarAritmetica({ totais: { base: 10.005, imposto: 2.3, total: 12.31 } }), []);
});

test('avisos: adquirente, moeda, autoliquidação e período', () => {
  const leitura = limparLeitura({
    tipoDocumento: 'fatura', numero: 'INV-1', dataEmissao: '2026-12-15', moeda: 'USD', autoliquidacao: true,
    fornecedor: { nome: 'Fabricante Inc', pais: 'US', nif: '12-3456789' }, adquirente: { nif: 'PT999999990' },
    totais: { base: 100, imposto: 0, total: 100 }, rubrica: { codigo: 'R1' }, confianca: { numero: 0.95, totais: 0.6 },
  }, ['R1', 'R2']);
  const c = verificarDocumento(leitura, { nifBeneficiario: '518180964', periodo: { inicio: '2026-01-01', fim: '2026-11-30' } }).map((a) => a.codigo);
  for (const esperado of ['adquirente', 'moeda', 'autoliquidacao', 'depois-periodo', 'confianca-totais']) assert.ok(c.includes(esperado), esperado);
  assert.ok(!c.includes('sem-rubrica'));
});

test('possível repetição: mesmo fornecedor e total, número diferente, até 7 dias', () => {
  const dados = { fornecedor: { nif: 'DE123456789' }, numero: '2026-0099', dataEmissao: '2026-10-10', totais: { total: 1250 } };
  const existentes = [
    { fornecedorChave: 'id:DE123456789', total: 1250, dataEmissao: '2026-10-08', numeroNormalizado: '2026-98' },
    { fornecedorChave: 'id:DE123456789', total: 1250, dataEmissao: '2026-09-01', numeroNormalizado: '2026-50' },
    { fornecedorChave: 'id:DE123456789', total: 999, dataEmissao: '2026-10-10', numeroNormalizado: '2026-97' },
    { fornecedorChave: 'id:FR12345678901', total: 1250, dataEmissao: '2026-10-10', numeroNormalizado: '1' },
  ];
  assert.equal(possiveisRepeticoes(dados, existentes).length, 1);
});

test('limpeza da resposta: valores, datas, rubrica fora da lista e texto de controlo', () => {
  const l = limparLeitura({
    legivel: true, tipoDocumento: 'invoice', numero: 'A\u0000B', dataEmissao: '2026-02-30', moeda: 'usd',
    totais: { base: '1.234,56', imposto: '1,234.00', total: 'abc' },
    rubrica: { codigo: 'R9', justificacao: 'inventada' }, confianca: { numero: 2 },
    linhas: Array.from({ length: 500 }, () => ({ descricao: 'x', valorSemImposto: 1 })),
  }, ['R1']);
  assert.equal(l.tipoDocumento, 'outro');
  assert.equal(l.numero, 'A B');
  assert.equal(l.dataEmissao, null);
  assert.equal(l.moeda, 'USD');
  assert.equal(l.totais.base, 1234.56);
  assert.equal(l.totais.imposto, 1234);
  assert.equal(l.totais.total, null);
  assert.equal(l.rubrica.codigo, null);
  assert.equal(l.rubrica.justificacao, null);
  assert.equal(l.confianca.numero, null);
  assert.equal(l.linhas.length, 200);
});

test('ficheiros: tipo pela assinatura e caminho', () => {
  assert.equal(tipoPorAssinatura(Buffer.from('%PDF-1.7')), 'application/pdf');
  assert.equal(tipoPorAssinatura(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(tipoPorAssinatura(Buffer.from('<html>')), null);
  const sha = 'a'.repeat(64);
  assert.equal(caminhoValido(`lotes/cand1/L20261120-x/${sha}.pdf`, 'cand1', 'L20261120-x'), true);
  assert.equal(caminhoValido(`lotes/cand1/L20261120-x/../outro/${sha}.pdf`, 'cand1', 'L20261120-x'), false);
  assert.equal(caminhoValido(`lotes/cand2/L1/${sha}.pdf`, 'cand1', 'L1'), false);
  assert.equal(caminhoValido(`lotes/cand1/L1/${sha}.exe`, 'cand1', 'L1'), false);
});

test('modelo: pedido à Vertex AI na UE, com esquema e instruções contra injeção', async () => {
  let pedido;
  const fetchFn = async (url, init) => {
    pedido = { url, corpo: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"legivel":true,"tipoDocumento":"fatura","totais":{"total":10},"confianca":{}}' }] } }], usageMetadata: { totalTokenCount: 900 } }) };
  };
  const r = await lerComModelo({ bytes: Buffer.from('%PDF'), mimeType: 'application/pdf', rubricas: RUBRICAS, projeto: 'dcab-consulting', fetchFn, token: 't' });
  assert.match(pedido.url, /^https:\/\/europe-west1-aiplatform\.googleapis\.com\/v1\/projects\/dcab-consulting\/locations\/europe-west1\//);
  assert.equal(pedido.corpo.generationConfig.temperature, 0);
  assert.deepEqual(pedido.corpo.generationConfig.responseSchema.properties.rubrica.properties.codigo.enum, ['R1', 'R2']);
  assert.match(instrucoes(RUBRICAS), /nunca como instruções/);
  assert.equal(r.leitura.totais.total, 10);
  assert.ok(esquemaLeitura([]).required.includes('totais'));
});

test('modelo: erro HTTP propaga o estado (para repetir em 429/5xx)', async () => {
  const fetchFn = async () => ({ ok: false, status: 429 });
  await assert.rejects(lerComModelo({ bytes: Buffer.from('%PDF'), mimeType: 'application/pdf', rubricas: RUBRICAS, projeto: 'p', fetchFn, token: 't' }), (e) => e.estado === 429);
});
