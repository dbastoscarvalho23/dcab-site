# Publicação conjunta · site 1.3 e Observatório 1.2

**Data prevista:** 20-10-2026 · **Tempo total:** cerca de 2 h 30 min · **Ordem:** siga os passos pela ordem.

São duas publicações independentes no mesmo projeto Firebase (`dcab-consulting`):

| Publicação | Pasta no Mac | Comando | Guia de pormenor |
|---|---|---|---|
| Site 1.3: incidentes automáticos, rodapé legal, privacidade | `~/Documents/site-dcabconsulting` | `bash publicar.sh funcoes` | `GUIA-IMPLEMENTACAO-V1.3.md` |
| Observatório 1.2: nível de proteção, PDF no detetor, contadores | `~/Documents/diagnostico-dcab` | `bash publicar.sh` | este guia |

As funções do Observatório estão num grupo próprio (`observatorio`), por isso nenhuma das publicações apaga as funções da outra. Mesmo assim, **se o Firebase perguntar se quer apagar alguma função ou política de TTL, responda N.**

O email usado nos passos é **daniel.carvalho@dcabconsulting.com**, sempre em minúsculas.

## Ficheiros

| Ficheiro | Onde fica |
|---|---|
| `site-dcabconsulting-v1.3.zip` | Downloads |
| `observatorio-v1.2.zip` | Downloads |

---

## Passo 1 · Cópias de segurança (5 min, Mac)

```bash
cd ~/Documents
rsync -a --exclude node_modules site-dcabconsulting/ site-dcabconsulting-copia-v1.2/
rsync -a --exclude node_modules diagnostico-dcab/ diagnostico-dcab-copia-v1.1/
ls site-dcabconsulting-copia-v1.2/public/assets/js/principal.js
```

**Resultado esperado:** a última linha mostra o caminho do `principal.js`.

## Passo 2 · Testes das regras (15 min, Cloud Shell)

`GUIA-IMPLEMENTACAO-V1.3.md`, fase 1. **Resultado esperado:** `# pass 19`.

## Passo 3 · Segredos dos incidentes (10 min, Mac)

`GUIA-IMPLEMENTACAO-V1.3.md`, fase 2: `INCIDENTES_SEGREDO` e `INCIDENTES_SEGREDO_CRM`. Não toque no `HIBP_API_KEY`.

## Passo 4 · Publicar o site 1.3 (10 min, Mac)

`GUIA-IMPLEMENTACAO-V1.3.md`, fase 3. **Resultado esperado:** `# pass 26` e só ✔ no `publicar.sh`.

## Passo 5 · Limpeza automática (5 min, Cloud Shell)

`GUIA-IMPLEMENTACAO-V1.3.md`, fase 4 (`api_pedidos` e `pedidosIncidente`).

## Passo 6 · Publicar o Observatório 1.2 (15 min, Mac)

1. Descompacte por cima da pasta do Observatório:

```bash
cd ~/Documents
unzip -o ~/Downloads/observatorio-v1.2.zip -d diagnostico-dcab
cd diagnostico-dcab
```

2. Fixe as versões das bibliotecas (só desta vez; cria o `package-lock.json`):

```bash
(cd functions && npm install --package-lock-only --no-audit --no-fund)
ls functions/package-lock.json
```

3. Publique:

```bash
bash publicar.sh
```

**Resultado esperado:**
- «Bibliotecas instaladas nas versões fixadas (package-lock.json)»;
- «Análise de teste a dcabconsulting.com concluída»;
- «O detetor publicado tem o SHA-256 indicado na página»;
- «Leitor de PDF publicado» e «Leitor de PDF servido como JavaScript»;
- «Contadores do funil ativos (recusam ações desconhecidas)».

**Se der «allUsers» ou «Domain restricted sharing»** na função nova `registarEvento`: envie-me as últimas linhas.

## Passo 7 · Teste do motor com domínios reais (10 min, Cloud Shell)

1. No Cloud Shell, **⋮** › **Carregar** › `observatorio-v1.2.zip`.
2. Execute:

```bash
rm -rf ~/obs12 && unzip -q -o ~/observatorio-v1.2.zip -d ~/obs12 && cd ~/obs12
node ferramentas/testar-motor.js
```

**Resultado esperado:** uma linha por domínio (20) e «0 erros do motor».
- A linha de `example.com` é normal ter verificações sem conclusão.
- Se outro domínio tiver mais de 3 sem conclusão, envie-me a tabela.
- Esta é a primeira execução: fica como referência. Nas seguintes, o script mostra o que mudou.
- Os resultados de terceiros são só para controlo interno: não os divulgue.

## Passo 8 · Drive, Apps Script e configuração dos incidentes (40 min)

`GUIA-IMPLEMENTACAO-V1.3.md`, fases 5, 6 e 7. Na fase 7, em **Avisos por email**, o responsável por omissão é daniel.carvalho@dcabconsulting.com.

## Passo 9 · Validar (25 min)

**Site 1.3:** `GUIA-IMPLEMENTACAO-V1.3.md`, fase 8 (ensaio completo de um pedido de apoio).

**Observatório 1.2**, numa janela privada em https://diagnostico.dcabconsulting.com:

| Fazer | Ver |
|---|---|
| Clicar em «Ver um exemplo» | Cartões «Proteção de terceiros» e «Proteção da própria organização», e a nota «quanto mais alto, melhor» |
| Secção NIS2 | «60 dias úteis… terminou a 15 de setembro de 2026», com a ligação ao ECO |
| Detetor › abrir a escolha do ficheiro › escolher um PDF com texto | Resultado com «Pedidos de rede registados pelo navegador durante a análise: 0» |
| Detetor › PDF digitalizado (só imagem) | Aviso «não tem texto selecionável» |

**Site:** https://dcabconsulting.com/privacidade mostra, na tabela do Observatório, a linha «Contadores diários de utilização»; https://dcabconsulting.com/referencias mostra «Observatório 1.2».

Depois, no Mac:

```bash
cd ~/Documents/site-dcabconsulting && bash verificar-v1.3.sh
```

## Passo 10 · Ler o funil (a partir de 21-10-2026, Cloud Shell)

```bash
cd ~/obs12 && node ferramentas/funil.js
```

Mostra, por dia: visitas, análises, exemplos, pedidos de plano, contactos, OSCAL, fugas e NIS2. Ao fim de 2 semanas temos a linha de base que abre a fase B (redesenho).

## Passo 11 · Fechar (Mac)

```bash
cd ~/Documents/site-dcabconsulting && git add -A && git commit -m "Versão 1.3: incidentes automáticos, rodapé legal, privacidade"
cd ~/Documents/diagnostico-dcab && git add -A && git commit -m "Observatório 1.2: nível de proteção, PDF no detetor, contadores"
```

Se a pasta do Observatório ainda não estiver em Git: `git init` antes do `git add`.

## Se algo correr mal

- **Site:** `GUIA-IMPLEMENTACAO-V1.3.md`, secção «Se algo correr mal».
- **Observatório:**

```bash
cd ~/Documents/diagnostico-dcab-copia-v1.1 && bash publicar.sh
```

Se perguntar se quer apagar a função `registarEvento`, responda **S** (é a nova). A tudo o resto, **N**.
