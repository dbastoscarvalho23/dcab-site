"""Gera public/index.html (página principal)."""
import pathlib
from comum import cabeca, topo, rodape, captura, SITE, ANKORA

RAIZ = pathlib.Path(__file__).resolve().parent.parent / "public"
ORG = SITE + "/#organizacao"

DESCRICAO = ("Prevenção de fuga de dados (DLP), classificação da informação, continuidade de negócio "
             "e adequação à NIS2. Detentora da AnkoraOne, plataforma SaaS de GRC.")


def servico(nome, caminho):
    return {"@type": "Offer", "itemOffered": {"@type": "Service", "name": nome, "url": SITE + caminho,
                                              "provider": {"@id": ORG}}}


JSONLD = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": ORG,
            "name": "DCAB Consulting",
            "legalName": "DCAB Consulting Unipessoal, Lda.",
            "taxID": "518180964",
            "url": SITE + "/",
            "logo": SITE + "/assets/img/logo-dcab.png",
            "image": SITE + "/assets/img/og-dcab.jpg",
            "description": DESCRICAO,
            "address": {"@type": "PostalAddress", "streetAddress": "Urbanização do Torrão, n.º 66",
                        "postalCode": "4825-458", "addressLocality": "Água Longa",
                        "addressRegion": "Santo Tirso", "addressCountry": "PT"},
            "areaServed": {"@type": "Country", "name": "Portugal"},
            "knowsAbout": [
                "Prevenção de fuga de dados (DLP)", "Classificação da informação", "Continuidade de negócio",
                "Resposta a incidentes", "Diretiva NIS2", "Decreto-Lei n.º 125/2025",
                "Quadro Nacional de Referência para a Cibersegurança (QNRCS)", "ISO/IEC 27001", "ISO 22301",
                "RGPD", "Governação, risco e conformidade (GRC)"],
            "makesOffer": [
                servico("Prevenção de fuga de dados (DLP)", "/solucoes/prevencao-fuga-dados"),
                servico("Classificação e rotulagem da informação", "/solucoes/classificacao-informacao"),
                servico("Continuidade de negócio e recuperação", "/solucoes/continuidade-negocio"),
                servico("Resposta a incidentes e fugas de informação", "/solucoes/resposta-incidentes"),
                servico("Adequação à NIS2 e ao Decreto-Lei n.º 125/2025", "/solucoes/nis2-decreto-lei-125-2025"),
            ],
            "brand": {"@type": "Brand", "name": "AnkoraOne", "url": ANKORA,
                      "description": "Plataforma SaaS de governação, risco e conformidade (GRC).",
                      "sameAs": ["https://www.linkedin.com/company/ankoraone/"]},
        },
        {"@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "DCAB Consulting",
         "inLanguage": "pt-PT", "publisher": {"@id": ORG}},
    ],
}

