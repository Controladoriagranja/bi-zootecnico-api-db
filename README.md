# BI Zootécnico V6.1 FAST — GitHub Pages

Esta versão corrige o travamento da V6 e reduz radicalmente o peso inicial.

## O que foi corrigido

1. Existia conflito JavaScript entre `metrics.js` e `dashboard.js`:
   ambos declaravam `const ORDEM_INDICADORES`.
   Isso podia interromper o carregamento da aplicação.

2. A V6 usava DuckDB-Wasm.
   O motor do DuckDB-Wasm precisa baixar um arquivo WASM de dezenas de MB
   antes mesmo de consultar o Parquet.

3. A V6.1 usa **Hyparquet**, leitor Parquet puro JavaScript e muito menor.
   Para esta base de aproximadamente 3,2 MB, é mais adequado para teste web/mobile.

## Publicação no GitHub

Substitua TODO o conteúdo do repositório pelos arquivos desta versão,
ou no mínimo substitua:

- index.html
- detalhes.html
- formulas.html
- assets/js/config.js
- assets/js/metrics.js
- assets/js/api.js
- assets/js/dashboard.js
- assets/js/detalhes.js
- assets/js/filters.js
- assets/js/charts.js
- assets/js/theme.js
- assets/js/formulas.js
- assets/css/app.css
- data/base_dinamica.parquet

Mantenha `data/base_dinamica.parquet` exatamente nesse caminho.

Depois aguarde o GitHub Pages publicar e faça Ctrl+F5.

No celular, abra a mesma URL HTTPS.

## Funcionamento

GitHub Pages
 -> baixa ~3,2 MB do Parquet
 -> Hyparquet lê a base no navegador
 -> JavaScript calcula filtros e indicadores
 -> ECharts desenha os gráficos

Não precisa de Python, FastAPI, Render ou túnel.

## Segurança

O Parquet publicado em GitHub Pages público também é público.
Use esta arquitetura para protótipo/teste, não como desenho definitivo para dados sensíveis.
