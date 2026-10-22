"""Gera as páginas em public/solucoes/."""
import pathlib
from comum import cabeca, topo, rodape, captura, SITE, ANKORA

RAIZ = pathlib.Path(__file__).resolve().parent.parent / "public" / "solucoes"
ORG = SITE + "/#organizacao"

RESUMOS = {
    "prevencao-fuga-dados": ("Prevenção de fuga de dados", "DLP no email, na web, na cloud e nos postos de trabalho, do levantamento à afinação das regras."),
    "classificacao-informacao": ("Classificação da informação", "Níveis de classificação e etiquetas que acompanham cada documento, alinhados com a ISO/IEC 27001."),
    "continuidade-negocio": ("Continuidade de negócio", "Análise de impacto, planos de continuidade e recuperação segundo a ISO 22301, cópias protegidas e testes."),
    "resposta-incidentes": ("Resposta a incidentes", "Planos de resposta, exercícios e apoio na contenção, investigação e notificação de incidentes."),
    "nis2-decreto-lei-125-2025": ("Adequação à NIS2", "Qualificação da entidade, responsáveis, medidas do nível atribuído e notificação de incidentes."),
}


def relacionadas(lista):
    out = []
    for s in lista:
        n, d = RESUMOS[s]
        out.append(f'<a class="relacionada" href="/solucoes/{s}"><strong>{n}</strong><span>{d}</span></a>')
    out.append(f'<a class="relacionada" href="{ANKORA}" target="_blank" rel="noopener"><strong>AnkoraOne</strong>'
               '<span>A plataforma de governação, risco e conformidade da DCAB Consulting.</span></a>')
    return "\n        ".join(out)


def na_ankora(titulo, texto, img, alt, legenda):
    return f"""
    <section class="na-ankora" aria-labelledby="na-ankora-titulo">
      <div class="bloco__interior na-ankora__interior">
        <div>
          <p class="ankora__nome">Na AnkoraOne</p>
          <h2 id="na-ankora-titulo">{titulo}</h2>
          {texto}
          <p><a href="{ANKORA}/#modulos" target="_blank" rel="noopener">Ver os módulos em ankoraone.com</a></p>
        </div>
        <figure>
          {captura(img, alt, "(max-width: 860px) 100vw, 680px")}
          <figcaption>{legenda} Dados de demonstração.</figcaption>
        </figure>
      </div>
    </section>"""


def pagina(slug, titulo_doc, descricao, nome_curto, h1, intro, corpo, faq, cta_titulo, cta_texto,
           variante, bloco_ankora, rel, nome_servico):
    url = f"{SITE}/solucoes/{slug}"
    jsonld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "Service", "@id": url + "#servico", "name": nome_servico, "description": descricao,
             "url": url, "areaServed": {"@type": "Country", "name": "Portugal"},
             "provider": {"@type": "Organization", "@id": ORG, "name": "DCAB Consulting", "url": SITE + "/"}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Início", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Soluções", "item": SITE + "/#solucoes"},
                {"@type": "ListItem", "position": 3, "name": nome_curto, "item": url}]},
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        ],
    }
    faq_html = "\n".join(f'      <details class="faq"><summary>{q}</summary><p>{a}</p></details>' for q, a in faq)
    classe = f" pagina-cabeca--{variante}" if variante else ""
    html = cabeca(titulo_doc, descricao, f"/solucoes/{slug}",
                  og_titulo=f"{nome_servico} | DCAB Consulting", jsonld=jsonld) + "\n" + topo() + f"""
  <main id="conteudo">
    <section class="pagina-cabeca{classe}">
      <div class="bloco__interior">
        <nav class="migalhas" aria-label="Localização"><a href="/">Início</a> <span aria-hidden="true">›</span> <a href="/#solucoes">Soluções</a> <span aria-hidden="true">›</span> <span aria-current="page">{nome_curto}</span></nav>
        <h1>{h1}</h1>
        <p class="pagina-cabeca__intro">{intro}</p>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <article class="bloco__interior pagina-corpo">
{corpo.strip()}

      <h2>Perguntas frequentes</h2>
{faq_html}
    </article>
{bloco_ankora}

    <section class="pagina-cta">
      <div class="bloco__interior pagina-cta__interior">
        <div>
          <h2>{cta_titulo}</h2>
          <p>{cta_texto}</p>
        </div>
        <a class="botao botao--claro" href="/#contacto">Pedir contacto</a>
      </div>
    </section>

    <section class="bloco__interior pagina-relacionadas" aria-labelledby="relacionadas-titulo">
      <h2 id="relacionadas-titulo">Outras soluções</h2>
      <div class="relacionadas">
        {relacionadas(rel)}
      </div>
    </section>
  </main>
""" + rodape()
    (RAIZ / f"{slug}.html").write_text(html, encoding="utf-8")
    print("gerada", slug)


