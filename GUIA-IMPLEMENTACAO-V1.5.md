# Guia de implementação: site 1.5 e Observatório 1.4

Data: 6 de novembro de 2026

## O que muda

**Site dcabconsulting.com (1.5)**
- Tema claro e escuro: segue o sistema do visitante ou a escolha feita no botão do cabeçalho.
- Marcação «Classificação: Público» no topo e no rodapé de todas as páginas.
- Referências normativas em letra técnica nos atalhos, nas soluções da página inicial e no cabeçalho de cada página de solução.
- Rasura animada de «não pode perder.» no título, depois do vídeo e ao passar o rato.
- Demonstração de prevenção de fuga de dados, a seguir à AnkoraOne, na página inicial e na página de prevenção de fuga de dados.
- Escala de classificação com quatro níveis, na página inicial e na página de classificação.
- Política de privacidade: a escolha do tema fica guardada no navegador («dcab-tema»).
- Página de referências: nota sobre o significado das referências normativas, versões e registo de alterações.

**Observatório (1.4)**
- Tema claro e escuro e marcação de classificação, como no site.
- O motor de análise, o detetor e as funções não mudam. Os resumos de integridade (SRI) do detetor continuam válidos.

**Não muda**
- O vídeo da abertura, as bandas preta e azul, os atalhos e o formulário.
- A área reservada.
- O `principal.js`, que não vem no pacote.
- As regras do Firestore, as funções e os segredos.

## Antes de começar

Precisa de:
- `site-dcabconsulting-v1.5.zip` e `observatorio-v1.4.zip` na pasta Transferências;
- o Terminal do Mac.

Confirme o nome exato dos ficheiros na pasta Transferências. Se o Mac tiver acrescentado « (1)» ao nome, apague as cópias antigas e descarregue de novo.

## Passo 1. Cópia de segurança (para poder reverter)

```bash
cp -a ~/Documents/site-dcabconsulting ~/Documents/site-dcabconsulting-v1.4.1-copia
cp -a ~/Documents/diagnostico-dcab ~/Documents/diagnostico-dcab-v1.3-copia
```

## Passo 2. Site

```bash
cd ~/Documents/site-dcabconsulting
unzip -o ~/Downloads/site-dcabconsulting-v1.5.zip
grep -c data-tema public/index.html
grep -c script.google.com public/assets/js/principal.js
bash publicar.sh
```

- A primeira verificação deve devolver `1`.
- A segunda deve devolver um número maior do que `0`. Isso confirma que o `principal.js` se manteve.
- O `publicar.sh` sem argumentos publica só o alojamento e as regras. As funções ficam como estão.
- Se o Firebase perguntar se quer apagar funções ou políticas de TTL, responda **N**.

## Passo 3. Observatório

```bash
cd ~/Documents/diagnostico-dcab
unzip -o ~/Downloads/observatorio-v1.4.zip
grep -c data-tema public/index.html
bash publicar.sh
```

- A verificação deve devolver `1`.
- Responda **N** se o Firebase perguntar se quer apagar funções ou políticas de TTL.

## Passo 4. Verificação automática

```bash
cd ~/Documents/site-dcabconsulting
bash verificar-v1.5.sh
```

No fim deve aparecer «Versão 1.5 conciliada.» Se aparecer alguma linha com ✘, envie-ma.

## Passo 5. Verificação no navegador (5 minutos)

1. Abra https://dcabconsulting.com numa janela privada.
   - Vê a barra «Classificação: Público» por cima do cabeçalho.
   - O vídeo continua a tocar e, no fim da entrada, «não pode perder.» é tapado e destapado uma vez.
2. Carregue no botão do tema (círculo meio preenchido, ao lado de «Pedir contacto»).
   - A página passa a escuro; as bandas preta e azul ficam iguais.
   - Recarregue: o tema escolhido mantém-se.
3. Na demonstração, a seguir à AnkoraOne:
   - escolha «Endereço pessoal» e carregue em «Enviar email»: os dados ficam rasurados e aparece «Bloqueado»;
   - escolha «Colega da direção financeira» e envie: aparece «Enviado cifrado».
4. Na escala de classificação, carregue em cada nível e confirme que o texto muda.
5. Abra uma página de solução e confirme a linha «Referências: …» por baixo do caminho.
6. No telemóvel, confirme que nada sai da largura do ecrã e que o botão do tema aparece ao lado de «Menu».
7. Abra https://observatorio.dcabconsulting.com, mude o tema e veja um exemplo («Ver um exemplo»).
   - Imprima o exemplo (pré-visualização): o relatório sai sempre em claro.
8. Envie um pedido de teste pelo formulário do site e confirme que chega ao email.

## Se precisar de reverter

```bash
rm -rf ~/Documents/site-dcabconsulting && mv ~/Documents/site-dcabconsulting-v1.4.1-copia ~/Documents/site-dcabconsulting
cd ~/Documents/site-dcabconsulting && bash publicar.sh
rm -rf ~/Documents/diagnostico-dcab && mv ~/Documents/diagnostico-dcab-v1.3-copia ~/Documents/diagnostico-dcab
cd ~/Documents/diagnostico-dcab && bash publicar.sh
```

## Manutenção

As páginas continuam a ser geradas pelos scripts em `ferramentas/`. Depois de correr qualquer `gerar_*.py`, execute:

```bash
python3 ferramentas/aplicar_v15.py
```

O script volta a pôr o tema, a marcação, as referências, a demonstração e a escala. Pode ser executado várias vezes sem duplicar nada. O `publicar.sh` recusa publicar se alguma página não tiver o aspeto da versão 1.5.

## Base legal

- **Escolha do tema:** fica só no navegador («dcab-tema»), sem cookies e sem envio a terceiros. É uma preferência pedida pelo visitante, estritamente necessária para o serviço que pediu (Lei n.º 41/2004, art. 5.º, n.º 2). Está descrita na política de privacidade.
- **Letra técnica (IBM Plex Mono):** alojada no próprio site, com a licença SIL Open Font License junto do ficheiro (`IBMPlexMono-OFL.txt`). Não há pedidos ao Google Fonts, por isso o IP dos visitantes não é enviado à Google.
- **Demonstração:** usa dados fictícios e corre só no navegador; nada é enviado. O NIF 999 999 990 é o número genérico de consumidor final e o IBAN é um exemplo sem conta associada.
- **Referências normativas:** indicam a norma ou o artigo a que cada serviço responde e não sugerem certificação. A nota que o explica está na página de referências.
- **Acessibilidade (WCAG 2.1 AA como referência):**
  - contraste de 4,5:1 ou mais em todos os pares de cores novos, nos dois temas;
  - botões com nome acessível e estado (`aria-pressed`);
  - registo da demonstração anunciado aos leitores de ecrã;
  - com «movimento reduzido», as animações não correm e os resultados aparecem logo.