CORPO = f"""
  <main id="conteudo">

    <!-- Abertura -->
    <section class="abertura abertura--titulo" aria-labelledby="abertura-titulo">
      <div class="abertura__media" aria-hidden="true">
        <video class="abertura__video abertura__video--ciclo" muted playsinline loop preload="none" disablepictureinpicture disableremoteplayback tabindex="-1">
          <source src="/assets/video/dcab-ciclo.webm" type="video/webm">
          <source src="/assets/video/dcab-ciclo.mp4" type="video/mp4">
        </video>
        <video class="abertura__video abertura__video--entrada" autoplay muted playsinline preload="auto" poster="/assets/img/dcab-intro-inicio.jpg" disablepictureinpicture disableremoteplayback tabindex="-1">
          <source src="/assets/video/dcab-intro.webm" type="video/webm">
          <source src="/assets/video/dcab-intro.mp4" type="video/mp4">
        </video>
        <img class="abertura__final" src="/assets/img/dcab-intro-final.jpg" alt="" width="1280" height="720" loading="lazy">
      </div>
      <div class="abertura__texto">
        <h1 id="abertura-titulo">Protegemos a informação que a sua organização <span class="realce">não pode perder.</span></h1>
        <a class="botao botao--linha-clara botao--discreto" href="#contacto">Pedir contacto</a>
      </div>
    </section>

    <!-- Atalhos -->
    <nav class="atalhos" aria-label="Áreas de atuação">
      <div class="atalhos__interior">
        <a class="atalho--ankora" href="#ankoraone"><strong>AnkoraOne</strong><span>A plataforma de governação, risco e conformidade da DCAB</span></a>
        <a href="/solucoes/prevencao-fuga-dados"><strong>Prevenção de fuga de dados</strong><span>Controlo da informação que sai da organização</span></a>
        <a href="/solucoes/classificacao-informacao"><strong>Classificação da informação</strong><span>Etiquetas que acompanham cada documento</span></a>
        <a href="/solucoes/continuidade-negocio"><strong>Continuidade de negócio</strong><span>Recuperação depois de um incidente</span></a>
        <a href="/solucoes/nis2-decreto-lei-125-2025"><strong>NIS2 e DL 125/2025</strong><span>Passos para cumprir o regime jurídico da cibersegurança</span></a>
      </div>
    </nav>

    <!-- AnkoraOne: branco sobre preto -->
    <section class="ankora" id="ankoraone" aria-labelledby="ankora-titulo">
      <div class="bloco__interior ankora__interior">
        <div class="ankora__topo">
          <div>
            <div class="ankora__marca">
              <p class="ankora__nome">AnkoraOne</p>
              <small>desenvolvida pela DCAB Consulting</small>
            </div>
            <h2 id="ankora-titulo">A plataforma que usamos para gerir a conformidade dos nossos clientes</h2>
          </div>
          <div class="ankora__resumo">
            <p>A AnkoraOne reúne na mesma aplicação as avaliações de maturidade, os riscos, os fornecedores, os incidentes e a evidência de auditoria. Nos projetos de conformidade, é nela que registamos as avaliações, os planos de ação e as evidências, e a equipa do cliente continua a usá-la no dia a dia.</p>
            <p>Funciona no navegador. Cada organização tem os dados isolados e cada ação fica registada com autor, data e hora.</p>
            <div class="ankora__acoes">
              <a class="botao botao--claro" href="{ANKORA}/#plataforma" target="_blank" rel="noopener">Experimentar a demonstração</a>
              <a class="botao botao--linha-clara" href="#contacto" data-assunto="Demonstração da AnkoraOne">Pedir demonstração</a>
            </div>
          </div>
        </div>

        <figure class="ecra">
          <div class="ecra__moldura">{captura("painel", "Painel da AnkoraOne com a maturidade global, a Jornada de Conformidade, os riscos abertos, a maturidade por norma e recomendações da IA")}</div>
          <figcaption>Painel executivo da AnkoraOne. Dados de demonstração.</figcaption>
        </figure>

        <div class="ecras">
          <figure>
            {captura("jornada-conformidade", "Jornada de Conformidade da AnkoraOne com os passos do regime jurídico da cibersegurança", "(max-width: 600px) 100vw, 380px")}
            <figcaption><strong>Jornada de Conformidade</strong>Os passos do DL 125/2025, da autoidentificação às medidas do nível atribuído.</figcaption>
          </figure>
          <figure>
            {captura("riscos", "Matriz de risco da AnkoraOne com probabilidade, impacto e riscos prioritários", "(max-width: 600px) 100vw, 380px")}
            <figcaption><strong>Gestão de risco</strong>Matriz de probabilidade e impacto, histórico e tarefas de mitigação.</figcaption>
          </figure>
          <figure>
            {captura("relatorios-auditoria", "Relatórios e auditoria da AnkoraOne com trilho de registos encadeado e pacote de auditoria", "(max-width: 600px) 100vw, 380px")}
            <figcaption><strong>Relatórios e auditoria</strong>Pacotes de auditoria assentes num trilho de registos verificável.</figcaption>
          </figure>
        </div>

        <div class="ankora__detalhe">
          <div>
            <h3>Nove módulos</h3>
            <ul class="modulos">
              <li>Jornada de Conformidade (NIS2 e RJC) <span>Todos os planos</span></li>
              <li>Avaliações e plano de ação <span>Todos os planos</span></li>
              <li>Documentos e evidências <span>Todos os planos</span></li>
              <li>Conhecimento e orientação <span>Todos os planos</span></li>
              <li>Gestão de risco <span>Todos os planos</span></li>
              <li>Relatórios e preparação de auditoria <span>Todos os planos</span></li>
              <li>Gestão de incidentes <span>Pro e Enterprise</span></li>
              <li>Gestão de fornecedores <span>Pro e Enterprise</span></li>
              <li>Privacidade <span>Enterprise</span></li>
            </ul>
          </div>
          <div>
            <h3>Normas correlacionadas</h3>
            <ul class="normas" aria-label="Normas suportadas pela AnkoraOne">
              <li class="normas--pt">NIS2 / DL 125/2025</li>
              <li class="normas--pt">QNRCS</li>
              <li class="normas--pt">RGPD / Lei 58/2019</li>
              <li>ISO/IEC 27001:2022</li>
              <li>NIST CSF 2.0</li>
              <li>CIS Controls v8.1</li>
              <li>ENISA · NIS2 art. 21.º</li>
            </ul>
            <p class="ankora__planos">Um controlo implementado para uma norma é reconhecido nas restantes, e a mesma evidência serve todas. Planos Standard, Pro e Enterprise, com valores sob cotação. <a href="{ANKORA}/#planos" target="_blank" rel="noopener">Ver os planos em ankoraone.com</a></p>
          </div>
        </div>
      </div>
    </section>

    <!-- Soluções: preto e azul sobre branco -->
    <section class="bloco" id="solucoes" aria-labelledby="solucoes-titulo">
      <div class="bloco__interior">
        <div class="solucoes__cabeca">
          <div>
            <h2 id="solucoes-titulo">Soluções de segurança da informação</h2>
            <p class="bloco__intro">Desenhamos e implementamos os controlos técnicos que protegem a informação no dia a dia da organização, do posto de trabalho à cloud.</p>
          </div>
          <img src="/assets/img/logo-dcab-azul.png" alt="" width="72" height="102" loading="lazy">
        </div>

        <article class="dominio">
          <div class="dominio__cabeca">
            <h3>Proteção da informação</h3>
            <p>Identificar a informação sensível e impedir que saia da organização sem autorização.</p>
            <ul class="saber-mais">
              <li><a href="/solucoes/prevencao-fuga-dados">Prevenção de fuga de dados (DLP)</a></li>
              <li><a href="/solucoes/classificacao-informacao">Classificação e rotulagem da informação</a></li>
            </ul>
          </div>
          <dl class="componentes">
            <div class="componentes__destaque">
              <dt>Prevenção de fuga de dados (DLP)</dt>
              <dd>Políticas que detetam e bloqueiam o envio de informação sensível por email, pela web, em aplicações cloud ou para dispositivos externos.</dd>
            </div>
            <div>
              <dt>Descoberta de dados sensíveis</dt>
              <dd>Levantamento da informação crítica guardada em servidores, repositórios de documentos e serviços cloud.</dd>
            </div>
            <div>
              <dt>Classificação e rotulagem</dt>
              <dd>Esquemas de classificação definidos para cada organização. A etiqueta é aplicada automaticamente ou pelo utilizador e acompanha o documento.</dd>
            </div>
            <div>
              <dt>Proteção da informação interna</dt>
              <dd>Controlo de acessos, cifragem e gestão de direitos sobre documentos, incluindo quando são partilhados com o exterior.</dd>
            </div>
            <div>
              <dt>Informação e inteligência artificial</dt>
              <dd>Regras sobre a informação que pode ser usada em ferramentas de IA generativa e controlo do que lhes é enviado.</dd>
            </div>
          </dl>
        </article>

        <article class="dominio">
          <div class="dominio__cabeca">
            <h3>Continuidade e conformidade</h3>
            <p>Manter os serviços críticos disponíveis depois de um incidente e cumprir as obrigações legais.</p>
            <ul class="saber-mais">
              <li><a href="/solucoes/continuidade-negocio">Continuidade de negócio e recuperação</a></li>
              <li><a href="/solucoes/resposta-incidentes">Resposta a incidentes</a></li>
              <li><a href="/solucoes/nis2-decreto-lei-125-2025">Adequação à NIS2 e ao DL 125/2025</a></li>
            </ul>
          </div>
          <dl class="componentes">
            <div>
              <dt>Planos de continuidade e recuperação</dt>
              <dd>Análise de impacto no negócio e planos de continuidade e recuperação segundo a ISO 22301, com tempos de recuperação definidos.</dd>
            </div>
            <div>
              <dt>Cópias de segurança protegidas</dt>
              <dd>Cópias de segurança isoladas e imutáveis, preparadas para resistir a ataques de ransomware.</dd>
            </div>
            <div>
              <dt>Resposta a incidentes</dt>
              <dd>Contenção e investigação de incidentes e fugas de informação, e notificação às autoridades quando é obrigatória.</dd>
            </div>
            <div>
              <dt>Adequação à NIS2</dt>
              <dd>Qualificação da entidade, designação de responsáveis e aplicação das medidas do nível atribuído, registadas na AnkoraOne.</dd>
            </div>
          </dl>
        </article>
      </div>

      <div class="bloco__interior ferramentas">
        <h3 id="ferramentas-titulo">Ferramentas gratuitas</h3>
        <div class="relacionadas">
          <a class="relacionada" href="https://observatorio.dcabconsulting.com"><strong>Diagnóstico do domínio</strong><span>O email, o DNS e o site avaliados só com informação pública, com referência ao DL 125/2025.</span></a>
          <a class="relacionada" href="https://observatorio.dcabconsulting.com/#detetor"><strong>Detetor de informação sensível</strong><span>Mostra os dados pessoais, credenciais e outra informação sensível de um documento. Corre no navegador.</span></a>
          <a class="relacionada" href="/solucoes/simulador-classificacao"><strong>Simulador de classificação</strong><span>Dez casos fictícios para treinar a escolha entre Público, Interno, Confidencial e Restrito.</span></a>
        </div>
      </div>
    </section>

    <!-- Quem somos: branco sobre azul -->
    <section class="bloco" id="quem-somos" aria-labelledby="quem-somos-titulo">
      <div class="bloco__interior quem-somos">
        <div class="quem-somos__texto">
          <h2 id="quem-somos-titulo">Quem somos</h2>
          <p>A DCAB Consulting é uma empresa portuguesa de segurança da informação. Implementa soluções de prevenção de fuga de dados (DLP), classificação da informação e continuidade de negócio, e desenvolveu a AnkoraOne, uma plataforma SaaS de governação, risco e conformidade (GRC).</p>
          <p>Trabalhamos com as equipas de informática e de segurança de cada cliente, desde o levantamento da informação sensível até à implementação e aos testes de recuperação. Nos projetos que exigem infraestrutura ou serviços geridos, contamos com a Neora Consulting.</p>
        </div>
        <dl class="quem-somos__factos">
          <div><dt>Áreas</dt><dd>Prevenção de fuga de dados, classificação da informação, continuidade de negócio, NIS2</dd></div>
          <div><dt>Plataforma</dt><dd><a href="{ANKORA}" target="_blank" rel="noopener">AnkoraOne</a>, governação, risco e conformidade em SaaS</dd></div>
          <div><dt>Parceiro</dt><dd><a href="https://neora.pt" target="_blank" rel="noopener">Neora Consulting</a></dd></div>
          <div><dt>Sede</dt><dd>Água Longa, Santo Tirso</dd></div>
        </dl>
      </div>
    </section>

    <!-- Parceria -->
    <section class="bloco" id="parceria" aria-labelledby="parceria-titulo">
      <div class="bloco__interior parceria">
        <h2 id="parceria-titulo">Parceria com a Neora Consulting</h2>
        <div class="parceria__texto">
          <p>A DCAB Consulting trabalha em parceria com a Neora Consulting, empresa de consultoria tecnológica com mais de 20 anos de experiência no mercado nacional.</p>
          <p>Nos projetos conjuntos, a Neora contribui com a experiência em infraestrutura, cibersegurança e serviços geridos.</p>
          <p><a class="botao botao--linha" href="https://neora.pt" target="_blank" rel="noopener">Visitar neora.pt</a></p>
        </div>
      </div>
    </section>
"""

