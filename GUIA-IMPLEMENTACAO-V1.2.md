# Guia de implementação · versão 1.2

**Data:** 18-10-2026 · **Tempo total:** cerca de 1 h 30 min, em 7 fases.

Esta versão traz quatro mudanças:
- página de início na área reservada;
- acessos por secção;
- módulo de incidentes;
- textos legais revistos (página NIS2, privacidade e referências).

Siga as fases pela ordem: cada uma só começa quando a anterior está concluída.

## Ficheiros

| Ficheiro | Para quê | Onde fica |
|---|---|---|
| `site-dcabconsulting-v1.2.zip` | Site completo, regras, funções e testes. Não traz o `principal.js` | Downloads do Mac |
| `GUIA-IMPLEMENTACAO-V1.2.md` | Este guia (também vem dentro do zip) | — |
| `minutas-incidentes-v1.2.zip` | 11 minutas em texto, para usar fora da área reservada | Pasta partilhada da DCAB |
| Documento «Procedimento de notificação de incidentes» (claude.ai) | Papéis, passos, prazos, minutas e pontos por confirmar. Para aprovar com cada cliente | Descarregar em Word ou PDF no próprio documento |
| `VERSAO-1.2-2026-10-18.md` | Registo da versão (dentro do zip) | — |

---

## Fase 0 · Preparação (5 min)

1. Descarregue `site-dcabconsulting-v1.2.zip` para a pasta Downloads.
   - Se o Safari o descompactar sozinho, aparece uma pasta `site-dcabconsulting-v1.2`.
   - Nesse caso, use o comando alternativo da Fase 2.
2. Abra o Terminal: Cmd + Espaço, escreva «Terminal», Enter.
3. Faça a cópia de segurança da versão atual:

```bash
cd ~/Documents
rsync -a --exclude node_modules site-dcabconsulting/ site-dcabconsulting-copia-v1.1/
ls site-dcabconsulting-copia-v1.1/public/assets/js/principal.js
```

**Resultado esperado:** a última linha mostra o caminho do `principal.js`. Se aparecer «No such file», pare e avise.

---

## Fase 1 · Testar as regras de acesso no Cloud Shell (15 min)

Corre antes de publicar e confirma que um cliente não vê dados de outro.

1. Abra https://console.cloud.google.com/?project=dcab-consulting
2. No canto superior direito, clique no ícone **>_** («Ativar Cloud Shell»). Espere que o terminal abra no fundo do ecrã.
3. Na barra do terminal, clique em **⋮** (Mais) e depois em **Carregar**. Escolha `site-dcabconsulting-v1.2.zip`.
4. No terminal:

```bash
rm -rf ~/site-v12 && unzip -q -o ~/site-dcabconsulting-v1.2.zip -d ~/site-v12
cd ~/site-v12/testes-regras
npm install
npm test
```

**Resultado esperado:** no fim, `# pass 13` e `# fail 0`.
- A primeira vez demora 2 a 4 minutos, porque descarrega o emulador.
- Se aparecer `fail` maior que 0, não publique: copie as linhas com «not ok» e envie-mas.

---

## Fase 2 · Publicar (10 min, no Mac)

1. Descompacte por cima da pasta do site. O seu `principal.js` não é tocado.

```bash
cd ~/Documents
unzip -o ~/Downloads/site-dcabconsulting-v1.2.zip -d site-dcabconsulting
```

   Se o Safari já tinha descompactado o zip, use em vez disso:

```bash
rsync -a ~/Downloads/site-dcabconsulting-v1.2/ ~/Documents/site-dcabconsulting/
```

2. Teste e publique:

```bash
cd ~/Documents/site-dcabconsulting
(cd functions && npm test)
bash publicar.sh funcoes
```

**Resultado esperado:**
- `# pass 15` nos testes das funções.
- Depois, só linhas com ✔ no `publicar.sh`, incluindo «Módulo de incidentes publicado».
- A publicação demora 3 a 6 minutos, por causa das funções.

**Se pedir para iniciar sessão:** execute `firebase login` e volte a correr `bash publicar.sh funcoes`.

**Se o Firebase perguntar se quer apagar alguma função ou política de TTL:** responda sempre **N**.

---

## Fase 3 · Validar no site (10 min)

Abra uma janela privada (Cmd + Shift + N) e confirme:

| Abrir | Ver |
|---|---|
| https://dcabconsulting.com/solucoes/nis2-decreto-lei-125-2025 | Secção «Notificação de incidentes significativos» com «ou pode vir a existir», ANACOM e GNS, sem «contraordenação muito grave» |
| https://dcabconsulting.com/privacidade | «Última atualização: 18 de outubro de 2026» e a secção «Apoio a incidentes (serviço contratado)» |
| https://dcabconsulting.com/referencias | Versão 1.2 da área reservada no topo do registo de alterações |
| https://dcabconsulting.com/reservado | Entrar com Google, pôr o código de 6 dígitos e ver o **Início**, com os cartões Candidatura, Vigilância, Incidentes e Acessos |

Na área reservada, clique em **Candidatura** e confirme que os separadores Resumo, Despesas e os restantes abrem como antes.

---

## Fase 4 · Configurar a área reservada (15 min)

### 4.1 Dar os incidentes aos clientes que já têm acesso

