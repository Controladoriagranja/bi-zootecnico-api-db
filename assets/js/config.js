const APP_CONFIG = {
    mode: "static-duckdb-wasm",

    // Arquivo servido pelo próprio GitHub Pages.
    parquetUrl: "data/base_dinamica.parquet",

    // DuckDB-Wasm roda 100% no navegador.
    duckdbModuleUrl:
        "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.30.0/+esm",

    endpoints: {
        health: "/api/health",
        info: "/api/zootecnico/info",
        formulas: "/api/zootecnico/formulas",
        filtros: "/api/zootecnico/filtros",
        desempenho: "/api/zootecnico/desempenho",
        detalhes: "/api/zootecnico/detalhes"
    }
};
