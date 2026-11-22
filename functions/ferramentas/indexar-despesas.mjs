// Indexa as despesas já registadas para que a submissão em lote reconheça repetidos antigos.
// Corre uma vez no Cloud Shell, depois de publicar as funções:
//   cd functions && BUCKET=<bucket> node ferramentas/indexar-despesas.mjs            (só mostra o que faria)
//   cd functions && BUCKET=<bucket> node ferramentas/indexar-despesas.mjs --gravar   (grava o índice)
// No fim lista as despesas que JÁ estão repetidas entre si, para revisão manual.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash } from 'node:crypto';
import { chavesDocumento, chaveFornecedor, normalizarNumeroDocumento, idDeChave } from '../despesas-lote/logica.mjs';
import { CONFIG } from '../despesas-lote/config.mjs';

const GRAVAR = process.argv.includes('--gravar');
initializeApp({ credential: applicationDefault(), storageBucket: process.env.BUCKET });
const db = getFirestore();

// INTEGRAR: converter uma despesa existente para os campos usados nas chaves.
function lerDespesaAntiga(d) {
  return {
    tipoDocumento: d.tipoDocumento ?? 'fatura',
    numero: d.numero ?? d.numeroFatura ?? null,
    atcud: d.atcud ?? null,
    dataEmissao: d.data ?? d.dataFatura ?? null,
    fornecedor: { nome: d.fornecedor ?? null, nif: d.fornecedorNif ?? d.nifFornecedor ?? null, pais: d.fornecedorPais ?? null },
    totais: { total: typeof d.total === 'number' ? d.total : null },
    moeda: d.moeda ?? 'EUR',
    caminhoFicheiro: d.ficheiro?.caminho ?? null,
  };
}

const repetidas = [];
const vistas = new Map(); // chave -> despesa, para detetar repetidas também sem --gravar
let indexadas = 0, semChave = 0;

for (const cand of (await db.collection(CONFIG.candidaturas).get()).docs) {
  const despesas = await cand.ref.collection(CONFIG.despesas).get();
  for (const doc of despesas.docs) {
    const d = lerDespesaAntiga(doc.data());
    const chaves = chavesDocumento(d);
    if (d.caminhoFicheiro) {
      const [bytes] = await getStorage().bucket().file(d.caminhoFicheiro).download().catch(() => [null]);
      if (bytes) chaves.push(`ficheiro|${createHash('sha256').update(bytes).digest('hex')}`);
    }
    if (!chaves.length) { semChave++; continue; }
    const resumo = { fornecedor: d.fornecedor.nome, fornecedorChave: chaveFornecedor(d.fornecedor), numero: d.numero, numeroNormalizado: normalizarNumeroDocumento(d.numero), dataEmissao: d.dataEmissao, total: d.totais.total, moeda: d.moeda };
    for (const chave of chaves) {
      const ref = cand.ref.collection(CONFIG.indice).doc(await idDeChave(chave));
      const atual = (await ref.get()).data() ?? (vistas.has(chave) ? { despesaId: vistas.get(chave) } : null);
      if (!atual) vistas.set(chave, doc.id);
      if (atual && atual.despesaId !== doc.id) { repetidas.push({ candidatura: cand.id, despesa: doc.id, igualA: atual.despesaId ?? atual.propostaId, chave }); continue; }
      if (GRAVAR && !atual) {
        await ref.create({ chave, tipo: chave.startsWith('ficheiro|') ? 'ficheiro' : 'documento', propostaId: null, despesaId: doc.id, resumo, criadoEm: FieldValue.serverTimestamp(), origem: 'indexacao-inicial' });
      }
      indexadas++;
    }
  }
}

console.log(`${GRAVAR ? 'Gravadas' : 'A gravar'}: ${indexadas} chaves. Despesas sem número nem ficheiro (não indexadas): ${semChave}.`);
if (repetidas.length) {
  console.log(`\nDespesas já registadas que parecem repetidas (${repetidas.length}):`);
  for (const r of repetidas) console.log(`- ${r.candidatura}/${r.despesa} = ${r.igualA}  [${r.chave}]`);
}