# ---------------------------------------------------------------- DLP
pagina(
    "prevencao-fuga-dados",
    "Prevenção de fuga de dados (DLP) | DCAB Consulting",
    "Implementação de prevenção de fuga de dados (DLP) no email, na web, na cloud e nos postos de trabalho, do levantamento à afinação das regras.",
    "Prevenção de fuga de dados",
    "Prevenção de fuga de dados (DLP)",
    "A prevenção de fuga de dados, conhecida pela sigla inglesa DLP (<em>Data Loss Prevention</em>), reúne as políticas e as ferramentas que detetam informação sensível e impedem que saia da organização por canais não autorizados. A DCAB Consulting implementa a DLP em organizações privadas e públicas, desde o levantamento inicial até à afinação das regras em produção.",
    """
<h2>Onde acontecem as fugas de informação</h2>
<p>As fugas de informação mais frequentes acontecem em tarefas do dia a dia: um email com anexos enviado ao destinatário errado, uma pasta partilhada com uma ligação pública, um ficheiro copiado para uma pen USB ou para uma conta pessoal de armazenamento, ou um excerto de um contrato colado numa ferramenta de inteligência artificial generativa.</p>
<p>Uma ferramenta de DLP analisa o conteúdo que está a ser enviado, compara-o com as regras definidas pela organização e, conforme o caso, regista o envio, avisa o utilizador ou bloqueia-o.</p>
<p class="destaque-ferramenta">Veja como funciona a deteção: o <a href="https://observatorio.dcabconsulting.com/#detetor">detetor de informação sensível</a> analisa um texto ou um ficheiro no seu navegador, sem o enviar para lado nenhum.</p>

<h2>Os canais que controlamos</h2>
<div class="canais">
  <div><h3>Email</h3><p>Mensagens e anexos com dados pessoais, financeiros ou confidenciais enviados para fora da organização.</p></div>
  <div><h3>Web e aplicações cloud</h3><p>Carregamentos para serviços de partilha de ficheiros, formulários web e aplicações não autorizadas.</p></div>
  <div><h3>Postos de trabalho</h3><p>Cópias para dispositivos USB, impressão e transferência de ficheiros para pastas sincronizadas.</p></div>
  <div><h3>IA generativa</h3><p>Texto e documentos colados ou carregados em assistentes de IA públicos.</p></div>
</div>

<h2>Como trabalhamos</h2>
<ol class="passos">
  <li><strong>Levantamento.</strong> Identificamos que informação é sensível, onde está guardada e que equipas a usam, com base em entrevistas e em ferramentas de descoberta.</li>
  <li><strong>Definição das políticas.</strong> Propomos regras por tipo de informação e por canal, revistas com a administração e com o encarregado de proteção de dados.</li>
  <li><strong>Monitorização.</strong> As regras começam por registar os envios sem os bloquear, para medir o impacto antes de mudar a forma de trabalhar das equipas.</li>
  <li><strong>Afinação e bloqueio gradual.</strong> Reduzimos os falsos positivos e ativamos o bloqueio por fases, a começar pela informação mais crítica.</li>
  <li><strong>Acompanhamento.</strong> Entregamos relatórios periódicos e revemos as regras quando mudam os processos, as aplicações ou a legislação.</li>
</ol>

<h2>Enquadramento legal</h2>
<p>O artigo 32.º do Regulamento Geral sobre a Proteção de Dados (RGPD) obriga a aplicar medidas técnicas adequadas para proteger os dados pessoais. A Diretiva NIS2, transposta para o direito português pelo Decreto-Lei n.º 125/2025, exige às entidades abrangidas medidas de controlo de acessos, de cifragem e de gestão de ativos. A DLP ajuda a cumprir estas obrigações e a demonstrar que são cumpridas.</p>
""",
    [
        ("A DLP vai impedir as equipas de trabalhar?", "Não deve. Por isso começamos em modo de monitorização e só ativamos o bloqueio depois de afinar as regras. Quando há uma necessidade legítima, o utilizador pode justificar o envio e a exceção fica registada."),
        ("Funciona com o Microsoft 365 e o Google Workspace?", "Ambas as plataformas incluem funcionalidades de DLP em determinadas licenças. Antes de propor ferramentas adicionais, avaliamos o que a organização já tem disponível."),
        ("Qual é a relação com a classificação da informação?", "As etiquetas de classificação tornam as regras de DLP mais simples e mais precisas. Um documento marcado como confidencial pode ter regras próprias, independentemente do conteúdo que a ferramenta consiga reconhecer."),
    ],
    "Fale connosco sobre prevenção de fuga de dados",
    "A primeira reunião serve para perceber onde está a informação sensível e por onde costuma sair.",
    "",
    na_ankora("Políticas aprovadas e lidas por quem as tem de cumprir",
              "<p>A política de DLP e as regras de tratamento da informação ficam no módulo Documentos e evidências, com versões, aprovação e registo de leitura por cada colaborador. As exceções aprovadas ficam anexas como evidência para a auditoria.</p>",
              "documentos", "Módulo Documentos da AnkoraOne com versões, estado de aprovação e percentagem de leitura de cada política",
              "Documentos e evidências."),
    ["classificacao-informacao", "resposta-incidentes"],
    "Prevenção de fuga de dados (DLP)",
)

