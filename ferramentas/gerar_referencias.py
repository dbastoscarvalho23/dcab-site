"""Gera public/referencias.html: diplomas, normas e versões usados no site e no Observatório."""
import pathlib
from comum import cabeca, topo, rodape, SITE

RAIZ = pathlib.Path(__file__).resolve().parent.parent / "public"
URL = SITE + "/referencias"
REVISAO = "6 de novembro de 2026"
DESCRICAO = ("Diplomas, normas e versões usados no site da DCAB Consulting, no Observatório, no detetor de informação "
             "sensível e no simulador de classificação, com a situação e a data da última revisão.")

# (diploma, publicação, situação, onde é usado)
DIPLOMAS = [
    ("Decreto-Lei n.º 125/2025, de 4 de dezembro (regime jurídico da cibersegurança)", "Diário da República, 1.ª série, n.º 234, 04-12-2025",
     "Em vigor. Transpõe a Diretiva NIS2. Texto confirmado no Diário da República.",
     "Observatório (controlos e questionário NIS2), página NIS2, vigilância"),
    ("Regulamento n.º 756/2026 do CNCS", "Diário da República, 2.ª série, n.º 118, 22-06-2026",
     "Em vigor desde 23-06-2026. Anexo I (QNRCS, 2.ª versão), Anexo III (medidas por nível) e Anexo IV (entidades públicas). Texto confirmado.",
     "Observatório, página NIS2, simulador"),
    ("Quadro Nacional de Referência para a Cibersegurança, 2.ª versão", "Anexo I do Regulamento n.º 756/2026",
     "Em vigor. 6 objetivos, 22 categorias, 107 controlos. Substitui a versão de 2019.",
     "Observatório (correspondência de cada controlo)"),
    ("Diretiva (UE) 2022/2555 (NIS2)", "Jornal Oficial da UE, L 333, 27-12-2022",
     "Transposta pelo Decreto-Lei n.º 125/2025. Gestão e divulgação de vulnerabilidades como medida de segurança (art. 21.º, n.º 2, al. e)).", "Página NIS2; área reservada (alertas de vulnerabilidades)"),
    ("Diretiva (UE) 2022/2557 (resiliência das entidades críticas)", "Jornal Oficial da UE, L 333, 27-12-2022",
     "Referida no art. 6.º do Decreto-Lei n.º 125/2025.", "Questionário NIS2 do Observatório"),
    ("Lei n.º 109/2009, de 15 de setembro (Lei do Cibercrime)", "Diário da República, 1.ª série, n.º 179, 15-09-2009",
     "Em vigor, alterada pelo Decreto-Lei n.º 125/2025.", "Observatório (catálogo de controlos)"),
    ("Regulamento (UE) 2016/679 (RGPD)", "Jornal Oficial da UE, L 119, 04-05-2016",
     "Aplicável desde 25-05-2018.", "Política de privacidade, Observatório, detetor, simulador"),
    ("Lei n.º 58/2019, de 8 de agosto (execução do RGPD)", "Diário da República, 1.ª série, n.º 151, 08-08-2019",
     "Em vigor.", "Observatório (catálogo de controlos)"),
    ("Regulamento (UE) n.º 596/2014 (abuso de mercado)", "Jornal Oficial da UE, L 173, 12-06-2014",
     "Em vigor. Arts. 7.º, 10.º, 14.º e 18.º (informação privilegiada e lista de iniciados).", "Detetor e simulador"),
    ("Lei n.º 41/2004, de 18 de agosto (privacidade nas comunicações eletrónicas), art. 5.º", "Diário da República, I série-A, 18-08-2004",
     "Em vigor, com alterações. Armazenamento no navegador estritamente necessário dispensa consentimento (n.º 2).", "Política de privacidade (cookies e armazenamento local)"),
    ("Decisão de Execução (UE) 2023/1795 (Quadro de Privacidade de Dados UE-EUA)", "Jornal Oficial da UE, L 231, 20-09-2023",
     "Em vigor.", "Política de privacidade (transferências para a Google)"),
    ("Decisão 2011/61/UE (adequação de Israel)", "Jornal Oficial da UE, L 27, 01-02-2011",
     "Em vigor.", "Política de privacidade (Hudson Rock)"),
    ("Regulamento de Execução (UE) 2024/2690 da Comissão", "Jornal Oficial da UE, L, 18-10-2024",
     "Em vigor. Critérios de incidente significativo para prestadores de DNS, nuvem, centros de dados, serviços geridos e outros prestadores digitais (art. 3.º).", "Área reservada (avaliação de incidentes)"),
    ("Regulamento Delegado (UE) 2025/301 da Comissão (DORA)", "Jornal Oficial da UE, L, 20-02-2025",
     "Em vigor. Prazos das notificações de incidentes graves no setor financeiro (art. 5.º).", "Área reservada (incidentes de entidades financeiras)"),
    ("Código Penal, art. 115.º", "Decreto-Lei n.º 48/95, de 15 de março, versão consolidada",
     "Em vigor. Prazo de 6 meses para apresentar queixa nos crimes que dependem dela.", "Área reservada (queixa por cibercrime)"),
    ("Código das Sociedades Comerciais, art. 171.º", "Decreto-Lei n.º 262/86, de 2 de setembro, versão consolidada",
     "Em vigor. Firma, tipo, sede, conservatória, número de matrícula e de identificação e, nas sociedades por quotas, capital social, também nos sítios na Internet (n.os 1 e 2).", "Rodapé de todas as páginas"),
    ("Código do Trabalho (Lei n.º 7/2009, de 12 de fevereiro), art. 17.º", "Diário da República, 1.ª série, n.º 30, 12-02-2009",
     "Em vigor, com alterações.", "Simulador (dados de saúde de trabalhadores)"),
]

