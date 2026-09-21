# BI Zootécnico - Shadcn-like V5

Versão visual inspirada na organização do shadcn-echarts-demo, usando as cores da Granja Brasília.

## Mudanças principais

- A primeira tela mantém somente os 6 filtros atuais.
- Ano, Mês e Galpão existem apenas em `detalhes.html`.
- `Detalhes →` reativado em cada indicador.
- Clique em uma célula mensal leva ano + mês para o detalhamento.
- Filtros dependentes/facetados no backend.
- Selecionar Produtor restringe Técnico e Galpão; selecionar Técnico restringe Produtor e Galpão; e vice-versa.
- Ranking de Técnicos e Produtores com ECharts.
- Evolução mensal com barras arredondadas.
- Clique em uma barra de ranking aplica cross-filter.
- Tema claro/escuro persistido no navegador.
- Fórmulas continuam centralizadas no backend `metrics.py`.
- Frontend separado em `theme.js`, `filters.js`, `charts.js`, `dashboard.js` e `detalhes.js`.

## Importante

Não substitua seu `backend/metrics.py` nem seu `backend/config.py`.

O campo de Galpão usado nesta versão é:
`Galpão.1`

Se o campo correto no negócio for outro, altere somente:
`DIMENSOES["galpao"]` em `backend/main.py`.
