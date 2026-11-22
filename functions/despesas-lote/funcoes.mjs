// Funções da submissão de faturas em lote (Cloud Functions v2, europe-west1).
//   lerFatura       — lê um ficheiro já carregado no Storage, deteta repetidos e cria a proposta
//   decidirDespesa  — validar (cria a despesa), rejeitar ou, só administrador, incluir uma repetida com motivo
//   indexarDespesa  — mantém o índice de repetidos quando uma despesa é criada, alterada ou apagada no separador Despesas

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash } from 'node:crypto';
import {
  ESTADOS, LIMITES, caminhoValido, tipoPorAssinatura, limparLeitura, chavesDocumento, chaveFornecedor,
  verificarDocumento, possiveisRepeticoes, idDeChave, centimos, dadosDeDespesa, resumoDe, construirDespesa,
} from './logica.mjs';
import { lerComModelo, MODELO_POR_OMISSAO } from './modelo.mjs';
import { CONFIG } from './config.mjs';
import { QUADRO, RUBRICAS, NIF_BENEFICIARIO, fimElegibilidade } from './quadro.mjs';

export { CONFIG };

const REGIAO = 'europe-west1';
// Modelo e região: functions/.env (LOTE_MODELO, LOTE_REGIAO_MODELO); sem ficheiro, os valores por omissão.
// A região do modelo pode ser diferente da das funções, mas só regiões da UE são aceites.
const MODELO = { value: () => process.env.LOTE_MODELO || MODELO_POR_OMISSAO };
const REGIAO_MODELO = { value: () => process.env.LOTE_REGIAO_MODELO || REGIAO };
const REGIOES_UE = /^europe-(west|north|central|southwest)\d+$/;

const db = () => getFirestore();
const refCand = (c) => db().collection(CONFIG.candidaturas).doc(c);
const idSeguro = /^[A-Za-z0-9_-]{1,64}$/;

// Linhas do quadro de investimento como opções para o modelo e para a validação.
const LINHAS = QUADRO.map((l) => ({ codigo: l.codigo, nome: l.descricao, descricao: RUBRICAS[l.rubrica].nome, rubrica: l.rubrica }));

// Mesmas regras do Firestore: acesso por email, ativo, admin/editor, secção Candidatura, TOTP.
export function seccaoPermitida(acesso, s) {
  if (acesso.papel === 'admin') return true;
  return Array.isArray(acesso.seccoes) ? acesso.seccoes.includes(s) : acesso.papel !== 'cliente';
}

async function verificarAcesso(request, papeis) {
  const a = request.auth;
  if (!a?.token) throw new HttpsError('unauthenticated', 'Sessão inválida. Entre novamente.');
  if (!a.token.email || a.token.email_verified !== true) throw new HttpsError('permission-denied', 'Email não verificado.');
  if (a.token.firebase?.sign_in_second_factor !== 'totp') throw new HttpsError('permission-denied', 'É obrigatório o segundo fator.');
  const email = String(a.token.email).trim().toLowerCase();
  const acesso = (await db().collection(CONFIG.acessos).doc(email).get()).data();
  if (!acesso || acesso.ativo !== true || !papeis.includes(acesso.papel) || !seccaoPermitida(acesso, 'candidatura')) {
    throw new HttpsError('permission-denied', 'Sem permissão para submeter despesas.');
  }
  return { email, papel: acesso.papel };
}

function validarCandidatura(c) {
  if (!idSeguro.test(c ?? '') || !CONFIG.projetosPermitidos.includes(c)) throw new HttpsError('invalid-argument', 'Candidatura inválida.');
}

async function lerContexto(candidaturaId) {
  const d = (await refCand(candidaturaId).get()).data();
  if (!d) throw new HttpsError('not-found', 'Candidatura inexistente.');
  const p = d.parametros ?? {};
  return { rubricas: LINHAS, nifBeneficiario: NIF_BENEFICIARIO, periodo: p.inicio ? { inicio: p.inicio, fim: fimElegibilidade(p.inicio, p.duracao) } : null };
}

