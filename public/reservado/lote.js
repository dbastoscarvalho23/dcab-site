// Submissão de faturas em lote (separador Despesas da área reservada).
// Sem innerHTML com dados: tudo o que vem das faturas e do modelo entra por textContent.
//
// Utilização (em app.js):
//   import { montarLote } from './lote.js';
//   montarLote(elemento, {
//     candidaturaId, rubricas: [{ codigo, nome }], eAdmin,
//     enviar: (caminho, ficheiro) => uploadBytes(ref(storage, caminho), ficheiro, { contentType: ficheiro.type }),
//     chamar: (nome, dados) => httpsCallable(functions, nome)(dados).then((r) => r.data),
//     aoValidar: () => recarregarDespesas(),
//   });

const MAX_FICHEIROS = 50;
const MAX_BYTES = 15 * 1024 * 1024;
const PARALELO = 3;
const TIPOS = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

const ROTULOS = {
  'na-fila': 'Na fila', 'a-enviar': 'A enviar', 'a-ler': 'A ler', 'por-validar': 'Por validar',
  'possivel-repeticao': 'Possível repetição', repetida: 'Repetida (não considerada)', ilegivel: 'Ilegível',
  validada: 'Validada', rejeitada: 'Rejeitada', erro: 'Erro', recusado: 'Recusado',
};

function el(tag, attrs = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'classe') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f != null) n.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return n;
}

async function sha256(ficheiro) {
  const h = await crypto.subtle.digest('SHA-256', await ficheiro.arrayBuffer());
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const novoLoteId = () => 'L' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
const dinheiro = (v, moeda) => (v == null ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: /^[A-Z]{3}$/.test(moeda ?? '') ? moeda : 'EUR' }).format(v));
const mensagemErro = (e) => e?.message?.replace(/^.*?:\s*/, '') || 'Erro inesperado.';

