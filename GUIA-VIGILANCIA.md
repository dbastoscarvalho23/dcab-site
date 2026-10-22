# Vigilância de exposição na área reservada

Módulo «Vigilância» da área reservada: computadores de trabalhadores infetados por malware que rouba credenciais, clientes do serviço com credenciais roubadas, publicações de grupos de ransomware e fugas de dados com endereços do domínio, por cliente.

## Fontes

| Fonte | O que dá | Chave | Custo para começar |
|---|---|---|---|
| Hudson Rock (ferramentas OSINT gratuitas) | Totais de computadores infetados por infostealers com credenciais do domínio: trabalhadores, clientes do serviço e terceiros, com a data da última infeção. Um alerta quando um total sobe | Nenhuma | Gratuito; sem termos publicados para estas ferramentas: pedir confirmação escrita de uso comercial antes do primeiro cliente |
| ransomware.live (API v2) | Vítimas publicadas em sites de fugas de grupos de ransomware, procuradas pelo domínio e pelo nome do cliente | Nenhuma | Gratuito |
| Have I Been Pwned (API v3) | Fugas de dados com endereços do domínio verificado | `HIBP_API_KEY`, a mesma do Observatório | Plano Core, já contratado |

Ficam de fora, por agora: anúncios de venda em mercados, menções em fóruns e Telegram. Para esses é preciso um fornecedor pago (por exemplo SOCRadar, a partir de cerca de 600 USD por mês por domínio, ou a Flare). O código está organizado por fonte, por isso acrescentar um fornecedor mais tarde não muda o resto.

## 1. Hudson Rock (sem chave)

As ferramentas OSINT da Hudson Rock são públicas e não pedem chave. Teste no Mac:
```bash
curl -s "https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-domain?domain=dcabconsulting.com" | head -c 400
```
A resposta traz `total`, `employees`, `users`, `third_parties` e as datas da última infeção. Zeros são normais.

Antes do primeiro cliente, peça por escrito à Hudson Rock (partnerships) confirmação de que pode usar estes dados num serviço pago, com atribuição «Dados: Hudson Rock». Se a resposta for negativa, a alternativa é o plano pago Cavalier.

## 2. Segredos e publicação

```bash
cd ~/Documents/site-dcabconsulting
bash publicar.sh funcoes
```
- O único segredo é `HIBP_API_KEY`, o mesmo do Observatório. Se ainda não existir: `firebase functions:secrets:set HIBP_API_KEY`. O valor `-` desliga o HIBP na vigilância.
- Se antes tinha criado `HUDSONROCK_API_KEY`, pode apagá-lo: `firebase functions:secrets:destroy HUDSONROCK_API_KEY`.

O script corre os testes, verifica o segredo e publica as funções, as regras do Firestore e o site. Ficam ativas `recolherAlertas` (de 6 em 6 horas) e `recolherAgora` (botão «Recolher agora», só administradores).

## 3. Prazo de conservação (TTL)

Consola Firebase › Firestore › TTL › Criar política, três vezes, sempre com o campo `expira`: grupos de coleções `alertas`, `alertas_fonte` e `historico`. Cada alerta e o seu histórico são apagados cerca de 36 meses depois.

## 4. Ativar um cliente

São dois documentos. O primeiro é visível para o cliente; o segundo só para a equipa da DCAB.

**a) Consola Firebase › Firestore › coleção `clientes` › Adicionar documento**

| Campo | Tipo | Exemplo |
|---|---|---|
| ID do documento | — | `camara-exemplo` (minúsculas, números e hífenes) |
| `nome` | string | Câmara Municipal de Exemplo |
| `ativo` | boolean | true |

**b) Dentro desse documento › Iniciar coleção `interno` › documento com o ID `config`**

| Campo | Tipo | Exemplo |
|---|---|---|
| `dominios` | array de strings | `cm-exemplo.pt`, `exemplo.gov.pt` (até 10) |
| `nomes` | array de strings | `Câmara Municipal de Exemplo` (para o ransomware.live; nomes com pelo menos 5 caracteres, comparados por igualdade) |
| `hibp` | boolean | true (só depois de o domínio estar verificado no painel da HIBP) |

Para o HIBP, verifique antes cada domínio no painel da HIBP com a conta da DCAB (registo TXT publicado pelo cliente).

Depois, no separador Vigilância, escolha o cliente e clique em «Recolher agora». A primeira recolha cria a situação inicial dos infostealers (totais atuais), todas as publicações de ransomware encontradas e todas as fugas do HIBP; a DCAB trata essa primeira leva antes de dar acesso ao cliente.

Não altere `hudson` nem `hibpUltimaFuga` à mão: guardam a última situação conhecida, para só alertar quando muda. O HIBP só é consultado quando a HIBP acrescenta uma fuga nova, como os termos da API pedem.

## 5. Dar acesso ao cliente

Separador Acessos › Convidar: papel **Cliente (só a vigilância do seu cliente)** e, em «Clientes», o identificador do documento (por exemplo `camara-exemplo`). A pessoa entra com email, palavra-passe e segundo fator e só vê o separador Vigilância desse cliente.

## 6. O que fica guardado

| Guardado | Nunca guardado |
|---|---|
| Categoria, gravidade, fonte, datas | Palavras-passe (mesmo quando a fonte as devolve) |
| Infostealers: totais e data da última infeção | Cookies, endereços IP, nomes de equipamentos (a fonte gratuita não os dá) |
| Clientes do serviço: só o total por mês | Dados de clientes do serviço |
| Grupo de ransomware, site e descrição limpa | Amostras ou ficheiros publicados pelo grupo |
| Fuga do HIBP: nome, data, tipos de dados, endereços mascarados | Endereços completos |
| Estado, responsável, notas, avaliação da notificação | — |

## 7. Rotina de tratamento

1. Diariamente, ver os alertas novos «Críticos e altos» e «Por avaliar para notificação».
2. Ransomware e computador infetado entram como «Por avaliar». Se configurarem um incidente com impacto significativo, a notificação inicial ao CNCS é até 24 horas (DL 125/2025, art. 42.º) e, havendo dados pessoais, à CNPD até 72 horas (RGPD, art. 33.º).
3. Computador infetado: a equipa de TI do cliente identifica o equipamento (antivírus, EDR, inventário, data); isolar, reinstalar e mudar palavras-passe e sessões do domínio a partir de outro equipamento.
4. Fuga do HIBP: mudar palavras-passe das contas indicadas e confirmar MFA.
5. Falso positivo: fechar com nota a explicar porquê.
6. Os alertas do ano entram na análise de risco anual (Reg. 756/2026, art. 31.º).

## 8. Antes do primeiro cliente

- Contrato de subcontratação com o cliente (RGPD, art. 28.º), que identifique a Hudson Rock, o ransomware.live e o HIBP como fontes.
- Avaliação de impacto sobre a proteção de dados (RGPD, art. 35.º).
- Informar os trabalhadores do cliente de que os endereços profissionais são vigiados em fontes externas.
- Nunca contactar grupos de ransomware nem descarregar ficheiros publicados.

## Ficheiros

- `functions/fontes.js` — clientes da Hudson Rock (OSINT), do ransomware.live e do HIBP
- `functions/vigilancia.js` — conversão em alertas, limpeza e mascaramento
- `functions/index.js` — `recolherAlertas` (agendada) e `recolherAgora`
- `functions/test/vigilancia.test.js` — testes (`cd functions && node --test`)
- `firestore.rules` — `clientes`, `interno` e `alertas_fonte` (só equipa), `alertas` e `historico`
- `public/reservado/` — separador Vigilância e papel Cliente na gestão de acessos
