// Funções da submissão de faturas em lote (Cloud Functions v2, europe-west1).
//   lerFatura         — lê um ficheiro já carregado no Storage, deteta repetidos e cria a proposta
//   decidirDespesa    — validar, rejeitar ou (só admin) incluir uma repetida com motivo
//   libertarIndiceDespesa — quando uma despesa é apagada no separador Despesas, liberta as chaves
//
// PONTOS DE INTEGRAÇÃO (marcados com «INTEGRAR»): nomes das coleções, leitura do acesso,
// parâmetros da candidatura e forma do documento de despesa. Confirmar contra o código 1.5.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { defineString } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash } from 'node:crypto';
import {
  ESTADOS, LIMITES, caminhoValido, tipoPorAssinatura, limparLeitura, chavesDocumento, chaveFornecedor,
  normalizarNumeroDocumento, verificarDocumento, possiveisRepeticoes, idDeChave, centimos,
} from './logica.mjs';
import { lerComModelo, MODELO_POR_OMISSAO } from './modelo.mjs';
import { CONFIG } from './config.mjs';

export { CONFIG };

const REGIAO = 'europe-west1';
const MODELO = defineString('LOTE_MODELO', { default: MODELO_POR_OMISSAO });

const db = () => getFirestore();
const refCand = (c) => db().collection(CONFIG.candidaturas).doc(c);

// INTEGRAR: alinhar com a verificação usada nas restantes funções chamáveis.
async function verificarAcesso(request, papeis) {
  const a = request.auth;
  if (!a) throw new HttpsError('unauthenticated', 'Sessão em falta.');
  if (!a.token.email_verified) throw new HttpsError('permission-denied', 'Email não verificado.');
  if (a.token.firebase?.sign_in_second_factor !== 'totp') throw new HttpsError('permission-denied', 'Segundo fator em falta.');
  const acesso = (await db().collection(CONFIG.acessos).doc(a.uid).get()).data();
  if (!acesso || acesso.ativo === false || !papeis.includes(acesso.papel)) throw new HttpsError('permission-denied', 'Sem permissão.');
  if (Array.isArray(acesso.seccoes) && !acesso.seccoes.includes('candidatura')) throw new HttpsError('permission-denied', 'Sem acesso à candidatura.');
  return { uid: a.uid, email: a.token.email, papel: acesso.papel };
}

// INTEGRAR: onde estão as rubricas, o NIF do beneficiário e o período de elegibilidade (separador Parâmetros).
async function lerContexto(candidaturaId) {
  const d = (await refCand(candidaturaId).get()).data();
  if (!d) throw new HttpsError('not-found', 'Candidatura inexistente.');
  const rubricas = (d.rubricas ?? []).filter((r) => r?.codigo && r?.nome).map((r) => ({ codigo: String(r.codigo), nome: String(r.nome), descricao: r.descricao ? String(r.descricao) : '' }));
  if (!rubricas.length) throw new HttpsError('failed-precondition', 'A candidatura não tem rubricas definidas nos parâmetros.');
  return { rubricas, nifBeneficiario: d.nifBeneficiario ?? null, periodo: d.periodoElegibilidade ?? null };
}

// INTEGRAR: forma do documento no separador Despesas.
export function paraDespesa(p, decisao) {
  const l = p.leitura;
  const taxa = l.moeda && l.moeda !== 'EUR' ? decisao.taxaCambio : 1;
  const emEuros = (v) => (v == null ? null : Math.round(v * taxa * 100) / 100);
  return {
    fornecedor: l.fornecedor.nome, fornecedorNif: l.fornecedor.nif, fornecedorPais: l.fornecedor.pais,
    tipoDocumento: l.tipoDocumento, numero: l.numero, atcud: l.atcud, data: l.dataEmissao,
    descricao: l.linhas.map((x) => x.descricao).filter(Boolean).slice(0, 5).join('; ').slice(0, 500),
    rubrica: decisao.rubrica,
    moeda: l.moeda ?? 'EUR', taxaCambio: taxa, fonteCambio: decisao.fonteCambio ?? null,
    base: emEuros(l.totais.base), iva: emEuros(l.totais.imposto), total: emEuros(l.totais.total),
    autoliquidacao: l.autoliquidacao,
    ficheiro: p.ficheiro,
    origem: { tipo: 'lote', loteId: p.loteId, propostaId: p.id, modelo: p.modelo, rubricaProposta: l.rubrica.codigo },
  };
}

async function auditar(quem, acao, alvo, detalhe = {}) {
  await db().collection(CONFIG.auditoria).add({ acao, uid: quem.uid, email: quem.email, alvo, detalhe, em: FieldValue.serverTimestamp() });
}