FORM = (RAIZ / "index.html").read_text(encoding="utf-8")
ini = FORM.index("    <!-- Contacto -->")
fim = FORM.index("  </main>")
CONTACTO = FORM[ini:fim]
if "Exclusão de domínio do Observatório" not in CONTACTO:
    CONTACTO = CONTACTO.replace("              <option>Outro</option>",
        "              <option>Diagnóstico completo e plano de correção</option>\n"
        "              <option>Exclusão de domínio do Observatório</option>\n"
        "              <option>Outro</option>", 1)
if "Incidente: pedido de apoio urgente" not in CONTACTO:
    CONTACTO = CONTACTO.replace("              <option>Outro</option>",
        "              <option>Incidente: pedido de apoio urgente</option>\n"
        "              <option>Outro</option>", 1)
CONTACTO = CONTACTO.replace(
    "<p>Indique o que precisa. A equipa da DCAB Consulting responde por email, em regra no prazo de dois dias úteis.</p>",
    "<p>Descreva o pedido em poucas linhas. A equipa da DCAB Consulting responde por email, em regra no prazo de dois dias úteis.</p>")

html = (cabeca("DLP, continuidade de negócio e NIS2 | DCAB Consulting", DESCRICAO, "/",
               og_titulo="DCAB Consulting | Proteção da informação e AnkoraOne", jsonld=JSONLD,
               extra_js='\n  <script src="/assets/js/abertura.js" defer></script>\n  <script src="/assets/js/assunto.js" defer></script>')
        + "\n" + topo(inicio=True) + CORPO + "\n" + CONTACTO + "  </main>\n" + rodape())
(RAIZ / "index.html").write_text(html, encoding="utf-8")
print("index.html gerado:", len(html), "bytes")