async function auditar(candidaturaId, quem, acao, docId, resumo) {
  await refCand(candidaturaId).collection(CONFIG.auditoria).add({
    acao, colecao: CONFIG.propostas, docId, resumo: String(resumo).slice(0, 200), por: quem.email, em: FieldValue.serverTimestamp(),
  });
}

const refIndice = async (cand, chave) => cand.collection(CONFIG.indice).doc(await idDeChave(chave));

function resumoResposta(id, p) {
  return {
    id, estado: p.estado, ficheiro: { nomeOriginal: p.ficheiro?.nomeOriginal, sha256: p.ficheiro?.sha256 },
    leitura: p.leitura ?? null, avisos: p.avisos ?? [], repeticao: p.repeticao ?? null,
    possiveisRepeticoes: p.possiveisRepeticoes ?? [], erro: p.erro ?? null,
  };
}

// ------------------------------------------------------------------ lerFatura

export const lerFatura = onCall({ region: REGIAO, timeoutSeconds: 180, memory: '1GiB', maxInstances: 5, concurrency: 4 }, async (request) => {
  const quem = await verificarAcesso(request, ['admin', 'editor']);
  const { candidaturaId, loteId, caminho, nomeOriginal } = request.data ?? {};
  validarCandidatura(candidaturaId);
  if (!idSeguro.test(loteId ?? '') || !caminhoValido(caminho, candidaturaId, loteId)) throw new HttpsError('invalid-argument', 'Pedido inválido.');
  const contexto = await lerContexto(candidaturaId);
  const shaNome = caminho.split('/').pop().slice(0, 64);
  const propostaId = `${loteId}_${shaNome.slice(0, 20)}`;
  const cand = refCand(candidaturaId);
  const refProposta = cand.collection(CONFIG.propostas).doc(propostaId);

  const existente = (await refProposta.get()).data();
  if (existente && existente.estado !== ESTADOS.ERRO) return resumoResposta(propostaId, existente);

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
  const base = { id: propostaId, loteId, ficheiro, criadoPor: quem.email, criadoEm: FieldValue.serverTimestamp() };

  // 2. Mesmo ficheiro já submetido?
  const chaveFicheiro = `ficheiro|${sha256}`;
  const refIdxFicheiro = await refIndice(cand, chaveFicheiro);
  const repetidoFicheiro = await db().runTransaction(async (t) => {
    const idx = (await t.get(refIdxFicheiro)).data();
    if (idx && idx.propostaId !== propostaId) {
      t.set(refProposta, { ...base, estado: ESTADOS.REPETIDA, repeticao: { tipo: 'ficheiro', chave: chaveFicheiro, propostaId: idx.propostaId ?? null, despesaId: idx.despesaId ?? null, resumo: idx.resumo ?? null } });
      return idx;
    }
    if (!idx) t.create(refIdxFicheiro, { chave: chaveFicheiro, tipo: 'ficheiro', propostaId, despesaId: null, criadoEm: FieldValue.serverTimestamp() });
    t.set(refProposta, { ...base, estado: 'a-ler' });
    return null;
  });
  if (repetidoFicheiro) {
    await auditar(candidaturaId, quem, 'lote-repetida', propostaId, 'Mesmo ficheiro: ' + ficheiro.nomeOriginal);
    return resumoResposta(propostaId, (await refProposta.get()).data());
  }

  // 3. Leitura pela IA (uma tentativa extra em 429 ou 5xx).
  const regiaoModelo = REGIOES_UE.test(REGIAO_MODELO.value()) ? REGIAO_MODELO.value() : REGIAO;
  let resultado;
  for (let tentativa = 0; ; tentativa++) {
    try {
      resultado = await lerComModelo({ bytes, mimeType, rubricas: contexto.rubricas, projeto: process.env.GCLOUD_PROJECT, regiao: regiaoModelo, modelo: MODELO.value() });
      break;
    } catch (e) {
      if (tentativa === 0 && (e.estado === 429 || e.estado >= 500)) { await new Promise((r) => setTimeout(r, 4000)); continue; }
      await refProposta.update({ estado: ESTADOS.ERRO, erro: 'Não foi possível ler o documento. Tente de novo.' });
      console.error(JSON.stringify({ severity: 'ERROR', evento: 'lote_modelo', estado: e.estado ?? null, message: String(e.message).slice(0, 300) }));
      throw new HttpsError('unavailable', 'Não foi possível ler o documento. Tente de novo.');
    }
  }
  const leitura = limparLeitura(resultado.leitura, contexto.rubricas.map((r) => r.codigo));
  const comum = { leitura, modelo: resultado.modelo, utilizacao: resultado.utilizacao, lidoEm: FieldValue.serverTimestamp() };

  if (!leitura.legivel) {
    await refProposta.update({ ...comum, estado: ESTADOS.ILEGIVEL, avisos: [{ codigo: 'ilegivel', texto: 'O documento não parece ser uma fatura ou não é legível.' }] });
    return resumoResposta(propostaId, (await refProposta.get()).data());
  }

  // 4. Mesmo documento (fornecedor + tipo + número, ou ATCUD)?
  const chaves = chavesDocumento(leitura);
  const fornecedorChave = chaveFornecedor(leitura.fornecedor);
  const resumoDoc = resumoDe(leitura);
  const avisos = verificarDocumento(leitura, contexto);

  let candidatos = [];
  if (fornecedorChave) {
    const snap = await cand.collection(CONFIG.indice).where('tipo', '==', 'documento').where('resumo.fornecedorChave', '==', fornecedorChave).limit(300).get();
    const vistos = new Set();
    for (const d of snap.docs.map((x) => x.data())) {
      const k = d.despesaId ?? d.propostaId;
      if (d.propostaId === propostaId || vistos.has(k)) continue;
      vistos.add(k);
      candidatos.push({ ...d.resumo, propostaId: d.propostaId ?? null, despesaId: d.despesaId ?? null });
    }
  }
  const possiveis = possiveisRepeticoes(leitura, candidatos, fornecedorChave).slice(0, 5);

  const refsChaves = await Promise.all(chaves.map(async (c) => ({ chave: c, ref: await refIndice(cand, c) })));
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
      if (!lidos[i].exists) t.create(ref, { chave, tipo: 'documento', propostaId, despesaId: null, resumo: resumoDoc, origemChave: 'lote', criadoEm: FieldValue.serverTimestamp() });
    });
    t.update(refProposta, { ...comum, avisos, resumo: resumoDoc, chaves, possiveisRepeticoes: possiveis,
      estado: possiveis.length ? ESTADOS.POSSIVEL_REPETICAO : ESTADOS.POR_VALIDAR });
  });

  const final = (await refProposta.get()).data();
  if (final.estado === ESTADOS.REPETIDA) await auditar(candidaturaId, quem, 'lote-repetida', propostaId, 'Mesmo documento: ' + (leitura.numero ?? '') + ' · ' + (leitura.fornecedor.nome ?? ''));
  return resumoResposta(propostaId, final);
});