const idSeguro = /^[A-Za-z0-9_-]{1,64}$/;

// ------------------------------------------------------------------ lerFatura

export const lerFatura = onCall({ region: REGIAO, timeoutSeconds: 180, memory: '1GiB', maxInstances: 5, concurrency: 4 }, async (request) => {
  const quem = await verificarAcesso(request, ['admin', 'editor']);
  const { candidaturaId, loteId, caminho, nomeOriginal } = request.data ?? {};
  if (!idSeguro.test(candidaturaId ?? '') || !idSeguro.test(loteId ?? '') || !caminhoValido(caminho, candidaturaId, loteId)) {
    throw new HttpsError('invalid-argument', 'Pedido inválido.');
  }
  const contexto = await lerContexto(candidaturaId);
  const shaNome = caminho.split('/').pop().slice(0, 64);
  const propostaId = `${loteId}_${shaNome.slice(0, 20)}`;
  const cand = refCand(candidaturaId);
  const refProposta = cand.collection(CONFIG.propostas).doc(propostaId);

  const existente = (await refProposta.get()).data();
  if (existente && existente.estado !== ESTADOS.ERRO) return resumo(propostaId, existente);

  // 1. Ficheiro: tamanho, tipo pela assinatura e SHA-256 calculado no servidor.
  const ficheiroStorage = getStorage().bucket().file(caminho);
  const [meta] = await ficheiroStorage.getMetadata().catch(() => [null]);
  if (!meta) throw new HttpsError('not-found', 'Ficheiro não encontrado.');
  if (Number(meta.size) > LIMITES.bytesMax) throw new HttpsError('invalid-argument', 'Ficheiro acima de 15 MB.');
  const [bytes] = await ficheiroStorage.download();
  const mimeType = tipoPorAssinatura(bytes);
  if (!mimeType) throw new HttpsError('invalid-argument', 'Só são aceites PDF, JPG e PNG.');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== shaNome) throw new HttpsError('invalid-argument', 'O ficheiro não corresponde à impressão digital indicada.');

  const ficheiro = { caminho, sha256, bytes: bytes.length, mimeType, nomeOriginal: String(nomeOriginal ?? '').slice(0, 200) };
  const base = { id: propostaId, loteId, ficheiro, criadoPor: quem.uid, criadoEm: FieldValue.serverTimestamp() };

  // 2. Mesmo ficheiro já submetido (nesta ou noutra altura)?
  const chaveFicheiro = `ficheiro|${sha256}`;
  const refIdxFicheiro = cand.collection(CONFIG.indice).doc(await idDeChave(chaveFicheiro));
  const repetidoFicheiro = await db().runTransaction(async (t) => {
    const idx = (await t.get(refIdxFicheiro)).data();
    if (idx && idx.propostaId !== propostaId) {
      t.set(refProposta, { ...base, estado: ESTADOS.REPETIDA, repeticao: { tipo: 'ficheiro', chave: chaveFicheiro, propostaId: idx.propostaId, despesaId: idx.despesaId ?? null, resumo: idx.resumo ?? null } });
      return idx;
    }
    if (!idx) t.create(refIdxFicheiro, { chave: chaveFicheiro, tipo: 'ficheiro', propostaId, despesaId: null, criadoEm: FieldValue.serverTimestamp() });
    t.set(refProposta, { ...base, estado: 'a-ler' });
    return null;
  });
  if (repetidoFicheiro) {
    await auditar(quem, 'lote.repetida', refProposta.path, { tipo: 'ficheiro' });
    return resumo(propostaId, (await refProposta.get()).data());
  }

  // 3. Leitura pela IA (uma tentativa extra em 429 ou 5xx).
  let resultado;
  for (let tentativa = 0; ; tentativa++) {
    try {
      resultado = await lerComModelo({ bytes, mimeType, rubricas: contexto.rubricas, projeto: process.env.GCLOUD_PROJECT, regiao: REGIAO, modelo: MODELO.value() });
      break;
    } catch (e) {
      if (tentativa === 0 && (e.estado === 429 || e.estado >= 500)) { await new Promise((r) => setTimeout(r, 4000)); continue; }
      await refProposta.update({ estado: ESTADOS.ERRO, erro: 'Não foi possível ler o documento. Tente de novo.' });
      console.error('lerFatura: modelo', e.message);
      throw new HttpsError('unavailable', 'Não foi possível ler o documento. Tente de novo.');
    }
  }
  const leitura = limparLeitura(resultado.leitura, contexto.rubricas.map((r) => r.codigo));
  const comum = { leitura, modelo: resultado.modelo, utilizacao: resultado.utilizacao, lidoEm: FieldValue.serverTimestamp() };

  if (!leitura.legivel) {
    await refProposta.update({ ...comum, estado: ESTADOS.ILEGIVEL, avisos: [{ codigo: 'ilegivel', texto: 'O documento não parece ser uma fatura ou não é legível.' }] });
    return resumo(propostaId, (await refProposta.get()).data());
  }

  // 4. Mesmo documento (fornecedor + tipo + número, ou ATCUD)?
  const chaves = chavesDocumento(leitura);
  const fornecedorChave = chaveFornecedor(leitura.fornecedor);
  const resumoDoc = {
    fornecedor: leitura.fornecedor.nome, fornecedorChave, numero: leitura.numero,
    numeroNormalizado: normalizarNumeroDocumento(leitura.numero), dataEmissao: leitura.dataEmissao,
    total: leitura.totais.total, moeda: leitura.moeda,
  };
  const avisos = verificarDocumento(leitura, contexto);

  // Possível repetição: procura no índice pelo fornecedor (inclui despesas antigas indexadas).
  let candidatos = [];
  if (fornecedorChave) {
    const snap = await cand.collection(CONFIG.indice).where('tipo', '==', 'documento').where('resumo.fornecedorChave', '==', fornecedorChave).limit(300).get();
    const vistos = new Set();
    candidatos = snap.docs.map((d) => d.data()).filter((d) => d.propostaId !== propostaId && !vistos.has(d.propostaId ?? d.despesaId) && vistos.add(d.propostaId ?? d.despesaId))
      .map((d) => ({ ...d.resumo, propostaId: d.propostaId ?? null, despesaId: d.despesaId ?? null }));
  }
  const possiveis = possiveisRepeticoes(leitura, candidatos, fornecedorChave).slice(0, 5);

  const refsChaves = await Promise.all(chaves.map(async (c) => ({ chave: c, ref: cand.collection(CONFIG.indice).doc(await idDeChave(c)) })));
  await db().runTransaction(async (t) => {
    const lidos = await Promise.all(refsChaves.map(({ ref }) => t.get(ref)));
    const ocupado = lidos.findIndex((s) => s.exists && s.data().propostaId !== propostaId);
    if (ocupado >= 0) {
      const idx = lidos[ocupado].data();
      const diferente = centimos(idx.resumo?.total) !== centimos(leitura.totais.total);
      t.update(refProposta, { ...comum, avisos, resumo: resumoDoc, chaves, estado: ESTADOS.REPETIDA, repeticao: {
        tipo: 'documento', chave: refsChaves[ocupado].chave, propostaId: idx.propostaId ?? null, despesaId: idx.despesaId ?? null, resumo: idx.resumo ?? null,
        nota: diferente ? 'Mesmo fornecedor e número, mas com total diferente: confirmar se a leitura está certa.' : null,
      } });
      return;
    }
    refsChaves.forEach(({ chave, ref }, i) => {
      if (!lidos[i].exists) t.create(ref, { chave, tipo: 'documento', propostaId, despesaId: null, resumo: resumoDoc, criadoEm: FieldValue.serverTimestamp() });
    });
    t.update(refProposta, { ...comum, avisos, resumo: resumoDoc, chaves, possiveisRepeticoes: possiveis,
      estado: possiveis.length ? ESTADOS.POSSIVEL_REPETICAO : ESTADOS.POR_VALIDAR });
  });

  const final = (await refProposta.get()).data();
  if (final.estado === ESTADOS.REPETIDA) await auditar(quem, 'lote.repetida', refProposta.path, { tipo: 'documento' });
  return resumo(propostaId, final);
});