NORMAS = [
    ("ISO/IEC 27001:2022", "Anexo A, controlos 5.9, 5.10, 5.12, 5.13, 5.15, 5.17, 5.24 a 5.28, 5.30, 8.8, 8.12, 8.13 e 8.24, entre outros", "Observatório, simulador, página inicial e páginas de soluções"),
    ("ISO 22301:2019", "Sistemas de gestão da continuidade de negócio", "Página inicial e página de continuidade de negócio"),
    ("Taxonomia Comum da Rede Nacional de CSIRT", "Versão 3.3, dezembro de 2023", "Observatório (tipo de incidente de cada falha)"),
    ("OSCAL (NIST)", "Versão 1.2.0; esquemas JSON oficiais", "Exportação dos resultados do Observatório"),
    ("Have I Been Pwned, API", "Versão 3; dados sob licença CC BY 4.0", "Consulta de fugas e vigilância"),
    ("RFC 9116 (security.txt)", "Abril de 2022", "Observatório e security.txt dos dois sites"),
    ("Lista CVE (CVE Program), formato CVE JSON 5", "Registos públicos em github.com/CVEProject/cvelistV5, nos termos de utilização da CVE Program", "Alertas de vulnerabilidades (fabricante, produto e versões afetadas)"),
    ("NVD (NIST), API 2.0", "Este produto usa dados da API do NVD, mas não é aprovado nem certificado pelo NVD. Desde 15-04-2026 o NIST só analisa com prioridade o KEV e o software crítico", "Alertas de vulnerabilidades (CPE e CVSS)"),
    ("Catálogo KEV (CISA)", "Vulnerabilidades exploradas; licença CC0 1.0", "Alertas de vulnerabilidades (exploração)"),
    ("EPSS (FIRST)", "Pontuação diária de probabilidade de exploração em 30 dias; o FIRST pede atribuição", "Alertas de vulnerabilidades (prioridade)"),
    ("EUVD (ENISA)", "Base europeia de vulnerabilidades; termos de reutilização por confirmar", "Alertas de vulnerabilidades (exploração)"),
    ("CVSS (FIRST)", "Versões 3.1 e 4.0", "Alertas de vulnerabilidades (gravidade)"),
]