# ---------------------------------------------------------------- Classificação
pagina(
    "classificacao-informacao",
    "Classificação e rotulagem da informação | DCAB Consulting",
    "Esquemas de classificação da informação definidos para cada organização, com rotulagem automática ou pelo utilizador, alinhados com a ISO/IEC 27001.",
    "Classificação da informação",
    "Classificação e rotulagem da informação",
    "Classificar a informação é atribuir a cada documento um nível de sensibilidade, como Interno ou Confidencial, e uma etiqueta que o acompanha onde quer que seja guardado ou enviado. A partir daí, cada documento recebe a proteção que o seu valor justifica.",
    """
<h2>Porque classificar</h2>
<p>Sem classificação, a organização acaba por proteger toda a informação da mesma forma, com custos elevados e entraves ao trabalho, ou por proteger pouco e deixar expostos os documentos que mais importam. A classificação permite aplicar controlos mais exigentes apenas onde fazem falta.</p>

<h2>Quatro níveis chegam na maioria dos casos</h2>
<div class="tabela-envolvente"><table class="tabela-conteudo">
  <thead><tr><th scope="col">Nível</th><th scope="col">Exemplos</th><th scope="col">Tratamento habitual</th></tr></thead>
  <tbody>
    <tr><td>Público</td><td>Brochuras, conteúdos do site</td><td>Sem restrições</td></tr>
    <tr><td>Interno</td><td>Procedimentos, comunicações internas</td><td>Partilha apenas dentro da organização</td></tr>
    <tr><td>Confidencial</td><td>Contratos, propostas, dados de clientes</td><td>Acesso limitado às equipas envolvidas e cifragem no envio externo</td></tr>
    <tr><td>Restrito</td><td>Dados de saúde, informação estratégica, credenciais</td><td>Acesso nominal, cifragem permanente e registo de todos os acessos</td></tr>
  </tbody>
</table></div>
<p>O esquema tem de ser simples o suficiente para ser usado todos os dias. Com mais níveis, os utilizadores hesitam e a classificação deixa de ser coerente.</p>

<h2>Rotulagem automática e pelo utilizador</h2>
<p>A rotulagem automática reconhece padrões, como números de identificação fiscal, IBAN ou números do cartão de cidadão, e aplica a etiqueta sem intervenção. A rotulagem pelo utilizador cobre o que nenhuma ferramenta consegue avaliar, como a sensibilidade de uma proposta ou de uma decisão interna: a ferramenta sugere uma etiqueta e o utilizador confirma.</p>
<p>A etiqueta fica nos metadados do documento, pode acrescentar uma marca visível no cabeçalho ou no rodapé e, nos níveis mais altos, aplica cifragem que se mantém fora da organização.</p>
<p class="destaque-ferramenta">Experimente: o <a href="/solucoes/simulador-classificacao">simulador de classificação</a> tem dez casos fictícios, de um comunicado de imprensa a um rascunho de resultados de uma empresa cotada.</p>

<h2>Como trabalhamos</h2>
<ol class="passos">
  <li><strong>Descoberta.</strong> Levantamento da informação existente em servidores, repositórios de documentos e serviços cloud.</li>
  <li><strong>Esquema e política.</strong> Níveis, critérios de atribuição e regras de tratamento de cada nível.</li>
  <li><strong>Configuração.</strong> Etiquetas e regras automáticas nas ferramentas que a organização já usa.</li>
  <li><strong>Formação.</strong> Sessões curtas com exemplos dos documentos que cada equipa usa.</li>
  <li><strong>Ligação à DLP.</strong> As etiquetas passam a alimentar as regras de <a href="/solucoes/prevencao-fuga-dados">prevenção de fuga de dados</a>.</li>
</ol>

<h2>Enquadramento normativo</h2>
<p>A norma ISO/IEC 27001:2022 inclui no Anexo A os controlos 5.12, sobre a classificação da informação, e 5.13, sobre a rotulagem. A Diretiva NIS2 e o Decreto-Lei n.º 125/2025 exigem a gestão dos ativos de informação. Um esquema documentado e aplicado é uma das evidências mais pedidas em auditorias de segurança.</p>
""",
    [
        ("Quantos níveis de classificação devemos ter?", "Três ou quatro. Com mais níveis, os utilizadores têm dificuldade em escolher e a classificação deixa de ser aplicada de forma coerente."),
        ("O que acontece aos documentos que já existem?", "Tratamos os repositórios existentes por fases, a começar pelos que guardam informação mais sensível. A rotulagem automática permite classificar grandes volumes sem intervenção manual."),
        ("A proteção mantém-se quando o documento é enviado para fora?", "Nos níveis em que a etiqueta aplica cifragem, sim. Só as pessoas autorizadas conseguem abrir o documento, mesmo que seja reencaminhado."),
    ],
    "Fale connosco sobre classificação da informação",
    "Podemos rever o esquema que já usam ou propor um de raiz.",
    "azul",
    na_ankora("A política de classificação como evidência de auditoria",
              "<p>O esquema de classificação e as regras de tratamento ficam em Documentos e evidências, ligados aos controlos 5.12 e 5.13 da ISO/IEC 27001 e às medidas equivalentes da NIS2 e do QNRCS. Cada colaborador confirma a leitura e o registo fica disponível para o auditor.</p>",
              "documentos", "Módulo Documentos da AnkoraOne com políticas, versões e registo de leitura",
              "Documentos e evidências."),
    ["prevencao-fuga-dados", "continuidade-negocio"],
    "Classificação e rotulagem da informação",
)