function resumo(id, p) {
  return {
    id, estado: p.estado, ficheiro: { nomeOriginal: p.ficheiro?.nomeOriginal, sha256: p.ficheiro?.sha256 },
    leitura: p.leitura ?? null, avisos: p.avisos ?? [], repeticao: p.repeticao ?? null,
    possiveisRepeticoes: p.possiveisRepeticoes ?? [], erro: p.erro ?? null,
  };
}

// ------------------------------------------------------------------ decidirDespesa

const CAMPOS_CORRIGIVEIS = ['numero', 'dataEmissao', 'moeda', 'tipoDocumento', 'atcud'];

export const decidirDespesa = onCall({ region: REGIAO, maxInstances: 5 }, async (request) => {
  const quem = await verificarAcesso(request, ['admin', 'editor']);
  const { candidaturaId, propostaId, decisao } = request.data ?? {};
  if (!idSeguro.test(candidaturaId ?? '') || !idSeguro.test(propostaId ?? '')) throw new HttpsError('invalid-argument', 'Pedido inválido.');
  const cand = refCand(candidaturaId);
  const refProposta = cand.collection(CONFIG.propostas).doc(propostaId);

  if (decisao?.acao === 'rejeitar') return rejeitar(quem, cand, refProposta, decisao);
  if (decisao?.acao === 'incluir-mesmo-assim') return incluirMesmoAssim(quem, refProposta, decisao);
  if (decisao?.acao !== 'validar') throw new HttpsError('invalid-argument', 'Ação desconhecida.');

  const contexto = await lerContexto(candidaturaId);
  const p = (await refProposta.get()).data();
  if (!p) throw new HttpsError('not-found', 'Proposta inexistente.');
  if (![ESTADOS.POR_VALIDAR, ESTADOS.POSSIVEL_REPETICAO].includes(p.estado)) throw new HttpsError('failed-precondition', `Não é possível validar no estado «${p.estado}».`);
  if (p.estado === ESTADOS.POSSIVEL_REPETICAO && decisao.confirmoNaoRepetida !== true) {
    throw new HttpsError('failed-precondition', 'Confirme que não é a mesma despesa das possíveis repetições indicadas.');
  }
  const rubrica = String(decisao.rubrica ?? '');
  if (!contexto.rubricas.some((r) => r.codigo === rubrica)) throw new HttpsError('invalid-argument', 'Escolha uma rubrica da candidatura.');

  // Correções da pessoa sobre a leitura da IA (voltam a passar pela mesma limpeza).
  const c = decisao.correcoes ?? {};
  const bruto = structuredClone(p.leitura);
  for (const k of CAMPOS_CORRIGIVEIS) if (k in c) bruto[k] = c[k];
  if (c.fornecedor) bruto.fornecedor = { ...bruto.fornecedor, ...c.fornecedor };
  if (c.totais) bruto.totais = { ...bruto.totais, ...c.totais };
  bruto.rubrica = { codigo: rubrica, justificacao: p.leitura.rubrica?.justificacao };
  const leitura = limparLeitura(bruto, contexto.rubricas.map((r) => r.codigo));
  leitura.rubrica.codigo = rubrica;
  if (leitura.totais.total == null) throw new HttpsError('invalid-argument', 'Indique o total.');
  if (leitura.moeda && leitura.moeda !== 'EUR') {
    const taxa = Number(decisao.taxaCambio);
    if (!(taxa > 0 && taxa < 100000)) throw new HttpsError('invalid-argument', 'Indique a taxa de câmbio para euros.');
    decisao.taxaCambio = taxa;
  }

  const chaves = p.inclusaoForcada ? [] : chavesDocumento(leitura);
  const fornecedorChave = chaveFornecedor(leitura.fornecedor);
  const resumoDoc = { fornecedor: leitura.fornecedor.nome, fornecedorChave, numero: leitura.numero, numeroNormalizado: normalizarNumeroDocumento(leitura.numero), dataEmissao: leitura.dataEmissao, total: leitura.totais.total, moeda: leitura.moeda };
  const refsNovas = await Promise.all(chaves.map(async (k) => ({ chave: k, ref: cand.collection(CONFIG.indice).doc(await idDeChave(k)) })));
  const refsAntigas = await Promise.all((p.chaves ?? []).filter((k) => !chaves.includes(k)).map(async (k) => cand.collection(CONFIG.indice).doc(await idDeChave(k))));
  const refIdxFicheiro = cand.collection(CONFIG.indice).doc(await idDeChave(`ficheiro|${p.ficheiro.sha256}`));
  const refDespesa = cand.collection(CONFIG.despesas).doc(propostaId);

  await db().runTransaction(async (t) => {
    const atual = (await t.get(refProposta)).data();
    if (atual.estado !== p.estado) throw new HttpsError('aborted', 'A proposta mudou entretanto. Atualize a página.');
    const novas = await Promise.all(refsNovas.map(({ ref }) => t.get(ref)));
    const antigas = await Promise.all(refsAntigas.map((ref) => t.get(ref)));
    const conflito = novas.find((s) => s.exists && s.data().propostaId !== propostaId);
    if (conflito) throw new HttpsError('already-exists', `Com as correções, este documento é igual a outro já registado (${conflito.data().resumo?.numero ?? 'sem número'}). Não é considerado.`);
    antigas.forEach((s) => { if (s.exists && s.data().propostaId === propostaId) t.delete(s.ref); });
    refsNovas.forEach(({ chave, ref }, i) => {
      const dadosIdx = { chave, tipo: 'documento', propostaId, despesaId: propostaId, resumo: resumoDoc };
      if (novas[i].exists) t.update(ref, dadosIdx); else t.create(ref, { ...dadosIdx, criadoEm: FieldValue.serverTimestamp() });
    });
    t.set(refIdxFicheiro, { despesaId: propostaId }, { merge: true });
    t.create(refDespesa, { ...paraDespesa({ ...p, leitura }, { ...decisao, rubrica }), criadoPor: quem.uid, criadoEm: FieldValue.serverTimestamp() });
    t.update(refProposta, {
      estado: ESTADOS.VALIDADA, leituraValidada: leitura, chaves, resumo: resumoDoc,
      decisao: { acao: 'validar', por: quem.uid, em: FieldValue.serverTimestamp(), rubrica, rubricaProposta: p.leitura.rubrica?.codigo ?? null, correcoes: c, taxaCambio: decisao.taxaCambio ?? null, fonteCambio: decisao.fonteCambio ?? null },
    });
  });
  await auditar(quem, 'lote.validar', refProposta.path, { despesa: refDespesa.path, rubrica, rubricaAlterada: rubrica !== p.leitura.rubrica?.codigo });
  return { ok: true, despesaId: propostaId };
});

