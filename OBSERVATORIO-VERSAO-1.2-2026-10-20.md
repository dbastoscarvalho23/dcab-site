# Observatório de Exposição Digital — versão 1.2 (20-10-2026)

Fase A do plano «Observatório · avaliação e plano de redesenho»: corrigir e medir antes de redesenhar. Publicada em conjunto com a versão 1.3 do site (guia `GUIA-PUBLICACAO-CONJUNTA-2026-10-20.md`).

| Campo | Valor |
|---|---|
| Versão | 1.2 |
| Estado | Pacote entregue; por publicar |
| Pacote | `observatorio-v1.2.zip` |
| Publicação | `bash publicar.sh` na pasta do Observatório |

## 1. O que muda

- **Nível de proteção.** Os dois índices passam a chamar-se «Proteção de terceiros» e «Proteção da própria organização», de 0 a 5, com uma nota: «quanto mais alto, melhor». A etiqueta de risco mantém-se ao lado. A escala não mudou; mudou o nome, que se lia ao contrário.
- **Prazo NIS2 com fonte.** A autoidentificação no MyCiber tinha 60 dias úteis a contar de 23-06-2026 (DL 125/2025, art. 8.º, n.º 1; declaração do coordenador do CNCS ao ECO, 24-06-2026). Contados com os feriados nacionais, terminaram a 15-09-2026.
- **Detetor lê PDF.**
  - Lê PDF com texto, usando o pdf.js 5.6 alojado em `/vendor`.
  - O leitor carrega quando a pessoa abre a janela de escolha do ficheiro, antes da análise. Por isso, a análise continua com zero pedidos de rede.
  - Avisa quando o PDF é uma digitalização (sem texto), quando está protegido por palavra-passe e quando os metadados identificam o autor.
  - Os formatos antigos do Office saíram da lista de ficheiros aceites.
  - A página mostra o SHA-256 dos dois ficheiros do pdf.js.
- **Resultado do detetor sem `innerHTML`.** Agora é construído como o resto da página.
- **Contadores do funil.**
  - Total diário por ação em `observatorio_contadores/AAAA-MM-DD`, sem IP, cookies, identificadores nem o domínio analisado.
  - A página envia: visita, exemplo, OSCAL, imprimir, pedido de plano, contacto, percursos e questionário NIS2.
  - O servidor conta: análises (novas, em cache, com erro), pedidos de ligação de fugas e consultas de fugas.
  - O detetor não envia nada.
  - Limite de 120 ações por hora por origem, com o mesmo HMAC de sal diário das análises (sem documento global, para não haver contenção).
  - Os pedidos de plano e de contacto contam-se só nas ligações marcadas (`data-evento`); as análises recusadas pelo limite contam à parte («analise-limite»).
- **Ferramentas.**
  - `ferramentas/testar-motor.js` corre o motor contra 20 domínios e compara com a execução anterior.
  - `ferramentas/funil.js` mostra os contadores dos últimos 28 dias no Cloud Shell.
- **Publicação.**
  - O `publicar.sh` usa `npm ci` quando existe `package-lock.json`.
  - Verifica também o pdf.js publicado e o `/api/evento`.

## 2. Fica para depois (decisão)

- **App Check:** obriga a carregar o reCAPTCHA da Google na página, que faz pedidos a terceiros e pode usar cookies. Isso contraria a promessa de privacidade do Observatório e precisa de decisão e de texto na política de privacidade. Alternativa sem terceiros a estudar na fase B: prova de trabalho no navegador.
- **Chave HIBP própria:** exige uma segunda subscrição paga do Have I Been Pwned. Decidir quando o volume de consultas o justificar.

## 3. Verificação feita

- Testes do motor e dos contadores: 21 de 21.
- Revisão independente: sem erros bloqueantes. Corrigidos: contadores gravados antes da resposta (o Cloud Run abranda o processador depois de responder), análises recusadas fora da contagem, texto sobre a verificação do pdf.js (é manual, não automática), `.mjs` sem cache longa e verificação do tipo de conteúdo, envio de recurso quando o `sendBeacon` falha, contagem por ligações marcadas, leitura do funil pelos dias mais recentes, PDF com páginas ilegíveis, `role="group"` no nível, redação («Proteção de terceiros», «janela de escolha do ficheiro»).
- Navegador com o resultado de exemplo:
  - nomes e nota da escala corretos;
  - um PDF de teste lido com 0 pedidos de rede, com credencial, IBAN e metadados detetados;
  - o exemplo do detetor com 0 pedidos;
  - enviados só os contadores visita, exemplo e nis2;
  - sem erros na consola.
- `testar-motor.js` executado aqui só para confirmar que corre (este ambiente não tem DNS). O teste real faz-se no Cloud Shell.

## 4. Base legal

- Contadores: não são dados pessoais (só totais diários por ação). Não guardam nem leem nada no equipamento de quem visita, por isso não precisam de consentimento (Lei n.º 41/2004, art. 5.º).
- Política de privacidade do site: linha nova na tabela do Observatório.