# ---------------------------------------------------------------- Continuidade
pagina(
    "continuidade-negocio",
    "Continuidade de negócio (ISO 22301) | DCAB Consulting",
    "Análise de impacto no negócio, planos de continuidade e recuperação segundo a ISO 22301, cópias de segurança protegidas contra ransomware e testes.",
    "Continuidade de negócio",
    "Continuidade de negócio e recuperação",
    "Um plano de continuidade define como a organização mantém os serviços críticos e recupera a informação depois de um ataque, de uma falha técnica ou de um desastre físico. A DCAB Consulting prepara estes planos segundo a norma ISO 22301 e acompanha os testes.",
    """
<h2>Dois valores para cada processo</h2>
<p>O trabalho começa pela análise de impacto no negócio (BIA, <em>Business Impact Analysis</em>): os processos críticos, os sistemas e as pessoas de que dependem, e o efeito de uma interrupção ao longo do tempo. Para cada processo, a análise fixa:</p>
<dl class="valores">
  <div><dt>RTO</dt><dd>Tempo máximo de recuperação: quanto tempo o processo pode estar parado sem causar danos inaceitáveis.</dd></div>
  <div><dt>RPO</dt><dd>Perda máxima de dados aceitável: o período de dados que se pode perder, que define a frequência das cópias.</dd></div>
</dl>

<h2>Continuidade e recuperação</h2>
<p>O plano de continuidade de negócio descreve como a organização continua a funcionar durante a interrupção: quem decide, como comunica com clientes e fornecedores e que processos alternativos usa. O plano de recuperação de desastre trata da parte técnica: a ordem de recuperação dos sistemas, os procedimentos de reposição e os contactos dos fornecedores envolvidos.</p>

<h2>Cópias de segurança preparadas para ransomware</h2>
<p>Os ataques de ransomware procuram cifrar ou apagar também as cópias de segurança. Aplicamos a regra 3-2-1: três cópias dos dados, em dois tipos de suporte, com uma delas fora das instalações. Pelo menos uma cópia deve ser imutável ou isolada da rede, para não poder ser alterada a partir de uma conta comprometida.</p>

<h2>Testes e exercícios</h2>
<p>Fazemos testes de reposição de dados, para confirmar que as cópias estão completas e que os tempos de recuperação são cumpridos. Fazemos também exercícios de crise em sala, em que a equipa de gestão toma decisões perante um cenário realista. Cada teste termina com uma lista de correções ao plano.</p>

<h2>Como trabalhamos</h2>
<ol class="passos">
  <li><strong>Análise de impacto.</strong> Entrevistas com as áreas de negócio e definição dos tempos de recuperação.</li>
  <li><strong>Situação atual.</strong> Revisão das cópias de segurança, da infraestrutura e dos contratos com fornecedores.</li>
  <li><strong>Planos.</strong> Redação dos planos de continuidade e de recuperação, com papéis e contactos.</li>
  <li><strong>Testes.</strong> Reposição de dados e exercício de crise, com relatório de melhorias.</li>
  <li><strong>Manutenção.</strong> Revisão anual e sempre que mudam sistemas ou processos críticos.</li>
</ol>

<h2>Enquadramento normativo</h2>
<p>A norma ISO 22301 define os requisitos de um sistema de gestão da continuidade de negócio. O artigo 21.º da Diretiva NIS2, transposta pelo Decreto-Lei n.º 125/2025, inclui a continuidade das atividades, a gestão de cópias de segurança, a recuperação de desastres e a gestão de crises entre as medidas obrigatórias. No setor financeiro, o Regulamento DORA exige uma política de continuidade das tecnologias de informação e comunicação e testes regulares.</p>
""",
    [
        ("Qual é a diferença entre cópias de segurança e um plano de recuperação?", "As cópias de segurança guardam os dados. O plano de recuperação define como e por que ordem se repõem os sistemas, quem o faz e em quanto tempo."),
        ("Com que frequência devemos testar o plano?", "Pelo menos uma vez por ano e sempre que há alterações relevantes nos sistemas, nos fornecedores ou na estrutura da organização."),
        ("Já temos os ficheiros sincronizados na cloud. Isso chega?", "Não. A sincronização replica também as alterações maliciosas: se um ficheiro for cifrado por ransomware no computador, a versão na cloud é substituída. É necessária uma cópia de segurança independente, com histórico de versões."),
    ],
    "Fale connosco sobre continuidade de negócio",
    "Se já tem cópias de segurança, podemos começar por testar uma reposição.",
    "",
    na_ankora("Maturidade medida e plano de ação acompanhado",
              "<p>A avaliação de continuidade é feita no módulo Avaliações e plano de ação, com níveis de maturidade de 0 a 5 e evidência anexa. As recomendações passam a tarefas com responsável e prazo, e os riscos de interrupção ficam na matriz de risco com o histórico de cada revisão.</p>",
              "riscos", "Matriz de risco da AnkoraOne com riscos prioritários e estado de mitigação",
              "Gestão de risco."),
    ["resposta-incidentes", "prevencao-fuga-dados"],
    "Continuidade de negócio e recuperação",
)