async function rejeitar(quem, cand, refProposta, decisao) {
  const motivo = String(decisao.motivo ?? '').trim().slice(0, 500);
  const p = (await refProposta.get()).data();
  if (!p) throw new HttpsError('not-found', 'Proposta inexistente.');
  if ([ESTADOS.VALIDADA, ESTADOS.REJEITADA].includes(p.estado)) throw new HttpsError('failed-precondition', 'Proposta já decidida.');
  // Liberta as chaves que esta proposta reservou (as de uma repetida pertencem ao original e ficam).
  const refs = await Promise.all([`ficheiro|${p.ficheiro.sha256}`, ...(p.chaves ?? [])].map(async (k) => cand.collection(CONFIG.indice).doc(await idDeChave(k))));
  await db().runTransaction(async (t) => {
    const snaps = await Promise.all(refs.map((r) => t.get(r)));
    snaps.forEach((s) => { if (s.exists && s.data().propostaId === p.id && !s.data().despesaId) t.delete(s.ref); });
    t.update(refProposta, { estado: ESTADOS.REJEITADA, decisao: { acao: 'rejeitar', por: quem.uid, em: FieldValue.serverTimestamp(), motivo } });
  });
  // O ficheiro desta proposta é apagado se não for o ficheiro de referência de outra proposta ou despesa.
  const idxFicheiro = (await refs[0].get()).data();
  if (!idxFicheiro || idxFicheiro.propostaId !== p.id) await getStorage().bucket().file(p.ficheiro.caminho).delete().catch(() => {});
  await auditar(quem, 'lote.rejeitar', refProposta.path, { motivo, estadoAnterior: p.estado });
  return { ok: true };
}

