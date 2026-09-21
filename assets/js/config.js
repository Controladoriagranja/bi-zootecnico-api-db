const APP_CONFIG = {
    mode: "static-hyparquet",

    parquetUrl:
        "data/base_dinamica.parquet",

    // Leitor Parquet puro JavaScript: muito menor que DuckDB-Wasm.
    hyparquetModuleUrl:
        "https://cdn.jsdelivr.net/npm/hyparquet/src/hyparquet.min.js",

    endpoints: {
        health:
            "/api/health",
        info:
            "/api/zootecnico/info",
        formulas:
            "/api/zootecnico/formulas",
        filtros:
            "/api/zootecnico/filtros",
        desempenho:
            "/api/zootecnico/desempenho",
        detalhes:
            "/api/zootecnico/detalhes"
    }
};