Os acessos antigos de clientes ficam só com a Vigilância até fazer isto.

1. Na área reservada, clique em **Acessos**.
2. Na tabela «Pessoas com acesso», na linha da pessoa, clique em **Papel e secções**.
3. Marque **Incidentes** (e mantenha **Vigilância**, se for o caso). Clique em **Gravar**.
4. Repita para cada pessoa de cliente.

Para convidar alguém novo, o formulário «Convidar pessoa» tem agora as caixas das secções.

### 4.2 Criar a DCAB como cliente, para registar incidentes próprios

1. Abra https://console.firebase.google.com e escolha o projeto **dcab-consulting**.
2. No menu da esquerda: **Firestore Database** › separador **Dados**.
3. Clique na coleção **clientes** › **Adicionar documento**.
4. Preencha os campos:
   - ID do documento: `dcab`;
   - campo `nome`, tipo `string`, valor `DCAB Consulting`.
5. Clique em **Guardar**.

Para cada cliente novo, faça o mesmo com um identificador curto (por exemplo `camara-exemplo`). É esse identificador que se põe no convite das pessoas do cliente.

### 4.3 Acrescentar o CRM ao Início

1. Clique em **Início** › **Gerir ligações**.
2. Na Ligação 1, preencha:
   - Título: `CRM DCAB`;
   - Endereço: `https://crm.dcabconsulting.com`;
   - Descrição: `Contactos, oportunidades e propostas`.
3. Clique em **Gravar**. O cartão aparece em «Outras secções».

Não acrescente aqui o backoffice da Casa Agrícola Andrade: toda a equipa passaria a ver a ligação.

### 4.4 Backoffice em claude.ai

1. Abra o artefacto **Backoffice DCAB**.
2. O cartão «Controlo da candidatura de IA» abre agora a área reservada.
3. Em **Partilhar**, mantenha só quem precisa. A secção antiga da candidatura em claude.ai está só de leitura e pode deixar de ser partilhada.

---

## Fase 5 · Ensaio com um incidente fictício (15 min)

Faça-o com o cliente **DCAB Consulting** e apague o incidente no fim.

1. **Incidentes** › escolha «DCAB Consulting» no seletor (se houver mais de um cliente) › **Registar incidente**.
2. Preencha:
   - Título: `Ensaio · phishing com credenciais`;
   - Tipo: «Fraude»;
   - Regimes: deixe DL 125/2025 marcado;
   - Incidente significativo: «Em avaliação»;
   - Verificado como significativo em: a hora atual.
   - Clique em **Gravar**.
3. Confirme que aparece a referência `INC-2026-…` e a tabela «Comunicações e prazos», com a notificação inicial ao CNCS a 24 h.
4. Na linha do CNCS, clique em **Minuta**. Confirme o texto e clique em **Copiar texto**.
5. Clique em **Registar envio** › Estado «Não aplicável» › **Gravar**. A cronologia ganha uma linha.
6. Clique em **Acrescentar registo**, escreva `Ensaio concluído` e grave.
7. Clique em **Descarregar registo** e abra o ficheiro de texto.
8. Clique em **Apagar** e confirme.

**Resultado esperado:** todos os passos funcionam sem mensagens de erro.

---

## Fase 6 · Governação (ao longo da semana)

- [ ] Assinar com cada cliente que use os incidentes o contrato de subcontratação (RGPD, art. 28.º). O contrato fixa o prazo de conservação dos registos e se, no fim, são devolvidos ou apagados.
- [ ] Rever com cada cliente o documento «Procedimento de notificação de incidentes» e preencher a tabela de papéis com nomes e contactos.
- [ ] Confirmar no Diário da República os pontos da secção «Por confirmar» do procedimento (arts. 48.º e 61.º a 66.º do anexo do DL 125/2025, entre outros).
- [ ] Guardar a versão no Git:

```bash
cd ~/Documents/site-dcabconsulting
git add -A
git commit -m "Versão 1.2: início, secções e incidentes"
```

- [ ] Apagar a cópia `site-dcabconsulting-copia-v1.1` quando a versão 1.2 estiver estável há uma semana.

---

## Se algo correr mal: voltar à versão 1.1

```bash
cd ~/Documents/site-dcabconsulting-copia-v1.1
bash publicar.sh funcoes
```

**Alternativa só para o site, sem regras nem funções:**
1. Na consola do Firebase, abra **Hosting** › **Histórico de lançamentos**.
2. Na versão anterior, clique em **⋮** › **Reverter**.

---

## Quando um cliente for atacado (resumo para ter à mão)

1. **Registar logo** em Incidentes, com a hora da deteção.
2. **Conter sem apagar:** isolar os equipamentos e guardar as provas antes de reinstalar.
3. **Avaliar e registar duas horas:**
   - a verificação de que o incidente é ou pode ser significativo (contam 24 h para o CNCS);
   - o conhecimento da violação de dados (contam 72 h para a CNPD).
4. **Abrir a minuta, rever e entregar ao responsável do cliente**, que submete:
   - na plataforma do CNCS (ou da ANACOM ou do GNS, nos setores destas);
   - no formulário da CNPD.
5. **Registar cada envio** com a referência atribuída e seguir os prazos que a página mostra.
6. **Fechar** com o relatório final ao CNCS (30 dias úteis depois do fim do impacto) e descarregar o registo completo.
