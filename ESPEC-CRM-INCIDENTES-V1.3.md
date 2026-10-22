# Abrir um incidente a partir do CRM · especificação para o CRM DCAB

**Data:** 19-10-2026 · **Lado do site:** versão 1.3 (publicada com `bash publicar.sh funcoes`) · **Lado do CRM:** por fazer na conversa do CRM

## 1. Para quê

Na ficha de uma entidade do CRM, um botão «Abrir incidente» cria o processo na área reservada do site (dcabconsulting.com/reservado), já associado ao cliente certo. A partir daí, tudo segue como num pedido feito pelo formulário: pasta no Google Drive, provas pedidas, avisos de prazos e resumo diário por email.

O CRM não guarda o incidente. Guarda só a referência devolvida (por exemplo `INC-2026-004`) numa atividade da entidade.

## 2. Pedido

`POST https://dcabconsulting.com/api/incidentes/abrir`

### Cabeçalhos

| Cabeçalho | Valor |
|---|---|
| `Content-Type` | `application/json; charset=utf-8` |
| `x-dcab-data` | Hora do envio em milissegundos desde 1970 (13 dígitos) |
| `x-dcab-id` | Identificador único do pedido, 16 a 64 carateres `[A-Za-z0-9-]` (um UUID serve) |
| `x-dcab-assinatura` | HMAC-SHA256, em hexadecimal minúsculo, de `data + "." + id + "." + corpo` |

- **Segredo:** o valor de `INCIDENTES_SEGREDO_CRM` do projeto `dcab-consulting`. No CRM, guardá-lo no Secret Manager do `dcab-crm`, por exemplo como `SITE_INCIDENTES_SEGREDO`. É diferente do segredo do Apps Script e do `CRM_LEADS_SEGREDO`.
- **Corpo:** a assinatura é calculada sobre os bytes UTF-8 exatamente como são enviados. Calcular a assinatura sobre a mesma cadeia que vai no corpo, sem voltar a serializar.
- **Janela e repetição:** o pedido é recusado fora de uma janela de 5 minutos. Cada `x-dcab-id` só é aceite uma vez (48 horas).

### Corpo (JSON)

| Campo | Obrigatório | Regra |
|---|---|---|
| `entidadeId` | Sim | Identificador do documento da entidade no CRM, 4 a 80 carateres `[A-Za-z0-9_-]` |
| `nome` | Sim | Denominação, até 150 carateres |
| `nipc` | Não | 9 dígitos; sem NIPC válido é ignorado |
| `titulo` | Não | Até 150 carateres; por omissão «Pedido de apoio: nome» |
| `descricao` | Não | Até 3000 carateres. Não incluir palavras-passe nem dados pessoais desnecessários |
| `contactos` | Não | Lista de emails (ou de objetos `{ "email": … }`), até 10. Recebem os avisos e o acesso à pasta «Entregas do cliente» |
| `solicitante` | Não | Email da pessoa da DCAB que abriu. Fica como responsável; sem ele, fica o responsável por omissão |
| `detetadoEm` | Não | ISO 8601 em UTC com milissegundos (`2026-10-19T08:00:00.000Z`); por omissão, a hora do pedido |

Exemplo:

```json
{"entidadeId":"Xk3P9aQ2","nome":"Câmara Municipal de Exemplo","nipc":"501234567",
 "titulo":"Ransomware no servidor de ficheiros","descricao":"Ficheiros cifrados na partilha da contabilidade.",
 "contactos":["informatica@cm-exemplo.pt"],"solicitante":"daniel.carvalho@dcabconsulting.com",
 "detetadoEm":"2026-10-19T07:40:00.000Z"}
```

## 3. Resposta

`200` com:

```json
{"ok":true,"cliente":"camara-municipal-de-exemplo","incidente":"INC-2026-004","referencia":"INC-2026-004","url":"https://dcabconsulting.com/reservado"}
```

| Código | Significado | O que o CRM faz |
|---|---|---|
| 400 | Falta o nome ou o `entidadeId`, ou JSON inválido | Mostrar a mensagem `erro` |
| 401 | Assinatura em falta, inválida ou fora da janela | Verificar o segredo e o relógio; não repetir com o mesmo id |
| 409 | `x-dcab-id` repetido | Não repetir: o incidente pode já ter sido aberto |
| 500 | Erro interno | Tentar uma vez com um id novo e avisar a equipa |

## 4. Como o site associa o cliente

1. Procura um cliente com `crmEntidadeId` igual a `entidadeId`.
2. Se não houver, procura pelo NIPC e grava o `crmEntidadeId` nesse cliente.
3. Se não houver, cria o cliente com um identificador derivado do nome (`camara-municipal-de-exemplo`), sem vigilância ligada.

O incidente fica no estado «Por triar», com origem «crm», e a cronologia regista quem o abriu.

## 5. No CRM

- **Função** `abrirIncidente` (chamável), só para `admin` e `comercial`, com TOTP e App Check como as restantes. Lê a entidade e os contactos no servidor; o navegador envia só o `entidadeId`, o título e a descrição.
- **Atividade** na entidade: «Incidente INC-2026-004 aberto na área reservada», com a ligação `url`. Sem descrição do incidente.
- **Auditoria:** uma linha por pedido (entidade, referência, quem).
- **Contactos enviados:** só os emails de contactos com relação ativa com a entidade.

## 6. Base legal

- A DCAB atua como subcontratante do cliente no apoio a incidentes (RGPD, art. 28.º). O envio de nome, NIPC e emails de contacto do CRM para a área reservada é uma transmissão entre sistemas da própria DCAB para executar o contrato com o cliente (art. 6.º, n.º 1, al. b)).
- No registo de atividades do CRM (art. 30.º), acrescentar a finalidade «abertura de processos de apoio a incidentes».