# ---------------------------------------------------------------- Incidentes
pagina(
    "resposta-incidentes",
    "Resposta a incidentes e fugas de informação | DCAB Consulting",
    "Planos de resposta a incidentes, exercícios e apoio na contenção, investigação e notificação de fugas de informação ao abrigo do RGPD e da NIS2.",
    "Resposta a incidentes",
    "Resposta a incidentes e fugas de informação",
    "Quando ocorre um incidente de segurança, as decisões das primeiras horas pesam na dimensão dos danos e no cumprimento das obrigações legais. A DCAB Consulting ajuda as organizações a preparar a resposta e apoia a contenção, a investigação e as notificações quando o incidente acontece.",
    """
<div class="aviso-urgente">
  <h2>Está a ser atacado agora?</h2>
  <p>Escolha no formulário o assunto «Incidente: pedido de apoio urgente». Se a sua organização já é cliente, o pedido abre logo o processo do incidente: recebe por email a referência, a lista das provas a guardar e a pasta onde as entregar. Enquanto aguarda, não desligue nem reinstale os equipamentos afetados (se for preciso travar o ataque, desligue-os da rede), não apague mensagens nem registos e não pague resgates.</p>
  <p><a class="botao" href="/?assunto=incidente#contacto">Pedir apoio urgente</a></p>
</div>

<h2>As primeiras horas</h2>
<ol class="passos">
  <li><strong>Conter.</strong> Isolar os sistemas afetados, bloquear as contas comprometidas e travar a saída de informação.</li>
  <li><strong>Preservar as evidências.</strong> Guardar registos dos sistemas, mensagens e cópias dos equipamentos afetados antes de qualquer reposição.</li>
  <li><strong>Avaliar o âmbito.</strong> Que dados foram afetados, quantas pessoas estão envolvidas e se há obrigação de notificar.</li>
</ol>

<h2>Notificações obrigatórias</h2>
<div class="tabela-envolvente"><table class="tabela-conteudo">
  <thead><tr><th scope="col">Enquadramento</th><th scope="col">A quem</th><th scope="col">Quando</th></tr></thead>
  <tbody>
    <tr><td>RGPD, artigo 33.º</td><td>Comissão Nacional de Proteção de Dados (CNPD)</td><td>Sem demora injustificada e, sempre que possível, até 72 horas após o conhecimento da violação</td></tr>
    <tr><td>RGPD, artigo 34.º</td><td>Titulares dos dados</td><td>Sem demora injustificada, quando houver risco elevado para os seus direitos</td></tr>
    <tr><td>NIS2 e Decreto-Lei n.º 125/2025</td><td>Centro Nacional de Cibersegurança (CNCS) ou autoridade setorial competente</td><td>Notificação inicial até 24 horas após a verificação de um incidente significativo, comunicação do fim do impacto significativo e relatório final ou intercalar</td></tr>
    <tr><td>DORA (setor financeiro)</td><td>Autoridade de supervisão competente</td><td>Prazos próprios para incidentes graves relacionados com as tecnologias de informação e comunicação</td></tr>
  </tbody>
</table></div>
<p class="nota-legal">Informação de caráter geral. A obrigação de notificar e os prazos aplicáveis devem ser confirmados em cada caso.</p>

<h2>O plano de resposta</h2>
<p>O plano define quem decide, quem comunica e quem trata a parte técnica, com os contactos internos e externos atualizados. Inclui os critérios para classificar a gravidade de um incidente e os modelos de notificação para as autoridades e para os titulares dos dados, para que nenhuma destas decisões fique para o próprio dia.</p>

<h2>Como trabalhamos</h2>
<ul class="lista-conteudo">
  <li><strong>Preparação.</strong> Redação do plano de resposta, definição de papéis e lista de contactos.</li>
  <li><strong>Exercícios.</strong> Simulação de incidentes com a equipa de gestão e com as equipas técnicas.</li>
  <li><strong>Apoio no incidente.</strong> Contenção, preservação de evidências, investigação e preparação das notificações.</li>
  <li><strong>Análise posterior.</strong> Relatório com as causas, o impacto e as medidas para evitar a repetição.</li>
</ul>
<p>A resposta a incidentes liga-se à <a href="/solucoes/continuidade-negocio">continuidade de negócio</a>, que repõe os serviços, e à <a href="/solucoes/prevencao-fuga-dados">prevenção de fuga de dados</a>, que reduz a probabilidade de novos incidentes.</p>
""",
    [
        ("Quando é obrigatório notificar a CNPD?", "Quando a violação de dados pessoais for suscetível de resultar num risco para os direitos e liberdades das pessoas. Se esse risco for improvável, a notificação não é obrigatória, mas a violação deve ficar registada internamente com a respetiva fundamentação."),
        ("Uma tentativa de phishing sem consequências deve ser notificada?", "Normalmente não exige notificação às autoridades, mas deve ser registada e analisada. Várias tentativas dirigidas à organização podem indicar um ataque em preparação."),
        ("Quem decide se a organização notifica?", "A gestão da organização, enquanto responsável pelo tratamento ou entidade abrangida. O encarregado de proteção de dados e o responsável de cibersegurança aconselham com base na avaliação do incidente."),
    ],
    "Fale connosco sobre resposta a incidentes",
    "Se o incidente estiver a decorrer, escolha o assunto «Incidente: pedido de apoio urgente».",
    "preto",
    na_ankora("Cada notificação com data, hora e responsável",
              "<p>No módulo Gestão de incidentes, cada incidente segue as fases de notificação desde a verificação: notificação inicial, fim do impacto significativo e relatório final. As vulnerabilidades ficam no mesmo módulo, com a respetiva gravidade e estado.</p>",
              "incidentes", "Módulo Incidentes da AnkoraOne com a cronologia das notificações e as vulnerabilidades abertas",
              "Gestão de incidentes, disponível nos planos Pro e Enterprise."),
    ["continuidade-negocio", "nis2-decreto-lei-125-2025"],
    "Resposta a incidentes e fugas de informação",
)

