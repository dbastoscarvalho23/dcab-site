# Versão 1.6: faturas em lote com leitura por IA — guia de implementação

Data: 22 de novembro de 2026

A versão 1.6 junta à área reservada o separador **Candidatura › Faturas em lote**. A equipa larga várias faturas de uma vez e cada uma é lida por IA. O sistema propõe os dados e a linha orçamental, assinala os documentos repetidos e não os considera. Nada entra nas despesas sem validação de uma pessoa.

## 1. O que muda

| Área | Alteração |
|---|---|
| Área reservada | Novo separador «Faturas em lote» (só `admin` e `editor`), em `public/reservado/lote.js`; estilos no fim de `reservado.css` |
| Funções | `lerFatura`, `decidirDespesa` e `indexarDespesa` em `functions/despesas-lote/` |
| Repetidos | Índice `projetos/{projeto}/indiceDespesas`. Entram nele as faturas do lote, as despesas criadas ou alteradas à mão (`indexarDespesa`) e as antigas (script de indexação) |
| Regras | `firestore.rules`: `despesasPropostas` e `indiceDespesas` só de leitura para a equipa da candidatura; novo `storage.rules` |
| Índice do Firestore | `firestore.indexes.json` (`tipo` + `resumo.fornecedorChave`) |
| CSP | `connect-src` da área reservada com `https://firebasestorage.googleapis.com` |
| Configuração | `public/reservado/config.js`: `storageBucket` |
| Publicação | `bash publicar.sh lote`: alojamento, regras, índices, Storage e funções |
| Textos | Política de privacidade (área reservada e serviços externos) e página de referências |

### Como são tratados os repetidos

| Situação | Estado | Efeito |
|---|---|---|
| O mesmo ficheiro, no mesmo lote ou antes | Repetida | Não é considerado; não pode ser incluído |
| Outro ficheiro do mesmo documento: fornecedor (NIF, número de IVA ou nome) + tipo + número, ou ATCUD | Repetida | Não é considerado; mostra o original; só o administrador o pode incluir, com motivo |
| Mesmo fornecedor e total, número diferente, até 7 dias de distância | Possível repetição | Só é validada se a pessoa confirmar que é outra despesa |

Os números são comparados sem separadores nem zeros à esquerda: «FT A/0001» é igual a «fta 1». As notas de crédito não colidem com a fatura do mesmo número, mas não entram em lote: registam-se no separador Despesas.

### Despesa criada

Tem exatamente os campos que as regras aceitam:
- **Valores:** em euros. Nas faturas estrangeiras, a taxa de câmbio é obrigatória e fica nas observações.
- **NIF:** só português. O número de IVA estrangeiro fica nas observações.
- **Estado:** «Lançada».
- **Comprovativo:** o ATCUD, quando existe, e o caminho do ficheiro no Storage.

## 2. Antes de publicar (Google Cloud)

1. **Acesso ao modelo.** O teste da Vertex AI devolveu 404 para todos os modelos, apesar de o catálogo de europe-west1 ter o `gemini-2.5-flash`. Para resolver:
   - abrir https://console.cloud.google.com/vertex-ai/studio/multimodal?project=dcab-consulting e enviar «ok» com o `gemini-2.5-flash`, aceitando os termos se aparecerem;
   - verificar a política da organização e a faturação:
     ```bash
     gcloud resource-manager org-policies describe vertexai.allowedModels --project dcab-consulting --effective
     gcloud billing projects describe dcab-consulting --format="value(billingEnabled,billingAccountName)"
     ```
   - repetir o teste até aparecer `"text"` na resposta:
     ```bash
     curl -s -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" "https://europe-west1-aiplatform.googleapis.com/v1/projects/dcab-consulting/locations/europe-west1/publishers/google/models/gemini-2.5-flash:generateContent" -d '{"contents":[{"role":"user","parts":[{"text":"ok"}]}]}' | head -8
     ```
2. **Permissão da conta das funções:**
   ```bash
   gcloud projects add-iam-policy-binding dcab-consulting --member="serviceAccount:921274534415-compute@developer.gserviceaccount.com" --role=roles/aiplatform.user --condition=None
   ```
3. **Storage.** Em https://console.firebase.google.com/project/dcab-consulting/storage, carregar em «Começar», com a localização **europe-west1**. Confirmar o nome do bucket:
   ```bash
   gcloud storage buckets list --format='value(name,location)'
   ```
   Se o nome não for `dcab-consulting.firebasestorage.app`, corrigir `storageBucket` em `public/reservado/config.js`.
