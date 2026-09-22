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


## V7.2 — período + multiselect

Esta versão foi aplicada sobre o ZIP atual enviado pelo usuário.

- Cloudflare Tunnel preservado.
- `config.js` não foi alterado.
- Primeira tela: filtros com checkboxes e seleção múltipla.
- Detalhamento: Ano, Mês, Produtor, Técnico e Galpão com checkboxes.
- Ano e Mês aceitam múltiplas seleções.
- Data de Abate `De / Até` nas duas telas.
- FastAPI ampliada para aceitar parâmetros repetidos e `data_inicio` / `data_fim`.
- `ƒx` nos cards no lugar de `i`.

Depois de substituir `backend/main.py`, reinicie a FastAPI. Não é necessário
reconfigurar o Cloudflare Tunnel.
