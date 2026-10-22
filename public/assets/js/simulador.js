/* DCAB Consulting — simulador de classificação da informação.
 * Dez casos fictícios. Para cada um: escolher o nível e a forma de tratar o documento.
 * Corre só no navegador: não envia nem guarda respostas.
 */
(function () {
  "use strict";
  const raiz = document.getElementById("simulador");
  if (!raiz) return;

  const NIVEIS = ["Público", "Interno", "Confidencial", "Restrito"];
  const CLASSE = ["publico", "interno", "confidencial", "restrito"];

  const CASOS = [
    {
      tipo: "PDF", titulo: "Comunicado de imprensa sobre a nova fábrica",
      contexto: "Publicado ontem no site da empresa e enviado às redações.",
      excerto: "COMUNICADO DE IMPRENSA · 2 de setembro\nA Metalúrgica Exemplo inaugurou hoje a nova unidade de Braga,\ncom 120 postos de trabalho e um investimento de 14 milhões de euros.\n«É um passo decisivo para a exportação», afirmou a presidente executiva.",
      nivel: 0,
      porque: "O conteúdo já é público e foi escrito para ser divulgado. Classificar acima de Público só cria trabalho e banaliza os níveis mais altos.",
      ref: "ISO/IEC 27001:2022, controlo 5.12",
      pergunta: "Um jornalista pede o comunicado por email.",
      opcoes: ["Enviar o PDF.", "Enviar só depois de cifrar o ficheiro.", "Recusar: só a administração pode enviar documentos para fora."],
      certa: 0,
      tratamento: "Informação pública não precisa de controlos. Cifrar o que é público gasta tempo e ensina as pessoas a ignorar a cifra quando ela importa.",
    },
    {
      tipo: "Word", titulo: "Proposta comercial para uma câmara municipal",
      contexto: "Versão de trabalho da equipa comercial, com uma folha de margens no fim.",
      excerto: "Proposta n.º 2026/118 · Câmara Municipal de Exemplo\nImplementação de prevenção de fuga de dados, 12 meses\nPreço total: 84 500 € + IVA\nAnexo (uso interno): custo previsto 58 300 € · margem 31%",
      nivel: 2,
      porque: "Preços, condições e margens dão vantagem a um concorrente. A proposta é para um destinatário concreto e não deve circular para além dele.",
      ref: "ISO/IEC 27001:2022, controlos 5.12 e 5.13",
      pergunta: "A proposta tem de seguir hoje para o cliente.",
      opcoes: ["Enviar a versão final, sem a folha de margens, para o contacto indicado pelo cliente.", "Enviar o ficheiro de trabalho completo: o cliente percebe o que é interno.", "Partilhar por uma ligação pública do OneDrive, que é mais simples."],
      certa: 0,
      tratamento: "Antes de enviar, retira-se o que o destinatário não precisa de ver. Ligações públicas ficam acessíveis a quem as receber, mesmo por reencaminhamento.",
    },
    {
      tipo: "Digitalização", titulo: "Atestado médico de um colaborador",
      contexto: "Entregue nos Recursos Humanos para justificar cinco dias de falta.",
      excerto: "ATESTADO MÉDICO\nDeclaro que Rui Exemplo esteve incapacitado para o trabalho\nde 3 a 7 de março, por [diagnóstico].\nAss.: Dr.ª ………, cédula profissional n.º ………",
      nivel: 3,
      porque: "Dados de saúde são uma categoria especial: só podem ser tratados nas condições estritas do RGPD e exigem a proteção mais alta.",
      ref: "RGPD, art. 9.º · Código do Trabalho, art. 17.º",
      pergunta: "O chefe de equipa quer saber porque é que o colaborador faltou.",
      opcoes: ["Reencaminhar-lhe o atestado.", "Informar só que a falta está justificada e o período.", "Dizer-lhe o diagnóstico, para poder organizar o trabalho."],
      certa: 1,
      tratamento: "O chefe precisa de saber o período e que a falta está justificada. O diagnóstico não é necessário para organizar o trabalho e o Código do Trabalho limita o acesso do empregador a informação de saúde.",
    },
    {
      tipo: "Intranet", titulo: "Procedimento para pedir férias",
      contexto: "Publicado na intranet. Explica os prazos e a aprovação pela chefia.",
      excerto: "PROCEDIMENTO RH-04 · Pedido de férias\n1. Registar o pedido no portal até 30 de abril.\n2. A chefia aprova ou propõe outras datas em 10 dias úteis.\n3. Alterações posteriores carecem de acordo das duas partes.",
      nivel: 1,
      porque: "Não tem dados pessoais nem informação que prejudique a empresa, mas foi escrito para uso dentro da organização.",
      ref: "ISO/IEC 27001:2022, controlo 5.12",
      pergunta: "Um consultor externo, com contrato e acordo de confidencialidade, precisa do procedimento para configurar o novo software de RH.",
      opcoes: ["Enviar: está coberto pelo contrato e precisa dele para o trabalho.", "Publicar numa pasta pública para facilitar o acesso.", "Recusar: informação interna nunca sai da organização."],
      certa: 0,
      tratamento: "Interno não quer dizer que nunca sai: pode ser partilhado com quem trabalha para a organização, com contrato e necessidade. Publicar já seria tratá-lo como Público.",
    },
    {
      tipo: "Word", titulo: "Rascunho do comunicado de resultados trimestrais",
      contexto: "A empresa tem ações cotadas na Euronext Lisbon. O comunicado sai daqui a duas semanas.",
      excerto: "RASCUNHO · NÃO DIVULGAR\nResultados do 3.º trimestre\nLucro líquido: −38% face ao período homólogo, abaixo das previsões.\nDivulgação prevista: 29 de outubro, antes da abertura do mercado.",
      nivel: 3,
      porque: "É informação privilegiada: precisa, não pública e capaz de influenciar a cotação. Quem lhe acede tem de constar da lista de iniciados, e divulgá-la ou negociar com ela é proibido.",
      ref: "Regulamento (UE) n.º 596/2014 (abuso de mercado), arts. 7.º, 10.º, 14.º e 18.º",
      pergunta: "Um colega de outro departamento pergunta, no café, se os resultados vão ser bons.",
      opcoes: ["Dizer que não pode falar sobre isso.", "Dar só uma pista, sem números.", "Contar: é colega da empresa."],
      certa: 0,
      tratamento: "Uma pista também é divulgação. O colega não está na lista de iniciados e, se comprar ou vender ações com base nela, ambos ficam expostos a responsabilidade.",
    },
    {
      tipo: "Excel", titulo: "Lista de presenças de uma formação",
      contexto: "Formação interna sobre phishing, com 18 participantes.",
      excerto: "Nome            | Departamento | Email\nAna Exemplo     | Compras      | ana.exemplo@metalurgica-exemplo.pt\nRui Exemplo     | Produção     | rui.exemplo@metalurgica-exemplo.pt\n…",
      nivel: 1, aceitavel: 2,
      porque: "Tem dados pessoais, mas só de contacto profissional e de baixo risco. Interno chega; muitas organizações tratam qualquer lista de pessoas como Confidencial, o que também é aceitável.",
      ref: "RGPD, art. 5.º, n.º 1, al. c) (minimização)",
      pergunta: "A empresa de formação pede a lista para emitir os certificados.",
      opcoes: ["Enviar só os nomes e os endereços de email necessários para os certificados.", "Enviar a lista completa, com departamentos e telefones.", "Publicar a lista no site, para cada um descarregar o seu certificado."],
      certa: 0,
      tratamento: "Partilha-se o mínimo necessário para a finalidade. Departamentos e telefones não servem para emitir certificados.",
    },
    {
      tipo: "Ficheiro de configuração", titulo: "Ligação à base de dados do ERP",
      contexto: "Encontrado numa pasta partilhada de projeto.",
      excerto: "# ligação à base de dados de produção\nDB_HOST=10.0.4.12\nDB_USER=erp_admin\nDB_PASSWORD=Pr0d!2026",
      nivel: 3,
      porque: "Uma credencial em claro dá acesso direto a um sistema crítico. Não devia estar num ficheiro partilhado.",
      ref: "ISO/IEC 27001:2022, controlo 5.17 · Regulamento n.º 756/2026, medidas de gestão de acessos",
      pergunta: "O ficheiro foi enviado por engano a um fornecedor.",
      opcoes: ["Pedir ao fornecedor que apague o email.", "Mudar a palavra-passe já, rever os acessos recentes e registar o incidente.", "Não fazer nada: o fornecedor não tem acesso à rede interna."],
      certa: 1,
      tratamento: "Uma credencial exposta trata-se como comprometida. Pedir que apaguem o email não elimina o risco. O registo permite avaliar, se a entidade estiver abrangida, se há obrigação de notificar o CNCS (DL 125/2025, art. 42.º).",
    },
    {
      tipo: "Excel", titulo: "Folha de processamento salarial",
      contexto: "Preparada pelos Recursos Humanos todos os meses.",
      excerto: "Nome      | NIF        | IBAN           | Base     | Faltas\nAna E.    | 1•••••••9  | PT50 … 0154    | 1 820 €  | 0\nRui E.    | 2•••••••3  | PT50 … 7731    | 1 460 €  | 5 (doença)\n…",
      nivel: 3, aceitavel: 2,
      porque: "Junta identificadores, contas bancárias e salários de todos os trabalhadores. A coluna de faltas indica doença, o que já é um dado de saúde.",
      ref: "RGPD, arts. 9.º e 32.º",
      pergunta: "O contabilista externo precisa da folha para processar os salários.",
      opcoes: ["Enviar por email, com a palavra-passe do ficheiro na mesma mensagem.", "Partilhar numa pasta com acesso só para o contabilista, com registo de acessos, e enviar a palavra-passe por outro canal.", "Imprimir e deixar na receção para ele levantar."],
      certa: 1,
      tratamento: "A palavra-passe na mesma mensagem anula a cifra. O acesso nominal e o registo mostram quem abriu o quê, que é o que o nível Restrito pede.",
    },
    {
      tipo: "Ata", titulo: "Ata do conselho de administração",
      contexto: "A empresa não é cotada. A ata decide avançar com a compra de um concorrente.",
      excerto: "ATA N.º 14\nO conselho deliberou apresentar proposta de aquisição de 100%\nda Exemplo Metais, Lda., até 6,2 milhões de euros.\nNegociação conduzida sob o nome de código «Projeto Faro».",
      nivel: 3, aceitavel: 2,
      porque: "Não é informação privilegiada no sentido do abuso de mercado, porque a empresa não é cotada, mas é estratégica: uma fuga pode fazer subir o preço ou travar a operação.",
      ref: "ISO/IEC 27001:2022, controlo 5.12",
      pergunta: "O advogado que assessora a operação precisa da ata.",
      opcoes: ["Enviar cifrada, depois de confirmar que ele está abrangido pelo acordo de confidencialidade da operação.", "Enviar a partir do email pessoal do administrador, que é mais rápido.", "Colar o texto num assistente de IA público para fazer um resumo antes de enviar."],
      certa: 0,
      tratamento: "Contas pessoais e ferramentas públicas de IA ficam fora do controlo da empresa. O que entra num assistente público pode ser guardado e usado pelo fornecedor.",
    },
    {
      tipo: "PDF", titulo: "Relatório de teste de intrusão",
      contexto: "Entregue pela empresa que testou a rede no mês passado.",
      excerto: "RESUMO EXECUTIVO\n3 vulnerabilidades críticas por corrigir:\n· acesso VPN sem autenticação multifator\n· servidor de email com versão desatualizada\n· palavra-passe por omissão num equipamento de rede",
      nivel: 3, aceitavel: 2,
      porque: "Descreve falhas ainda abertas. Para um atacante, é um mapa do caminho mais curto para entrar.",
      ref: "Regulamento n.º 756/2026, Anexo III · ISO/IEC 27001:2022, controlo 8.8",
      pergunta: "Um potencial cliente pede provas de que a empresa faz testes de segurança.",
      opcoes: ["Enviar o relatório completo.", "Enviar uma declaração do fornecedor do teste com âmbito, data e estado das correções, sem detalhes técnicos.", "Recusar qualquer informação."],
      certa: 1,
      tratamento: "O cliente quer saber que o teste existe e que as falhas são tratadas, não quais são. Uma declaração resumida responde sem expor a rede.",
    },
  ];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let i = 0, respostas = [];
  // As opções aparecem por ordem aleatória, para a posição da resposta certa não se tornar previsível
  function baralhar(a) {
    for (let k = a.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [a[k], a[r]] = [a[r], a[k]]; }
    return a;
  }

  function cabecalho() {
    return `<div class="sim__progresso"><span>Caso ${i + 1} de ${CASOS.length}</span><progress class="sim__barra" max="${CASOS.length}" value="${i}" aria-hidden="true"></progress></div>`;
  }

  function mostrarCaso() {
    const c = CASOS[i];
    raiz.innerHTML = `
      ${cabecalho()}
      <h2 class="sim__titulo" tabindex="-1" id="sim-titulo">${esc(c.titulo)}</h2>
      <p class="sim__contexto">${esc(c.contexto)}</p>
      <figure class="sim__documento">
        <figcaption><span>${esc(c.tipo)}</span><span>Dados fictícios</span></figcaption>
        <pre>${esc(c.excerto)}</pre>
      </figure>
      <fieldset class="sim__escolha" id="sim-nivel">
        <legend>Que nível de classificação atribui?</legend>
        <div class="sim__niveis">${NIVEIS.map((n, k) => `<button type="button" class="sim__nivel sim__nivel--${CLASSE[k]}" data-nivel="${k}">${n}</button>`).join("")}</div>
      </fieldset>
      <div id="sim-retorno-nivel" aria-live="polite"></div>
      <div id="sim-tratamento"></div>`;
    raiz.querySelector("#sim-titulo").focus({ preventScroll: true });
    raiz.querySelectorAll("[data-nivel]").forEach((b) => b.addEventListener("click", () => escolherNivel(Number(b.dataset.nivel))));
  }

  function escolherNivel(k) {
    const c = CASOS[i];
    const pontos = k === c.nivel ? 2 : k === c.aceitavel ? 1 : 0;
    respostas[i] = { nivel: k, pontosNivel: pontos };
    raiz.querySelectorAll("[data-nivel]").forEach((b) => {
      const v = Number(b.dataset.nivel);
      b.disabled = true;
      if (v === k) b.classList.add("sim__nivel--escolhido");
      if (v === c.nivel) b.classList.add("sim__nivel--certo");
    });
    const veredito = pontos === 2 ? ["certo", "Certo."] : pontos === 1 ? ["parcial", `Aceitável. A resposta mais adequada é ${NIVEIS[c.nivel]}.`] : ["errado", `Não. A resposta mais adequada é ${NIVEIS[c.nivel]}${c.aceitavel !== undefined ? ` (${NIVEIS[c.aceitavel]} também é aceitável)` : ""}.`];
    raiz.querySelector("#sim-retorno-nivel").innerHTML = `
      <div class="sim__retorno sim__retorno--${veredito[0]}">
        <p><strong>${esc(veredito[1])}</strong> ${esc(c.porque)}</p>
        <p class="sim__ref">${esc(c.ref)}</p>
      </div>`;
    raiz.querySelector("#sim-tratamento").innerHTML = `
      <fieldset class="sim__escolha">
        <legend>${esc(c.pergunta)} O que faz?</legend>
        <div class="sim__opcoes">${baralhar(c.opcoes.map((o, j) => [o, j])).map(([o, j]) => `<button type="button" class="sim__opcao" data-opcao="${j}">${esc(o)}</button>`).join("")}</div>
      </fieldset>
      <div id="sim-retorno-tratamento" aria-live="polite"></div>`;
    raiz.querySelectorAll("[data-opcao]").forEach((b) => b.addEventListener("click", () => escolherOpcao(Number(b.dataset.opcao))));
  }

  function escolherOpcao(j) {
    const c = CASOS[i];
    const certo = j === c.certa;
    respostas[i].pontosTratamento = certo ? 1 : 0;
    raiz.querySelectorAll("[data-opcao]").forEach((b) => {
      const v = Number(b.dataset.opcao);
      b.disabled = true;
      if (v === j) b.classList.add("sim__opcao--escolhida");
      if (v === c.certa) b.classList.add("sim__opcao--certa");
    });
    const ultimo = i === CASOS.length - 1;
    raiz.querySelector("#sim-retorno-tratamento").innerHTML = `
      <div class="sim__retorno sim__retorno--${certo ? "certo" : "errado"}">
        <p><strong>${certo ? "Certo." : "Não é a melhor opção."}</strong> ${esc(c.tratamento)}</p>
      </div>
      <button type="button" class="botao" id="sim-seguinte">${ultimo ? "Ver o resultado" : "Caso seguinte"}</button>`;
    const seg = raiz.querySelector("#sim-seguinte");
    seg.addEventListener("click", () => { i++; ultimo ? mostrarFim() : mostrarCaso(); raiz.scrollIntoView({ behavior: "smooth", block: "start" }); });
    seg.focus({ preventScroll: true });
  }

  function mostrarFim() {
    const max = CASOS.length * 3;
    const total = respostas.reduce((s, r) => s + r.pontosNivel + r.pontosTratamento, 0);
    const perfil = total >= max * 0.85
      ? ["Classifica com critério.", "Distingue bem os níveis e sabe o que cada um pede no dia a dia. O passo seguinte é levar o mesmo critério para regras automáticas, para que a classificação não dependa só da memória de cada pessoa."]
      : total >= max * 0.6
        ? ["Bom ponto de partida.", "Acerta na maioria dos casos, mas hesita em algumas situações. Um esquema escrito, com exemplos dos documentos de cada equipa, ajuda a decidir nesses casos."]
        : ["Vale a pena rever as regras.", "Vários casos ficaram abaixo ou acima do nível adequado. É o resultado mais comum quando não há um esquema de classificação escrito e explicado com exemplos."];
    raiz.innerHTML = `
      <div class="sim__progresso"><span>Resultado</span><progress class="sim__barra" max="1" value="1" aria-hidden="true"></progress></div>
      <h2 class="sim__titulo" tabindex="-1" id="sim-titulo">${total} de ${max} pontos</h2>
      <p class="sim__perfil"><strong>${esc(perfil[0])}</strong> ${esc(perfil[1])}</p>
      <ol class="sim__resumo">${CASOS.map((c, k) => {
        const r = respostas[k];
        const ok = r.pontosNivel === 2 && r.pontosTratamento === 1;
        return `<li class="${ok ? "ok" : "rever"}"><span>${esc(c.titulo)}</span><span>${NIVEIS[r.nivel]}${r.nivel !== c.nivel ? ` · adequado: ${NIVEIS[c.nivel]}` : ""}${r.pontosTratamento ? "" : " · tratamento a rever"}</span></li>`;
      }).join("")}</ol>
      <p class="sim__nota">Nível certo: 2 pontos (1 se aceitável). Tratamento certo: 1 ponto. As respostas não são guardadas.</p>
      <div class="sim__acoes">
        <a class="botao" href="/#contacto">Pedir contacto</a>
        <a class="botao botao--linha" href="https://observatorio.dcabconsulting.com/#detetor">Analisar um documento real</a>
        <button type="button" class="ligacao" id="sim-repetir">Repetir o simulador</button>
      </div>`;
    raiz.querySelector("#sim-titulo").focus({ preventScroll: true });
    raiz.querySelector("#sim-repetir").addEventListener("click", iniciar);
  }

  function iniciar() {
    i = 0; respostas = [];
    mostrarCaso();
  }

  const comecar = document.getElementById("sim-comecar");
  if (comecar) comecar.addEventListener("click", iniciar);
})();
