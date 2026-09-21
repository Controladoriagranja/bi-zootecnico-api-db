# BI Zootécnico V6.3 — testado

Correções principais:
- `ORDEM_INDICADORES is not defined` corrigido.
- ordem de métricas centralizada em `BI_METRIC_ORDER` dentro de `metrics.js`.
- `dashboard.js` e `api.js` usam a mesma constante.
- cache-busting atualizado para `v=6.3`.
- Hyparquet permanece fixado em 1.31.1 via `+esm`.

Para corrigir o site atual, substitua no mínimo:
- `assets/js/metrics.js`
- `assets/js/api.js`
- `assets/js/dashboard.js`
- `index.html`
- `detalhes.html`
- `formulas.html`

Para evitar mistura de versões, recomenda-se substituir todo o pacote.