VERSOES = [
    ("Área reservada (faturas em lote)", "1.6", "22-11-2026", "Submissão de várias faturas de uma vez, leitura de cada documento por IA na União Europeia, proposta de linha orçamental, deteção de documentos repetidos e validação humana antes de registar a despesa"),
    ("Site dcabconsulting.com", "1.5", "06-11-2026", "Tema claro e escuro, marcação de classificação, referências normativas nas soluções, demonstração de prevenção de fuga de dados e escala de classificação"),
    ("Observatório de Exposição Digital (aspeto)", "1.4", "06-11-2026", "Tema claro e escuro e marcação de classificação, alinhados com o site; o motor de análise não muda"),
    ("Observatório de Exposição Digital (endereço)", "1.3", "22-10-2026", "Novo endereço: observatorio.dcabconsulting.com"),
    ("Observatório de Exposição Digital (funções)", "1.2", "20-10-2026", "Nível de proteção de 0 a 5 (5 é o melhor), prazo de autoidentificação NIS2 com fonte, contadores diários de utilização sem dados pessoais"),
    ("Detetor de informação sensível", "1.2", "20-10-2026", "Leitura de PDF com o pdf.js alojado no próprio site, sem pedidos de rede durante a análise; resultado construído sem HTML injetado"),
    ("Simulador de classificação", "1.0", "16-10-2026", "Dez casos fictícios"),
    ("Catálogo de controlos do Observatório", "1.1", "17-10-2026", "Impacto, esforço e responsável típico por verificação"),
    ("Área reservada", "1.4", "22-10-2026", "Alertas de vulnerabilidades por fabricante: catálogo de 16 fabricantes, lista de ativos com produto e versão, correspondência com a lista CVE, o NVD, o KEV, o EPSS e a EUVD, email imediato e resumo diário"),
    ("Área reservada (incidentes)", "1.3", "19-10-2026", "Incidentes abertos pelo formulário do site ou pelo CRM, pedidos por triar, provas entregues no Google Drive com SHA-256, avisos de prazos e lembretes por email, fichas de cliente"),
    ("Site dcabconsulting.com (privacidade)", "1.4.1", "22-10-2026", "Política de privacidade: alertas de vulnerabilidades; ligações para o novo endereço do Observatório"),
    ("Site dcabconsulting.com (formulário e rodapé)", "1.3", "19-10-2026", "Pedido de apoio urgente a incidentes no formulário; identificação legal completa no rodapé (CSC, art. 171.º); política de privacidade revista"),
]