// ------------------------------------------------------------------ decidirDespesa

const CAMPOS_CORRIGIVEIS = ['numero', 'dataEmissao', 'moeda', 'atcud'];

export const decidirDespesa = onCall({ region: REGIAO, maxInstances: 5 }, async (request) => {
  const quem = await verificarAcesso(request, ['admin', 'editor']);
  const { candidaturaId, propostaId, decisao } = request.data ?? {};
  validarCandidatura(candidaturaId);
  if (!idSeguro.test(propostaId ?? '')) throw new HttpsError('invalid-argument', 'Pedido inválido.');
  const cand = refCand(candidaturaId);
  const refProposta = cand.collection(CONFIG.propostas).doc(propostaId);

  if (decisao?.acao === 'rejeitar') return rejeitar(candidaturaId, quem, cand, refProposta, decisao);
  if (decisao?.acao === 'incluir-mesmo-assim') return incluirMesmoAssim(candidaturaId, quem, refProposta, decisao);
  if (decisao?.acao !== 'validar') throw new HttpsError('invalid-argument', 'Ação desconhecida.');

  const contexto = await lerContexto(candidaturaId);
  const p = (await refProposta.get()).data();
  if (!p) throw new HttpsError('not-found', 'Proposta inexistente.');
  if (![ESTADOS.POR_VALIDAR, ESTADOS.POSSIVEL_REPETICAO].includes(p.estado)) throw new HttpsError('failed-precondition', `Não é possível validar no estado «${p.estado}».`);
  if (p.estado === ESTADOS.POSSIVEL_REPETICAO && decisao.confirmoNaoRepetida !== true) {
    throw new HttpsError('failed-precondition', 'Confirme que não é a mesma despesa das possíveis repetições indicadas.');
  }

  // Correções da pessoa sobre a leitura da IA (voltam a passar pela mesma limpeza).
  const c = decisao.correcoes ?? {};
  const bruto = structuredClone(p.leitura);
  for (const k of CAMPOS_CORRIGIVEIS) if (k in c) bruto[k] = c[k];
  if (c.fornecedor) bruto.fornecedor = { ...bruto.fornecedor, ...c.fornecedor };
  if (c.totais) bruto.totais = { ...bruto.totais, ...c.totais };
  bruto.rubrica = { codigo: decisao.linha, justificacao: p.leitura.rubrica?.justificacao };
  const leitura = limparLeitura(bruto, contexto.rubricas.map((r) => r.codigo));

  const { despesa, erros } = construirDespesa({
    leitura, decisao, ficheiro: p.ficheiro, loteId: p.loteId, email: quem.email, linhasQuadro: QUADRO, agora: Date.now(),
  });
  if (erros) throw new HttpsError('invalid-argument', erros.join(' '));

  const chaves = p.inclusaoForcada ? [] : chavesDocumento(leitura);
  const resumoDoc = resumoDe(leitura);
  const refsNovas = await Promise.all(chaves.map(async (k) => ({ chave: k, ref: await refIndice(cand, k) })));
  const refsAntigas = await Promise.all((p.chaves ?? []).filter((k) => !chaves.includes(k)).map((k) => refIndice(cand, k)));
  const refIdxFicheiro = await refIndice(cand, `ficheiro|${p.ficheiro.sha256}`);
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
      const dadosIdx = { chave, tipo: 'documento', propostaId, despesaId: propostaId, resumo: resumoDoc, origemChave: 'lote' };
      if (novas[i].exists) t.update(ref, dadosIdx); else t.create(ref, { ...dadosIdx, criadoEm: FieldValue.serverTimestamp() });
    });
    t.set(refIdxFicheiro, { despesaId: propostaId }, { merge: true });
    t.create(refDespesa, { ...despesa, criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
    t.create(cand.collection(CONFIG.auditoria).doc(), {
      acao: 'criar', colecao: CONFIG.despesas, docId: propostaId, por: quem.email, em: FieldValue.serverTimestamp(),
      resumo: (despesa.linha + ' · ' + despesa.fornecedor + ' · ' + despesa.documento + ' · ' + despesa.semIva + ' (lote)').slice(0, 200),
    });
    t.update(refProposta, {
      estado: ESTADOS.VALIDADA, leituraValidada: leitura, chaves, resumo: resumoDoc,
      decisao: { acao: 'validar', por: quem.email, em: FieldValue.serverTimestamp(), linha: despesa.linha, linhaProposta: p.leitura.rubrica?.codigo ?? null, correcoes: c, taxaCambio: decisao.taxaCambio ?? null, fonteCambio: decisao.fonteCambio ?? null },
    });
  });
  return { ok: true, despesaId: propostaId };
});