# ---------------------------------------------------------------- NIS2
pagina(
    "nis2-decreto-lei-125-2025",
    "Adequação à NIS2 e ao DL 125/2025 | DCAB Consulting",
    "Qualificação da entidade, designação de responsáveis, medidas de cibersegurança e notificação de incidentes segundo a NIS2 e o Decreto-Lei n.º 125/2025.",
    "Adequação à NIS2",
    "Adequação à NIS2 e ao Decreto-Lei n.º 125/2025",
    "A Diretiva (UE) 2022/2555, conhecida como NIS2, foi transposta para o direito português pelo Decreto-Lei n.º 125/2025, que estabelece o regime jurídico da cibersegurança. As entidades abrangidas têm de se identificar junto do Centro Nacional de Cibersegurança (CNCS), aplicar medidas de gestão do risco e notificar os incidentes significativos.",
    """
<h2>Quem está abrangido</h2>
<p>A abrangência depende do setor de atividade, da dimensão e da função da entidade. O regime distingue entidades essenciais, entidades importantes e entidades públicas relevantes, com obrigações proporcionais à categoria e ao nível de conformidade atribuído. Saúde, energia, transportes, infraestruturas digitais, administração pública e indústria estão entre os setores incluídos.</p>
<div class="aviso"><p>Uma organização que não esteja abrangida pode ser chamada a cumprir requisitos semelhantes por um cliente que esteja. A segurança da cadeia de abastecimento é uma das medidas obrigatórias.</p></div>

<h2>Os passos da adequação</h2>
<ol class="passos">
  <li><strong>Confirmar o âmbito.</strong> Verificar o tipo de entidade, o setor e a dimensão (arts. 3.º, 6.º e 7.º). Na Administração Pública, os grupos A e B dependem, em regra, do número de trabalhadores; as entidades administrativas independentes e os serviços dos órgãos de soberania são do Grupo A, e as entidades públicas empresariais seguem os limiares de dimensão (art. 7.º). O Banco de Portugal, a CMVM e a ASF estão fora do âmbito (art. 3.º, n.º 3, al. f)).</li>
  <li><strong>Autoidentificação.</strong> Preencher o formulário da plataforma do CNCS (MyCiber). As entidades já em atividade tinham 60 dias após a disponibilização da plataforma, a 23 de junho de 2026; segundo o CNCS, o prazo conta-se em dias úteis e terminou em setembro de 2026. Quem ainda não se identificou deve fazê-lo de imediato: o incumprimento é contraordenação grave (art. 62.º, n.º 1, al. a)). As entidades que iniciem atividade têm 30 dias (art. 8.º, n.º 1). A submissão cria um registo provisório e um recibo (Regulamento n.º 756/2026, art. 8.º).</li>
  <li><strong>Audiência prévia.</strong> O CNCS notifica o projeto de qualificação, na plataforma e por email, e a entidade tem 10 dias úteis para se pronunciar. A decisão final indica a categoria, o nível de conformidade e as medidas obrigatórias (Regulamento n.º 756/2026, art. 9.º, n.os 2 e 5).</li>
  <li><strong>Registo.</strong> Manter atualizados o NIF, os contactos, os endereços de email, as gamas de endereços IP e o setor. As alterações são comunicadas em 30 dias úteis, ou em três meses no caso dos registos de domínios de topo e dos prestadores de serviços DNS, de nuvem, de centros de dados, de redes de distribuição de conteúdos e de serviços geridos, entre outros (art. 35.º).</li>
  <li><strong>Responsáveis.</strong> Nas entidades essenciais e importantes, designar o responsável de cibersegurança e o ponto de contacto permanente e comunicá-los na plataforma em 20 dias úteis (arts. 31.º e 32.º). Para quem já estava em atividade, o prazo conta a partir da notificação da qualificação (Regulamento n.º 756/2026, arts. 14.º e 15.º, n.º 2).</li>
  <li><strong>Órgãos de gestão.</strong> Aprovar e supervisionar as medidas e assegurar formação regular. Os titulares podem responder pessoalmente, por dolo ou culpa grave (art. 25.º, n.º 2).</li>
  <li><strong>Análise de risco.</strong> Analisar e documentar os riscos e os riscos residuais dos ativos, pelo menos uma vez por ano e sempre que o CNCS alerte para um risco emergente (arts. 26.º e 29.º; Regulamento n.º 756/2026, art. 31.º).</li>
  <li><strong>Ativos acessíveis pela Internet.</strong> Elaborar a lista, classificada como reservada, de todos os ativos diretamente acessíveis pela Internet, com versões, endereços IP, nomes de domínio e dependências. A primeira versão segue até 31 de janeiro do ano seguinte à notificação da qualificação ou seis meses depois dela, o que acontecer primeiro, e é atualizada todos os anos (Regulamento n.º 756/2026, art. 32.º).</li>
  <li><strong>Medidas de cibersegurança.</strong> Aplicar as medidas mínimas do nível atribuído (Anexo III do Regulamento) ou, nas entidades públicas relevantes, as do respetivo grupo (Anexo IV), nas nove áreas do artigo 27.º e na cadeia de abastecimento do artigo 28.º.</li>
  <li><strong>Incidentes.</strong> Preparar a notificação ao CNCS na plataforma e a comunicação aos destinatários dos serviços (arts. 40.º a 48.º; Regulamento n.º 756/2026, art. 20.º).</li>
  <li><strong>Relatório anual.</strong> Manter o relatório anual no modelo do CNCS e, nas entidades essenciais, submetê-lo até ao último dia útil de janeiro (art. 30.º; Regulamento n.º 756/2026, art. 13.º).</li>
</ol>
<p class="nota-legal">O diploma entrou em vigor 120 dias após a publicação, no início de abril de 2026 (decreto preambular, art. 11.º), e o Regulamento n.º 756/2026 do CNCS, publicado a 22 de junho de 2026, desde o dia seguinte. Os n.os 1 e 2 do artigo 27.º, os artigos 28.º a 30.º e 33.º e as contraordenações das alíneas b), c) e f) do n.º 1 do artigo 61.º produzem efeitos 24 meses após a publicação desta regulamentação (decreto preambular, art. 10.º, n.º 2), ou seja, a 22 de junho de 2028. As regras que dependem de instruções técnicas do CNCS só se aplicam quando estas forem publicadas. Durante os 12 meses seguintes à entrada em vigor (até abril de 2027), as entidades podem pedir, de forma fundamentada, a dispensa das coimas previstas no n.º 2 do artigo 61.º e no n.º 2 do artigo 62.º, por inexistência de um procedimento interno de adaptação (art. 65.º).</p>

<h2>As nove áreas de medidas do artigo 27.º</h2>
<div class="tabela-envolvente"><table class="tabela-conteudo">
  <thead><tr><th scope="col">Área (art. 27.º, n.º 1)</th><th scope="col">Solução relacionada</th></tr></thead>
  <tbody>
    <tr><td>a) Tratamento de incidentes</td><td><a href="/solucoes/resposta-incidentes">Resposta a incidentes</a></td></tr>
    <tr><td>b) Continuidade das atividades, cópias de segurança, recuperação de desastres e gestão de crises</td><td><a href="/solucoes/continuidade-negocio">Continuidade de negócio</a></td></tr>
    <tr><td>c) Segurança da cadeia de abastecimento</td><td>Gestão de fornecedores na AnkoraOne</td></tr>
    <tr><td>d) Segurança na aquisição, desenvolvimento e manutenção, incluindo o tratamento e a divulgação de vulnerabilidades</td><td>Gestão de vulnerabilidades na AnkoraOne</td></tr>
    <tr><td>e) Avaliação da eficácia das medidas</td><td>Avaliações de maturidade e relatórios na AnkoraOne</td></tr>
    <tr><td>f) Ciber-higiene e formação, incluindo os órgãos de gestão</td><td>Conhecimento e orientação na AnkoraOne</td></tr>
    <tr><td>g) Criptografia e cifragem</td><td><a href="/solucoes/classificacao-informacao">Classificação da informação</a></td></tr>
    <tr><td>h) Segurança dos recursos humanos, controlo de acessos e gestão de ativos</td><td><a href="/solucoes/prevencao-fuga-dados">Prevenção de fuga de dados</a> e <a href="/solucoes/classificacao-informacao">classificação</a></td></tr>
    <tr><td>i) Autenticação multifator, comunicações seguras e comunicações de emergência</td><td>Avaliação segundo o guia de MFA do CNCS</td></tr>
  </tbody>
</table></div>

<h2>Notificação de incidentes significativos</h2>
<p>A notificação segue quatro momentos: a notificação inicial, sem demora injustificada e até 24 horas depois de a entidade verificar que existe, ou pode vir a existir, um incidente significativo; uma atualização, quando necessária, até 72 horas depois da mesma verificação; a notificação do fim do impacto significativo, até 24 horas depois de o impacto terminar; e o relatório final, 30 dias úteis depois dessa notificação. Se o incidente for resolvido nas duas horas seguintes à deteção, basta a notificação de fim de impacto. Se ainda estiver em curso quando terminar o prazo do relatório final, seguem relatórios intercalares semanais (anexo do DL 125/2025, arts. 40.º a 44.º). As notificações vão para o CNCS, pela plataforma; nas comunicações eletrónicas e nos serviços postais, para a ANACOM; nos serviços de confiança, para o GNS. A notificação à CNPD, quando há dados pessoais, é autónoma.</p>

<h2>Níveis de conformidade e medidas mínimas</h2>
<p>As entidades essenciais e importantes recebem um de três níveis de conformidade: Básico, Substancial ou Elevado. O nível resulta da matriz de risco do setor, ponderada pela dimensão da entidade e pela importância do setor (Regulamento n.º 756/2026, art. 28.º e Anexo II). Os níveis são cumulativos: quem está no Substancial aplica também as medidas do Básico, e quem está no Elevado aplica as dos três (Regulamento n.º 756/2026, art. 30.º, n.os 2 e 3). Cada medida do Anexo III tem um critério de verificação, que diz que evidência a entidade tem de apresentar.</p>
<p>As entidades públicas relevantes seguem o Anexo IV, com medidas organizacionais, tecnológicas e humanas para o Grupo B. O Grupo A aplica também as do Grupo B.</p>

<h2>O Quadro Nacional de Referência para a Cibersegurança</h2>
<p>O QNRCS é o instrumento nacional de referência para normas e boas práticas de cibersegurança (art. 14.º). A 2.ª versão, aprovada no Anexo I do Regulamento n.º 756/2026, tem 107 controlos em 22 categorias e seis objetivos: gerir, identificar, proteger, detetar, responder e recuperar. Os controlos indicam correspondências com a ISO/IEC 27001 e 27002, o NIST SP 800-53, o NIST CSF 2.0, os CIS Controls v8.1 e o CyFun 2025. É revisto pelo menos de cinco em cinco anos.</p>
<p class="nota-legal">Informação de caráter geral, que não substitui a leitura dos diplomas nem aconselhamento jurídico.</p>
""",
    [
        ("Como sei se a minha organização está abrangida?", "A abrangência depende do setor, da dimensão e da função da entidade. O primeiro passo é confirmar o enquadramento e fazer a autoidentificação na plataforma do CNCS, que depois propõe a qualificação."),
        ("Qual é o nível de conformidade da minha organização?", "É o CNCS que o indica, na notificação final de qualificação, com as medidas obrigatórias. Depende da matriz de risco do setor, da dimensão e de o setor ser de importância crítica. Podemos fazer uma estimativa antes disso, para começar a preparar as medidas."),
        ("A certificação ISO/IEC 27001 é suficiente?", "Um certificado acreditado, com âmbito que abranja todos os sistemas de informação e redes dos serviços abrangidos, apresentado ao CNCS com a declaração de aplicabilidade (Regulamento n.º 756/2026, art. 27.º, n.º 5), pode dar a presunção de cumprimento das medidas de cibersegurança (Regulamento n.º 756/2026, art. 27.º). Não dispensa as obrigações próprias do regime, como o registo, a designação dos responsáveis, a lista de ativos e a notificação de incidentes."),
        ("Quem responde pelo cumprimento dentro da organização?", "Os órgãos de gestão aprovam as medidas de cibersegurança, supervisionam a sua aplicação e devem receber formação. O responsável de cibersegurança coordena o trabalho no dia a dia."),
    ],
    "Fale connosco sobre a NIS2",
    "Ajudamos a confirmar se a sua organização está abrangida e em que categoria.",
    "azul",
    na_ankora("O regime jurídico, passo a passo",
              "<p>O módulo Jornada de Conformidade, incluído em todos os planos, organiza os passos do Decreto-Lei n.º 125/2025 e da regulamentação do CNCS numa lista com estado, documentos de designação e autoridades competentes. As avaliações usam o catálogo de controlos da NIS2, do QNRCS, da ISO/IEC 27001, do NIST CSF 2.0 e dos CIS Controls, correlacionados entre si.</p>",
              "jornada-conformidade", "Jornada de Conformidade da AnkoraOne com dez passos do regime jurídico da cibersegurança e o respetivo estado",
              "Jornada de Conformidade."),
    ["resposta-incidentes", "continuidade-negocio"],
    "Adequação à NIS2 e ao Decreto-Lei n.º 125/2025",
)