async function incluirMesmoAssim(quem, refProposta, decisao) {
  if (quem.papel !== 'admin') throw new HttpsError('permission-denied', 'Só um administrador pode incluir um documento repetido.');
  const motivo = String(decisao.motivo ?? '').trim();
  if (motivo.length < 15) throw new HttpsError('invalid-argument', 'Explique o motivo (pelo menos 15 caracteres).');
  await db().runTransaction(async (t) => {
    const p = (await t.get(refProposta)).data();
    if (p?.estado !== ESTADOS.REPETIDA) throw new HttpsError('failed-precondition', 'Só se aplica a documentos repetidos.');
    if (p.repeticao?.tipo === 'ficheiro') throw new HttpsError('failed-precondition', 'É exatamente o mesmo ficheiro: não pode ser incluído outra vez.');
    t.update(refProposta, { estado: ESTADOS.POR_VALIDAR, chaves: [], inclusaoForcada: { por: quem.uid, motivo: motivo.slice(0, 500), em: FieldValue.serverTimestamp() } });
  });
  await auditar(quem, 'lote.incluir-repetida', refProposta.path, { motivo });
  return { ok: true };
}

// ------------------------------------------------------------------ libertarIndiceDespesa

export const libertarIndiceDespesa = onDocumentDeleted({ region: REGIAO, document: `${CONFIG.candidaturas}/{c}/${CONFIG.despesas}/{d}` }, async (evento) => {
  const { c, d } = evento.params;
  const snap = await refCand(c).collection(CONFIG.indice).where('despesaId', '==', d).get();
  const lote = db().batch();
  snap.docs.forEach((doc) => lote.delete(doc.ref));
  if (!snap.empty) await lote.commit();
});