ALTERACOES = [
    ("22-11-2026", "Versão 1.6", "Faturas em lote na área reservada: a equipa carrega várias faturas de uma vez, nacionais ou estrangeiras; cada documento é lido por um modelo de IA da Google Cloud na região europe-west1, que propõe os dados e a linha orçamental. Os documentos repetidos (o mesmo ficheiro, ou o mesmo fornecedor e número de uma despesa já registada) são assinalados e não são considerados. Nenhuma despesa é registada sem validação de uma pessoa."),
    ("06-11-2026", "Versão 1.5", "Novo aspeto no site e no Observatório: tema claro e escuro, que segue o sistema ou a escolha feita no botão do cabeçalho; marcação «Classificação: Público» no topo e no rodapé; referência normativa em cada solução; demonstração de prevenção de fuga de dados com dados fictícios, que corre só no navegador; escala de classificação com os quatro níveis. A escolha do tema fica guardada só no navegador. Política de privacidade: escolha do tema."),
    ("22-10-2026", "Versão 1.4.1", "O Observatório passa para observatorio.dcabconsulting.com. O endereço antigo (diagnostico.dcabconsulting.com) redireciona para o novo. Área reservada: corrigido o registo de incidentes pelo cliente e pela equipa com responsável e contactos, que as regras recusavam por excederem o limite de 1000 expressões avaliadas do Firestore."),
    ("22-10-2026", "Versão 1.4", "Alertas de vulnerabilidades por fabricante na área reservada: o cliente escolhe os fabricantes ou importa a lista de ativos (fabricante, produto, versão); de 15 em 15 minutos, as vulnerabilidades novas da lista CVE, do NVD, do KEV e da EUVD, e diariamente o EPSS, são cruzadas com essa lista. Email imediato para as exploradas e as críticas com probabilidade alta de exploração; resumo diário das altas e críticas. Nenhum dado de cliente é enviado às fontes. Política de privacidade: alertas de vulnerabilidades."),
    ("20-10-2026", "Observatório 1.2", "Índices passam a «nível de proteção» de 0 a 5 («Proteção de terceiros» e «Proteção da própria organização»), com 5 como o melhor valor. Prazo de autoidentificação no MyCiber com fonte: 60 dias úteis a contar de 23-06-2026, terminado a 15-09-2026. Detetor lê PDF com texto, no navegador. Contadores diários de utilização sem cookies nem identificadores. Política de privacidade: contadores."),
    ("19-10-2026", "Versão 1.3", "Pedido de apoio urgente a incidentes no formulário de contacto: abre o processo do cliente automaticamente, cria a pasta de entrega de provas no Google Drive e responde com a referência. Tarefa de 15 em 15 minutos com lembretes das provas, avisos dos prazos de notificação (12, 6 e 1 hora e atraso) e resumo diário por email, sem a descrição do incidente. Abertura de incidentes a partir do CRM. Área reservada: pedidos por triar, provas, ficheiros recebidos com SHA-256, fichas de cliente e configuração dos avisos. Rodapé com a identificação exigida pelo Código das Sociedades Comerciais (art. 171.º). Política de privacidade: pedidos de apoio, provas no Google Drive e avisos por email."),
    ("18-10-2026", "Versão 1.2", "Área reservada com página de início e acessos por secção; registo de incidentes dos clientes com os prazos do DL 125/2025 (anexo, arts. 40.º a 44.º), do RGPD (arts. 33.º e 34.º) e do DORA, e minutas para o cliente submeter. Página NIS2: notificação inicial conta da verificação de que existe ou pode vir a existir um incidente significativo, relatórios intercalares semanais, autoridades setoriais (ANACOM e GNS); retirada a classificação da contraordenação, por confirmar. Política de privacidade: apoio a incidentes."),
    ("17-10-2026", "Versão 1.1", "Verificação legal de todas as referências (DL 125/2025 e Regulamento n.º 756/2026 confirmados no texto publicado): prazo de autoidentificação atualizado, regime transitório e dispensa de coimas reescritos, operador do Have I Been Pwned corrigido, informação sobre a transferência para fora do EEE antes do consentimento, fundamento de cada tratamento, área reservada e armazenamento no navegador na política de privacidade. Observatório reorganizado em três percursos; correções prioritárias com impacto e esforço; aviso de fotografia pública no resultado, na impressão e no OSCAL; condições de utilização e pedido de exclusão; contagem de pedidos de rede e SHA-256 no detetor; serviços externos e registos técnicos na política de privacidade; alertas de operação; esta página."),
    ("16-10-2026", "Versão 1.0", "Simulador de classificação e detetor de informação sensível; revisão de segurança (motor do Observatório, limites, ligação de fugas, cache, security.txt); botão para parar a animação da abertura."),
]


def linhas(rows, rotulos):
    return "\n".join("        <tr>" + "".join(f'<td data-rotulo="{rotulos[i]}">{c}</td>' for i, c in enumerate(r)) + "</tr>" for r in rows)


