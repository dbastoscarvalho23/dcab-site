// Indexa as despesas já registadas para que a submissão em lote reconheça repetidos antigos.
// As despesas criadas ou alteradas depois da versão 1.6 são indexadas automaticamente (indexarDespesa).
// Corre uma vez, no Cloud Shell ou no Mac (com gcloud auth application-default login), dentro de functions/:
//   node ferramentas/indexar-despesas.mjs            (só mostra o que faria)
//   node ferramentas/indexar-despesas.mjs --gravar   (grava o índice)
// No fim lista as despesas que JÁ estão repetidas entre si, para revisão manual.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { chavesDocumento, dadosDeDespesa, resumoDe, idDeChave } from '../despesas-lote/logica.mjs';
import { CONFIG } from '../despesas-lote/config.mjs';

const GRAVAR = process.argv.includes('--gravar');
initializeApp({ credential: applicationDefault(), projectId: process.env.GCLOUD_PROJECT || 'dcab-consulting' });
const db = getFirestore();

const repetidas = [];
const vistas = new Map(); // chave -> despesa, para detetar repetidas também sem --gravar
let indexadas = 0, semChave = 0, total = 0;

for (const projeto of CONFIG.projetosPermitidos) {
  const cand = db.collection(CONFIG.candidaturas).doc(projeto);
  const despesas = await cand.collection(CONFIG.despesas).get();
  for (const doc of despesas.docs) {
    total++;
    const leitura = dadosDeDespesa(doc.data());
    const chaves = chavesDocumento(leitura);
    if (!chaves.length) { semChave++; continue; }
    const resumo = resumoDe(leitura);
    for (const chave of chaves) {
      const ref = cand.collection(CONFIG.indice).doc(await idDeChave(chave));
      const atual = (await ref.get()).data() ?? (vistas.has(chave) ? { despesaId: vistas.get(chave) } : null);
      if (!atual) vistas.set(chave, doc.id);
      if (atual && atual.despesaId !== doc.id) {
        repetidas.push({ despesa: doc.id, igualA: atual.despesaId ?? atual.propostaId, fornecedor: resumo.fornecedor, numero: resumo.numero });
        continue;
      }
      if (GRAVAR && !atual) {
        await ref.create({ chave, tipo: 'documento', propostaId: null, despesaId: doc.id, resumo, origemChave: 'despesa', criadoEm: FieldValue.serverTimestamp() });
      }
      indexadas++;
    }
  }
}

console.log(`Despesas lidas: ${total}. ${GRAVAR ? 'Chaves gravadas' : 'Chaves a gravar'}: ${indexadas}. Sem número de documento (não indexadas): ${semChave}.`);
if (repetidas.length) {
  console.log(`\nDespesas já registadas que parecem repetidas (${repetidas.length}):`);
  for (const r of repetidas) console.log(`- ${r.fornecedor ?? '—'} · ${r.numero ?? '—'}: despesa ${r.despesa} = ${r.igualA}`);
} else {
  console.log('Nenhuma despesa repetida entre as já registadas.');
}
if (!GRAVAR) console.log('\nNada foi gravado. Para gravar: node ferramentas/indexar-despesas.mjs --gravar');