async function rejeitar(candidaturaId, quem, cand, refProposta, decisao) {
  const motivo = String(decisao.motivo ?? '').trim().slice(0, 500);
  const p = (await refProposta.get()).data();
  if (!p) throw new HttpsError('not-found', 'Proposta inexistente.');
  if ([ESTADOS.VALIDADA, ESTADOS.REJEITADA].includes(p.estado)) throw new HttpsError('failed-precondition', 'Proposta já decidida.');
  // Liberta as chaves que esta proposta reservou (as de uma repetida pertencem ao original e ficam).
  const refs = await Promise.all([`ficheiro|${p.ficheiro.sha256}`, ...(p.chaves ?? [])].map((k) => refIndice(cand, k)));
  await db().runTransaction(async (t) => {
    const snaps = await Promise.all(refs.map((r) => t.get(r)));
    snaps.forEach((s) => { if (s.exists && s.data().propostaId === p.id && !s.data().despesaId) t.delete(s.ref); });
    t.update(refProposta, { estado: ESTADOS.REJEITADA, decisao: { acao: 'rejeitar', por: quem.email, em: FieldValue.serverTimestamp(), motivo } });
  });
  // O ficheiro desta proposta é apagado se não for o ficheiro de referência de outra proposta ou despesa.
  const idxFicheiro = (await refs[0].get()).data();
  if (!idxFicheiro || idxFicheiro.propostaId !== p.id) await getStorage().bucket().file(p.ficheiro.caminho).delete().catch(() => {});
  await auditar(candidaturaId, quem, 'lote-rejeitar', p.id, (motivo || 'Sem motivo') + ' · ' + (p.ficheiro?.nomeOriginal ?? ''));
  return { ok: true };
}

