# Retomar a publicação — versão consolidada

Este guia parte do ponto em que está. O que já foi feito na nuvem **não se repete**. Muda apenas a forma de trabalhar no Mac: uma **única pasta** e um **script** que confirma tudo antes de publicar.

---

## O que já está feito (não repetir)

| Item | Estado |
|---|---|
| Domínio `dcabconsulting.com` e `www` ligados ao Firebase | Feito |
| Apps Script do formulário de contacto | Feito (só falta colar o URL, no Passo 4) |
| Projeto Firebase `dcab-consulting` e alojamento | Feito |
| Search Console | Feito |
| Plano Blaze e Identity Platform | Feito |
| Entrada com Google e cliente OAuth (`redirect_uri`) | Feito |
| Entrada por email (fornecedor ativo) | Feito |
| Segundo fator TOTP | A confirmar no Passo 6 |

---

## Parte 1 — Uma única pasta (10 minutos)

### Passo 1 — Pôr de lado as pastas antigas

No Finder, **mude o nome** (não apague) das pastas antigas:

| Pasta atual | Novo nome |
|---|---|
| `Documentos/site-dcabconsulting` | `site-dcabconsulting-antigo` |
| `OneDrive/site-dcabconsulting` | `site-dcabconsulting-antigo` |

Para mudar o nome, clique uma vez na pasta, prima **Enter**, escreva o novo nome e prima **Enter**.

### Passo 2 — Instalar a versão consolidada

1. Faça duplo clique em `site-dcabconsulting-final.zip`. Aparece a pasta `site-dcabconsulting`.
2. Arraste essa pasta para **Documentos**. Não use o OneDrive nem o iCloud: a sincronização interfere com a publicação.

Esta pasta já traz:
- `config.js` da área reservada preenchido com os dados do projeto;
- `.firebaserc` a apontar para `dcab-consulting`;
- todos os ficheiros da área reservada, na versão mais recente e coerentes entre si;
- o script `publicar.sh`.

### Passo 3 — Abrir o Terminal na pasta

Abra o Terminal (**Cmd + Espaço**, escreva `Terminal`, prima Enter) e cole:

```bash
cd ~/Documents/site-dcabconsulting
```

A linha do Terminal passa a terminar em `site-dcabconsulting %`.

### Passo 4 — Publicar com verificação

```bash
bash publicar.sh
```

O script faz seis verificações. Na primeira vez, pede o **URL do Apps Script**:
1. Abra script.google.com › **Formulário site DCAB** › **Implementar** › **Gerir implementações**.
2. Copie o **URL** da Aplicação Web (termina em `/exec`).
3. Cole-o no Terminal e prima **Enter**.

**Resultado esperado:** todas as linhas com ✔ e, no fim, «Concluído».

Se aparecer uma linha com ✘, o script pára **sem publicar nada** e indica o que corrigir. Copie essa linha e envie-ma.

> A partir de agora, **sempre que alterar algo no site**, publique com `bash publicar.sh`, a partir desta pasta.

---

## Parte 2 — Confirmar a configuração na nuvem

### Passo 5 — Base de dados e o seu acesso

**Onde:** consola Firebase › **Firestore Database** › **Dados** (*Data*).

**Confirme que:**
- existe a coleção `acessos`;
- dentro dela, existe o documento `daniel.carvalho@dcabconsulting.com` (em minúsculas);
- o documento tem os campos `papel` = `admin` (string) e `ativo` = `true` (boolean).

Se a base de dados não existir, faça os passos 47 e 49 do guia de publicação.

### Passo 6 — Segundo fator ativo

**Onde:** console.cloud.google.com › projeto **dcab-consulting** › **Cloud Shell** (ícone `>_`).

**O que colar:**
```bash
curl -s "https://identitytoolkit.googleapis.com/admin/v2/projects/dcab-consulting/config" -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "X-Goog-User-Project: dcab-consulting" | grep -A8 '"mfa"'
```

**As duas linhas `"state"` têm de dizer `ENABLED`.** Se alguma disser `DISABLED`, execute:
```bash
curl -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/dcab-consulting/config?updateMask=mfa" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "X-Goog-User-Project: dcab-consulting" \
  -d '{"mfa":{"state":"ENABLED","providerConfigs":[{"state":"ENABLED","totpProviderConfig":{"adjacentIntervals":5}}]}}'
```
Depois repita a verificação.

### Passo 7 — Permitir a criação da sua conta

**Onde:** Firebase › **Authentication** › **Definições** (*Settings*) › **Ações do utilizador** (*User actions*).

**O que fazer:** **marque** **Ativar criação (registo)** e clique em **Guardar**. Fica assim só até ao Passo 10.

---

## Parte 3 — Primeiro acesso

Tenha no iPhone o **Microsoft Authenticator** ou o **Google Authenticator**.

### Passo 8 — Entrar com Google

1. Feche todos os separadores de `dcabconsulting.com`.
2. Abra uma janela privada (**Cmd + Shift + N**) e entre em `https://dcabconsulting.com/reservado`.
3. Clique em **Entrar com Google** e escolha `daniel.carvalho@dcabconsulting.com`.

**Resultado esperado:** aparece **Ativar a autenticação de dois fatores**, com o código QR.

**Se aparecer outra coisa:** a página mostra sempre uma mensagem com um código entre parênteses. Envie-me essa mensagem.

### Passo 9 — Registar o segundo fator

1. Na aplicação autenticadora, toque em **+**:
   - Microsoft Authenticator: **Outra conta**;
   - Google Authenticator: **Ler código QR**.
2. Leia o código QR.
3. Escreva o código de 6 dígitos e clique em **Ativar**.
4. Entre de novo com Google e introduza o código atual.

**Resultado esperado:** abre a área reservada no separador **Resumo**, com a indicação **Administrador**.

### Passo 10 — Voltar a bloquear o registo

Em Firebase › **Authentication** › **Definições** › **Ações do utilizador**, **desmarque** **Ativar criação (registo)** e clique em **Guardar**.

### Passo 11 — Preparar a candidatura

1. No **Resumo**, clique em **Criar fases ADT, PP01–PP12 e PSF**.
2. Em **Parâmetros**, clique em **Importar do Excel de controlo** e escolha o ficheiro `Controlo_Execucao_Candidatura_IA_Dcab_Consulting.xlsx`.

---

## Parte 4 — Concluir

| Tarefa | Onde está no guia de publicação |
|---|---|
| Restringir a chave da API aos endereços da DCAB | Passo 68 |
| Testes de segurança | Passos 77 a 81 |
| Convidar outras pessoas por email | Passos 58 a 60 |
| Verificação em dois passos obrigatória no Google Workspace | Passo 82 |

Quando o Passo 11 estiver concluído, as pastas `site-dcabconsulting-antigo` podem ser apagadas.
