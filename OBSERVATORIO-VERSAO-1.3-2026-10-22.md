# Observatório de Exposição Digital — versão 1.3 (22-10-2026)

Mudança de endereço: o Observatório passa de diagnostico.dcabconsulting.com para **observatorio.dcabconsulting.com**, sem acento. O endereço antigo fica a redirecionar (301) para o novo, com o mesmo caminho.

| Campo | Valor |
|---|---|
| Versão | 1.3 |
| Estado | Pacote entregue; por publicar |
| Pacotes | `observatorio-v1.3.zip` e `site-dcabconsulting-v1.4.1.zip` |
| Guia | «Mudança do Observatório para observatorio.dcabconsulting.com» (fases por prioridade) |
| Verificação | `bash verificar-dominio.sh` na pasta do Observatório |

## 1. O que muda

| Onde | Antes | Depois |
|---|---|---|
| Endereço público | diagnostico.dcabconsulting.com | observatorio.dcabconsulting.com |
| Ligação nos emails de consulta de fugas (`ENDERECO_PUBLICO`) | antigo | novo |
| Assinatura do motor nos pedidos (User-Agent) | antigo | novo |
| OSCAL (`import-ap`) | antigo | novo |
| security.txt (Canonical), robots.txt, sitemap, página (canonical e og:url), exemplo | antigo | novo |
| Site principal: página inicial, soluções, simulador, privacidade, referências | ligações ao antigo | ligações ao novo (site 1.4.1) |
| Verificação de disponibilidade (Cloud Monitoring) | «Observatório», endereço antigo | «Observatório (observatorio.dcabconsulting.com)» |

Não muda: o site de alojamento continua a ser `dcab-diagnostico`, a pasta no Mac continua a ser `~/Documents/diagnostico-dcab`, o caminho da API continua `/api/diagnostico` e as funções não mudam de nome.

## 2. Porquê sem acento

Um nome com acento é um nome de domínio internacionalizado: muitos programas de email e navegadores mostram-no como `xn--observatrio-…`, o que parece um endereço falso e baixa a confiança num serviço de segurança.

## 3. Verificação feita

- Todas as referências ao endereço antigo no código e nas páginas substituídas (0 restantes fora dos registos de versões anteriores).
- Páginas do site regeneradas pelos geradores: iguais às editadas.
- Testes das funções do Observatório: 21 de 21.

## 4. Base legal

- Política de privacidade do site: o endereço do Observatório aparece com o nome novo. O tratamento de dados não muda.
- O redirecionamento mantém válidas as ligações já enviadas e as que estão publicadas fora do site.