async function incluirMesmoAssim(candidaturaId, quem, refProposta, decisao) {
  if (quem.papel !== 'admin') throw new HttpsError('permission-denied', 'Só um administrador pode incluir um documento repetido.');
  const motivo = String(decisao.motivo ?? '').trim();
  if (motivo.length < 15) throw new HttpsError('invalid-argument', 'Explique o motivo (pelo menos 15 caracteres).');
  await db().runTransaction(async (t) => {
    const p = (await t.get(refProposta)).data();
    if (p?.estado !== ESTADOS.REPETIDA) throw new HttpsError('failed-precondition', 'Só se aplica a documentos repetidos.');
    if (p.repeticao?.tipo === 'ficheiro') throw new HttpsError('failed-precondition', 'É exatamente o mesmo ficheiro: não pode ser incluído outra vez.');
    t.update(refProposta, { estado: ESTADOS.POR_VALIDAR, chaves: [], inclusaoForcada: { por: quem.email, motivo: motivo.slice(0, 500), em: FieldValue.serverTimestamp() } });
  });
  await auditar(candidaturaId, quem, 'lote-incluir-repetida', refProposta.id, motivo);
  return { ok: true };
}

// ------------------------------------------------------------------ indexarDespesa
// As despesas criadas ou alteradas à mão também entram no índice, para que uma fatura já
// registada seja reconhecida quando aparecer num lote. Apagar a despesa liberta todas as chaves.

export async function sincronizarIndice(cand, despesaId, depois) {
  const existentes = await cand.collection(CONFIG.indice).where('despesaId', '==', despesaId).get();
  if (!depois) {
    const lote = db().batch();
    existentes.docs.forEach((d) => lote.delete(d.ref));
    if (!existentes.empty) await lote.commit();
    return;
  }
  const leitura = dadosDeDespesa(depois);
  const chaves = chavesDocumento(leitura);
  const resumo = resumoDe(leitura);
  // Chaves antigas criadas a partir da despesa que já não se aplicam (as do lote mantêm-se).
  const manter = new Set(chaves);
  const lote = db().batch();
  existentes.docs.forEach((d) => { const x = d.data(); if (x.origemChave === 'despesa' && !manter.has(x.chave)) lote.delete(d.ref); });
  await lote.commit();
  for (const chave of chaves) {
    const ref = await refIndice(cand, chave);
    await db().runTransaction(async (t) => {
      const s = await t.get(ref);
      if (!s.exists) t.create(ref, { chave, tipo: 'documento', propostaId: null, despesaId, resumo, origemChave: 'despesa', criadoEm: FieldValue.serverTimestamp() });
      else if (s.data().despesaId === despesaId) t.update(ref, { resumo });
      // Chave de outra despesa: a área reservada já assinala «Fatura duplicada»; o índice fica com a primeira.
    });
  }
}

export const indexarDespesa = onDocumentWritten({ region: REGIAO, document: `${CONFIG.candidaturas}/{c}/${CONFIG.despesas}/{d}` }, async (evento) => {
  const { c, d } = evento.params;
  const depois = evento.data?.after?.exists ? evento.data.after.data() : null;
  await sincronizarIndice(refCand(c), d, depois);
});
