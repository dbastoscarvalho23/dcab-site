# Site dcabconsulting.com: versão 1.5

Data: 6 de novembro de 2026
Estado: preparada, por publicar

## Decisões do utilizador
- Demonstração de prevenção de fuga de dados a seguir à AnkoraOne.
- Observatório com a mesma linguagem visual do site (opção A); motor sem alterações.
- Área reservada fora desta versão.
- Sem alterações no Mac desde 22-10-2026; base: pacote 1.4.1.
- Referências normativas nos atalhos e nas soluções; rasura uma vez depois do vídeo e ao passar o rato; nota explicativa na página de referências.

## Ficheiros novos
- public/assets/js/tema.js: tema claro e escuro (carregado no <head>, sem defer).
- public/assets/js/interacao.js: rasura, demonstração e escala.
- public/assets/fontes/ibm-plex-mono-latin-400-normal.woff e IBMPlexMono-OFL.txt.
- ferramentas/aplicar_v15.py: aplica a camada 1.5 às páginas geradas (idempotente).
- verificar-v1.5.sh e GUIA-IMPLEMENTACAO-V1.5.md.

## Ficheiros alterados
- public/assets/css/estilo.css: cores fixas das bandas (--preto, --branco), superfícies por token, tema escuro, marcação, referências, demonstração, escala, cabeçalho sem quebras entre 861 e 1100 px.
- Todas as páginas públicas: barra de classificação, botão do tema, marcação no rodapé, estilo.css?v=20261106.
- index.html, solucoes/prevencao-fuga-dados.html, solucoes/classificacao-informacao.html: demonstração e escala.
- privacidade.html: escolha do tema (Lei n.º 41/2004, art. 5.º, n.º 2); data 6-11-2026.
- referencias.html (via gerar_referencias.py): nota, ISO/IEC 27001 e ISO 22301, versões 1.5 e 1.4, registo de alterações.
- publicar.sh: verifica os ficheiros novos e o aspeto 1.5 em todas as páginas.

## Não alterado
principal.js (fora do pacote), área reservada, regras do Firestore, funções, Apps Script, segredos.

## Revisão de UX (UX Pilot, 06-11-2026)
- Aplicado: botão «Pedir contacto» da abertura em azul sólido (ação principal); marcação de classificação de 11 para 12 px no site e no Observatório.
- Não aplicado (falsos alarmes confirmados): contraste do cinzento #9FB0BA sobre preto (9,4:1), estados de foco e de cursor (existem no site), ícone do tema (existe no site).
- Mapa de atenção e percurso do olhar sem resultado útil do UX Pilot.

## Verificações feitas
- Capturas em 1280, 1100, 1024, 980, 900, 861, 800 e 390 px, nos dois temas: sem deslocamento horizontal.
- Contraste de todos os pares novos ≥ 4,5:1.
- Demonstração, escala e persistência do tema testadas, também com movimento reduzido.
- 404 com CSP script-src 'none': segue o tema do sistema sem JavaScript.
