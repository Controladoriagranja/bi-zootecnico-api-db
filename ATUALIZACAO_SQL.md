# Atualização SQL / Cloudflare

Este pacote deixa o frontend apontando para a API genérica SQL e inclui o patch que deve ser copiado para a API do PC do Anderson.

## Frontend alterado

- `assets/js/config.js`
  - filtros: `/api/bi/zootecnico/filtros`
  - desempenho: `/api/bi/zootecnico/resumo`
  - detalhes: `/api/bi/zootecnico/detalhes`
- `assets/js/filters.js`
  - aceita mês e tipo de linhagem tanto em formato objeto quanto texto
  - normaliza mês para valores `1..12`
  - normaliza tipo de linhagem para `pura` / `mista`
- `assets/js/detalhes.js`
  - catálogo de indicadores passa a vir de `metrics.js`; não existe mais dependência de `/formulas`
- HTMLs
  - cache-buster atualizado para `v=8.0`

## Patch do PC do Anderson

Copie o conteúdo de:

`anderson_api_patch/bi_generic/`

para:

`C:\BI_Granja\API\api_zootecnico\bi_generic\`

Leia antes `anderson_api_patch/LEIA-ME.txt`.

O patch implementa:

- `GET /api/bi/{bi}/filtros`
- `GET /api/bi/{bi}/resumo`
- `GET /api/bi/{bi}/detalhes`

As fórmulas seguem o projeto existente:

- IEP, CA, CAC, GMD, mortalidade, idade, peso médio, vazio, morte no transporte e CAC Ref: média ponderada por `aves_abatidas`.
- Aves abatidas: soma.
- Tipo de linhagem: contém `/` = `mista`; caso contrário = `pura`.
- Ano mínimo global: 2023.

## Importante

O tratamento de valores de `Vazio` abaixo de 7 ou acima de 18 continua sem substituição/corte, pois o próprio projeto informa que essa regra de negócio ainda não foi definida.

O frontend antigo em `backend/` (Parquet/DuckDB) foi mantido como histórico e não é usado pelo GitHub Pages após esta migração.
