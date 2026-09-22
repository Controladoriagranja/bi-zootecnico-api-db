DOCUMENTO HISTÓRICO — V5.2. Para instalação e funcionamento atuais, consulte README.md.
Não use as instruções de substituição abaixo como guia da versão atual.

BI Zootécnico V5.2

ALTERAÇÕES
- Fonte Geist Sans (mesma família padrão usada pelo dashboard shadcn-echarts de referência).
- Fontes aumentadas em aproximadamente 1 ponto visual nas duas telas.
- Detalhamento ganhou filtro Indicador.
- Primeira tela substitui Mist Linha por Tipo de Linhagem + Linhagem.
- Regra: Linhagem contendo '/' = Mista; caso contrário = Pura.
- Selecionar Pura/Mista restringe o select Linhagem às opções compatíveis.
- Filtros continuam facetados/dependentes.

SUBSTITUIR
backend/main.py
index.html
detalhes.html
formulas.html
assets/css/app.css
assets/js/filters.js
assets/js/dashboard.js
assets/js/detalhes.js

Também incluídos no pacote os JS de apoio para facilitar sincronização.

NÃO SUBSTITUIR
backend/metrics.py
backend/config.py
backend/.venv