JSONLD = {
    "@context": "https://schema.org",
    "@graph": [
        {"@type": "WebPage", "@id": URL + "#pagina", "url": URL, "name": "Referências e versão", "description": DESCRICAO,
         "inLanguage": "pt-PT", "dateModified": "2026-11-22",
         "publisher": {"@type": "Organization", "@id": SITE + "/#organizacao", "name": "DCAB Consulting", "url": SITE + "/"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Referências e versão", "item": URL}]},
    ],
}

html = cabeca("Referências e versão | DCAB Consulting", DESCRICAO, "/referencias",
              og_titulo="Referências e versão | DCAB Consulting", jsonld=JSONLD) + "\n" + topo() + f"""
  <main id="conteudo">
    <section class="pagina-cabeca">
      <div class="bloco__interior">
        <nav class="migalhas" aria-label="Localização"><a href="/">Início</a> <span aria-hidden="true">›</span> <span aria-current="page">Referências e versão</span></nav>
        <h1>Referências e versão</h1>
        <p class="pagina-cabeca__intro">Os diplomas, as normas e as versões em que se baseiam as páginas, o Observatório, o detetor e o simulador. Última revisão: {REVISAO}.</p>
      </div>
    </section>

    <article class="bloco__interior pagina-corpo pagina-corpo--largo">
      <div class="nota-referencias">
        <p>As referências que aparecem nas soluções (por exemplo, «ISO/IEC 27001 A.8.12» ou «NIS2 art. 23.º») indicam a norma ou o artigo a que cada serviço responde. Não significam que a DCAB Consulting ou os seus clientes estejam certificados por essas normas.</p>
      </div>

      <h2>Diplomas</h2>
      <div class="tabela-envolvente"><table class="tabela-conteudo">
        <thead><tr><th scope="col">Diploma</th><th scope="col">Publicação</th><th scope="col">Situação</th><th scope="col">Onde é usado</th></tr></thead>
        <tbody>
{linhas(DIPLOMAS, ["Diploma", "Publicação", "Situação", "Onde é usado"])}
        </tbody>
      </table></div>

      <h2>Normas e especificações</h2>
      <div class="tabela-envolvente"><table class="tabela-conteudo">
        <thead><tr><th scope="col">Norma</th><th scope="col">Versão</th><th scope="col">Onde é usada</th></tr></thead>
        <tbody>
{linhas(NORMAS, ["Norma", "Versão", "Onde é usada"])}
        </tbody>
      </table></div>

      <h2>Versões das ferramentas</h2>
      <div class="tabela-envolvente"><table class="tabela-conteudo">
        <thead><tr><th scope="col">Componente</th><th scope="col">Versão</th><th scope="col">Data</th><th scope="col">Inclui</th></tr></thead>
        <tbody>
{linhas(VERSOES, ["Componente", "Versão", "Data", "Inclui"])}
        </tbody>
      </table></div>

      <h2>Registo de alterações</h2>
      <dl class="alteracoes">
{chr(10).join(f'        <div><dt>{d} · {v}</dt><dd>{t}</dd></div>' for d, v, t in ALTERACOES)}
      </dl>

      <h2>Como revemos</h2>
      <p>Os textos do Decreto-Lei n.º 125/2025 e do Regulamento n.º 756/2026 foram confirmados no Diário da República. Revemos esta página sempre que o CNCS publica regulamentação ou orientações novas e, no mínimo, de seis em seis meses. A correspondência entre cada verificação e cada controlo é da responsabilidade da DCAB Consulting.</p>
      <p>Para comunicar uma referência desatualizada, use o <a href="/#contacto">formulário de contacto</a>.</p>
      <p class="nota-legal">Informação de caráter geral, que não substitui a leitura dos diplomas nem aconselhamento jurídico.</p>
    </article>
  </main>
""" + rodape()
(RAIZ / "referencias.html").write_text(html, encoding="utf-8")
print("gerada referencias")