export function montarLote(raiz, opcoes) {
  const { candidaturaId, rubricas, enviar, chamar, eAdmin = false, aoValidar = () => {} } = opcoes;
  let loteId = novoLoteId();
  const itens = []; // { id, ficheiro, sha, estado, resposta, erro }
  const shasNoLote = new Map();

  const entrada = el('input', { type: 'file', multiple: true, accept: '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png', classe: 'lote-entrada', id: 'lote-entrada' });
  const zona = el('label', { classe: 'lote-zona', for: 'lote-entrada' },
    el('strong', {}, 'Largue aqui as faturas ou escolha os ficheiros'),
    el('span', {}, `PDF, JPG ou PNG · até ${MAX_FICHEIROS} ficheiros · 15 MB cada`));
  const resumo = el('p', { classe: 'lote-resumo', role: 'status', 'aria-live': 'polite' });
  const botaoValidarTodas = el('button', { type: 'button', classe: 'botao', hidden: true, onclick: validarSemAvisos });
  const corpo = el('tbody');
  const tabela = el('table', { classe: 'lote-tabela' },
    el('thead', {}, el('tr', {}, ['Ficheiro', 'Estado', 'Fornecedor', 'N.º', 'Data', 'Total', 'Rubrica', ''].map((t) => el('th', { scope: 'col' }, t)))),
    corpo);

  raiz.replaceChildren(el('section', { classe: 'lote' }, el('h3', {}, 'Submeter faturas em lote'), zona, entrada, resumo, botaoValidarTodas, tabela));

  entrada.addEventListener('change', () => { adicionar([...entrada.files]); entrada.value = ''; });
  zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('ativa'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('ativa'));
  zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('ativa'); adicionar([...e.dataTransfer.files]); });

  async function adicionar(ficheiros) {
    const ativos = itens.filter((i) => !['rejeitada', 'recusado'].includes(i.estado)).length;
    if (ativos >= MAX_FICHEIROS) loteId = novoLoteId();
    for (const ficheiro of ficheiros.slice(0, MAX_FICHEIROS)) {
      const item = { id: crypto.randomUUID(), ficheiro, estado: 'na-fila' };
      itens.push(item);
      if (!TIPOS[ficheiro.type]) { item.estado = 'recusado'; item.erro = 'Tipo de ficheiro não aceite.'; continue; }
      if (ficheiro.size > MAX_BYTES) { item.estado = 'recusado'; item.erro = 'Acima de 15 MB.'; continue; }
      item.sha = await sha256(ficheiro);
      // Mesmo ficheiro escolhido duas vezes neste lote: não é enviado.
      if (shasNoLote.has(item.sha)) {
        item.estado = 'repetida';
        item.erro = `Mesmo ficheiro que «${shasNoLote.get(item.sha)}», já neste lote.`;
        continue;
      }
      shasNoLote.set(item.sha, ficheiro.name);
    }
    desenhar();
    processarFila();
  }

  let emCurso = 0;
  function processarFila() {
    while (emCurso < PARALELO) {
      const item = itens.find((i) => i.estado === 'na-fila');
      if (!item) break;
      emCurso++;
      processar(item).finally(() => { emCurso--; processarFila(); });
    }
  }

  async function processar(item) {
    try {
      const caminho = `lotes/${candidaturaId}/${loteId}/${item.sha}.${TIPOS[item.ficheiro.type]}`;
      item.estado = 'a-enviar'; desenhar();
      await enviar(caminho, item.ficheiro);
      item.estado = 'a-ler'; desenhar();
      item.resposta = await chamar('lerFatura', { candidaturaId, loteId, caminho, nomeOriginal: item.ficheiro.name });
      item.estado = item.resposta.estado;
      item.rubrica = item.resposta.leitura?.rubrica?.codigo ?? '';
    } catch (e) {
      item.estado = 'erro';
      item.erro = mensagemErro(e);
    }
    desenhar();
  }

  async function decidir(item, decisao) {
    item.ocupado = true; item.erro = null; desenhar();
    try {
      await chamar('decidirDespesa', { candidaturaId, propostaId: item.resposta.id, decisao });
      if (decisao.acao === 'validar') { item.estado = 'validada'; aoValidar(); }
      else if (decisao.acao === 'rejeitar') item.estado = 'rejeitada';
      else if (decisao.acao === 'incluir-mesmo-assim') { item.estado = 'por-validar'; item.resposta.repeticao = null; }
    } catch (e) {
      item.erro = mensagemErro(e);
    }
    item.ocupado = false; desenhar();
  }

  function decisaoValidar(item) {
    const d = { acao: 'validar', rubrica: item.rubrica, correcoes: item.correcoes ?? {} };
    if (item.estado === 'possivel-repeticao') d.confirmoNaoRepetida = !!item.confirmoNaoRepetida;
    if (item.taxaCambio) { d.taxaCambio = Number(String(item.taxaCambio).replace(',', '.')); d.fonteCambio = item.fonteCambio ?? null; }
    return d;
  }

  async function validarSemAvisos() {
    const prontas = itens.filter((i) => i.estado === 'por-validar' && !(i.resposta.avisos ?? []).length && i.rubrica);
    for (const item of prontas) await decidir(item, decisaoValidar(item));
  }

  function desenhar() {
    const conta = (e) => itens.filter((i) => i.estado === e).length;
    const prontas = itens.filter((i) => i.estado === 'por-validar' && !(i.resposta?.avisos ?? []).length && i.rubrica).length;
    resumo.textContent = itens.length
      ? [`Ficheiros: ${itens.length}`, `Por validar: ${conta('por-validar') + conta('possivel-repeticao')}`, `Validadas: ${conta('validada')}`,
        `Repetidas (não consideradas): ${conta('repetida')}`, `Com problema: ${conta('ilegivel') + conta('erro') + conta('recusado')}`,
        `Em curso: ${conta('na-fila') + conta('a-enviar') + conta('a-ler')}`].join(' · ')
      : '';
    botaoValidarTodas.hidden = prontas === 0;
    botaoValidarTodas.textContent = prontas === 1 ? 'Validar 1 fatura sem avisos' : `Validar ${prontas} faturas sem avisos`;
    corpo.replaceChildren(...itens.flatMap(linhas));
  }

  function linhas(item) {
    const l = item.resposta?.leitura;
    const seletor = el('select', { 'aria-label': 'Rubrica', disabled: !['por-validar', 'possivel-repeticao'].includes(item.estado) || item.ocupado,
      onchange: (e) => { item.rubrica = e.target.value; desenhar(); } },
    el('option', { value: '' }, '— escolher —'),
    rubricas.map((r) => el('option', { value: r.codigo, selected: r.codigo === item.rubrica }, `${r.codigo} · ${r.nome}`)));
    const aberto = item.aberto ?? ['possivel-repeticao', 'repetida', 'erro', 'ilegivel'].includes(item.estado);
    const principal = el('tr', { classe: `lote-linha estado-${item.estado}` },
      el('td', {}, item.ficheiro.name),
      el('td', {}, el('span', { classe: `etiqueta estado-${item.estado}` }, ROTULOS[item.estado] ?? item.estado)),
      el('td', {}, l?.fornecedor?.nome ?? '—'),
      el('td', {}, l?.numero ?? '—'),
      el('td', {}, l?.dataEmissao ?? '—'),
      el('td', { classe: 'numero' }, dinheiro(l?.totais?.total, l?.moeda)),
      el('td', {}, seletor),
      el('td', {}, el('button', { type: 'button', classe: 'ligacao', 'aria-expanded': String(aberto), onclick: () => { item.aberto = !aberto; desenhar(); } }, aberto ? 'Fechar' : 'Detalhe')));
    return aberto ? [principal, el('tr', { classe: `lote-detalhe estado-${item.estado}` }, el('td', { colspan: '8' }, detalhe(item)))] : [principal];
  }

  function detalhe(item) {
    const r = item.resposta, l = r?.leitura;
    const partes = [];
    if (item.erro) partes.push(el('p', { classe: 'erro', role: 'alert' }, item.erro));

    if (item.estado === 'repetida' && r?.repeticao) {
      const rep = r.repeticao, o = rep.resumo ?? {};
      partes.push(el('div', { classe: 'aviso-repetida' },
        el('strong', {}, rep.tipo === 'ficheiro' ? 'Este ficheiro já foi submetido.' : 'Este documento já está registado.'),
        el('p', {}, `Original: ${o.fornecedor ?? '—'} · ${o.numero ?? 'sem número'} · ${o.dataEmissao ?? '—'} · ${dinheiro(o.total, o.moeda)}${rep.despesaId ? ' (despesa validada)' : ' (em validação)'}.`),
        rep.nota ? el('p', {}, rep.nota) : null,
        el('p', {}, 'Não é considerado nas despesas nem nos pedidos de pagamento.')));
      const motivo = el('textarea', { rows: '2', 'aria-label': 'Motivo para incluir', placeholder: 'Motivo (obrigatório, pelo menos 15 caracteres)' });
      partes.push(el('div', { classe: 'acoes' },
        el('button', { type: 'button', classe: 'botao', disabled: item.ocupado, onclick: () => decidir(item, { acao: 'rejeitar', motivo: 'Repetida' }) }, 'Dispensar'),
        eAdmin && rep.tipo === 'documento' ? [motivo, el('button', { type: 'button', classe: 'botao secundario', disabled: item.ocupado, onclick: () => decidir(item, { acao: 'incluir-mesmo-assim', motivo: motivo.value }) }, 'Incluir mesmo assim')] : null));
      return partes;
    }
    if (item.estado === 'repetida') return partes; // repetida dentro do lote, sem resposta do servidor
    if (!l) {
      if (r && item.estado === 'ilegivel') partes.push(el('div', { classe: 'acoes' }, el('button', { type: 'button', classe: 'botao', onclick: () => decidir(item, { acao: 'rejeitar', motivo: 'Ilegível' }) }, 'Dispensar')));
      if (item.estado === 'erro' && item.sha) partes.push(el('button', { type: 'button', classe: 'botao', onclick: () => { item.estado = 'na-fila'; item.erro = null; desenhar(); processarFila(); } }, 'Tentar de novo'));
      return partes;
    }

    if ((r.avisos ?? []).length) partes.push(el('ul', { classe: 'avisos' }, r.avisos.map((a) => el('li', {}, a.texto))));
    if (l.rubrica?.justificacao) partes.push(el('p', { classe: 'justificacao' }, `Rubrica proposta: ${l.rubrica.codigo} — ${l.rubrica.justificacao}`));

    if (item.estado === 'possivel-repeticao') {
      partes.push(el('div', { classe: 'aviso-repetida' },
        el('strong', {}, 'Pode ser a mesma despesa de:'),
        el('ul', {}, r.possiveisRepeticoes.map((p) => el('li', {}, `${p.fornecedor ?? '—'} · ${p.numero ?? 'sem número'} · ${p.dataEmissao ?? '—'} · ${dinheiro(p.total, p.moeda)}`))),
        el('label', {}, el('input', { type: 'checkbox', checked: !!item.confirmoNaoRepetida, onchange: (e) => { item.confirmoNaoRepetida = e.target.checked; } }), ' Confirmo que é uma despesa diferente')));
    }

    if (['por-validar', 'possivel-repeticao'].includes(item.estado)) {
      const c = (item.correcoes ??= {});
      const campo = (rotulo, valor, guardar, tipo = 'text') => el('label', {}, rotulo,
        el('input', { type: tipo, value: valor ?? '', step: tipo === 'number' ? '0.01' : null, onchange: (e) => guardar(e.target.value) }));
      const numeroOuNulo = (v) => (v === '' ? null : Number(v));
      partes.push(el('fieldset', { classe: 'correcoes' }, el('legend', {}, 'Confirmar ou corrigir a leitura'),
        campo('N.º', c.numero ?? l.numero, (v) => { c.numero = v; }),
        campo('Data', c.dataEmissao ?? l.dataEmissao, (v) => { c.dataEmissao = v; }, 'date'),
        campo('Fornecedor', c.fornecedor?.nome ?? l.fornecedor.nome, (v) => { c.fornecedor = { ...c.fornecedor, nome: v }; }),
        campo('NIF / n.º de IVA', c.fornecedor?.nif ?? l.fornecedor.nif, (v) => { c.fornecedor = { ...c.fornecedor, nif: v }; }),
        campo('País', c.fornecedor?.pais ?? l.fornecedor.pais, (v) => { c.fornecedor = { ...c.fornecedor, pais: v.toUpperCase() }; }),
        campo('Base', c.totais?.base ?? l.totais.base, (v) => { c.totais = { ...c.totais, base: numeroOuNulo(v) }; }, 'number'),
        campo('Imposto', c.totais?.imposto ?? l.totais.imposto, (v) => { c.totais = { ...c.totais, imposto: numeroOuNulo(v) }; }, 'number'),
        campo('Total', c.totais?.total ?? l.totais.total, (v) => { c.totais = { ...c.totais, total: numeroOuNulo(v) }; }, 'number'),
        campo('Moeda', c.moeda ?? l.moeda ?? 'EUR', (v) => { c.moeda = v.toUpperCase(); desenhar(); }),
        (c.moeda ?? l.moeda ?? 'EUR') !== 'EUR' ? [
          campo('Taxa de câmbio (1 unidade = x €)', item.taxaCambio, (v) => { item.taxaCambio = v; }),
          campo('Fonte do câmbio', item.fonteCambio, (v) => { item.fonteCambio = v; }),
        ] : null));
      partes.push(el('div', { classe: 'acoes' },
        el('button', { type: 'button', classe: 'botao', disabled: item.ocupado || !item.rubrica, onclick: () => decidir(item, decisaoValidar(item)) }, 'Validar'),
        el('button', { type: 'button', classe: 'botao secundario', disabled: item.ocupado, onclick: () => decidir(item, { acao: 'rejeitar', motivo: 'Rejeitada na revisão' }) }, 'Rejeitar')));
    }
    return partes;
  }

  return { itens, novoLote: () => { loteId = novoLoteId(); itens.length = 0; shasNoLote.clear(); desenhar(); } };
}