4. **Outro modelo ou região** (só se o passo 1 o obrigar). Criar `functions/.env`, que não vai para o GitHub:
   ```
   LOTE_MODELO=gemini-2.5-flash
   LOTE_REGIAO_MODELO=europe-west1
   ```
   Só são aceites regiões da UE. Não usar o endpoint `global`: não garante o processamento na UE.

## 3. Publicar (Terminal do Mac, na pasta do site)

```bash
cd ~/Documents/site-dcabconsulting
git pull
bash publicar.sh lote
```

- Na primeira publicação, o Firebase pede autorização para o Storage ler o Firestore: aceitar.
- Se a publicação das funções falhar com erros do Eventarc, repetir passados 3 minutos.
- O índice demora alguns minutos a ficar «Ativado» (Consola Firebase › Firestore › Índices).
- Nas publicações seguintes basta `bash publicar.sh funcoes` ou `bash publicar.sh`.

## 4. Indexar as despesas já registadas (uma vez)

No Mac ou no Cloud Shell, dentro de `functions/` e com as bibliotecas instaladas (`npm install`):

```bash
gcloud auth application-default login      # só se der erro de credenciais
node ferramentas/indexar-despesas.mjs       # só mostra o resultado e as despesas já repetidas entre si
node ferramentas/indexar-despesas.mjs --gravar
```

## 5. Testes de aceitação

| # | Teste | Resultado esperado |
|---|---|---|
| 1 | Fatura nacional com código QR | «Por validar», campos e linha proposta coerentes |
| 2 | Fatura estrangeira em USD | Aviso de moeda; validar pede a taxa de câmbio; despesa em euros |
| 3 | Digitalização em papel | Avisos de pouca confiança ou «Ilegível» |
| 4 | O mesmo PDF duas vezes no mesmo lote | A cópia não é enviada |
| 5 | O mesmo PDF noutro dia | «Repetida (não considerada)» |
| 6 | A mesma fatura digitalizada de novo | «Repetida», com o original |
| 7 | Fatura já registada nas despesas | «Repetida», «já nas despesas» |
| 8 | Linha 4.1 ou 4.2 | Validar pede o mês de referência |
| 9 | Validar com correções | Despesa no separador Despesas, editável como as outras |
| 10 | Incluir uma repetida | O editor é recusado; o administrador só consegue com motivo; fica na auditoria |
| 11 | Apagar uma despesa do lote | A mesma fatura volta a poder entrar |
| 12 | Acesso `leitor` | Não vê o separador «Faturas em lote» |

Se algum teste falhar: `gcloud functions logs read lerFatura --region europe-west1 --limit 50`.

## 6. Base legal

- **Tratamento:** as faturas podem conter dados de fornecedores que são pessoas singulares.
  - Fundamento: interesse legítimo em justificar as despesas da candidatura (RGPD, art. 6.º, n.º 1, al. f)). A confirmar com o DPO.
  - Acrescentar a finalidade «leitura e classificação de documentos de despesa da candidatura» ao registo do art. 30.º.
- **Subcontratante:** a Google (Vertex AI), na região europe-west1. Nos termos específicos dos serviços da Google Cloud, a Google não usa os dados do cliente para treinar modelos sem autorização. Confirmar na consola antes do primeiro uso real.
- **Decisão humana:** a IA propõe e uma pessoa valida; não há decisões automatizadas (art. 22.º).
- **Conservação:** as faturas validadas ficam com a despesa, nos prazos do programa e no mínimo 10 anos (CIVA, art. 52.º, n.º 1). Os ficheiros das propostas rejeitadas são apagados na decisão.
- **IVA e câmbio:** o enquadramento do IVA nas faturas estrangeiras (autoliquidação) e a regra de câmbio do programa ficam por confirmar com o contabilista certificado.

## 7. Verificação feita

- **Testes das funções:** 61 de 61 (`cd functions && node --test`). Incluem:
  - o quadro do servidor igual ao de `modelo.js`;
  - a despesa criada só com os campos aceites pelas regras;
  - a conversão para euros;
  - as recusas (nota de crédito, linha inválida, câmbio em falta, mês de referência em falta).
- **Fluxo completo com Firestore e Storage simulados**, que confirmou:
  - acesso por email, papel e secção;
  - a despesa antiga reconhecida como repetida;
  - o mesmo ficheiro e o mesmo documento repetidos, e a possível repetição;
  - o câmbio obrigatório, a inclusão só pelo administrador e a rejeição a apagar o ficheiro;
  - o índice libertado quando a despesa é apagada.
- **Ecrã em Chrome sem interface,** com serviços simulados e os estilos da área reservada, sem erros de JavaScript.
- **Não testado:** chamada real à Vertex AI (bloqueada no projeto) e regras no emulador.
