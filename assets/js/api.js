const BIStatic = (() => {
    const MESES = [
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro"
    ];

    const DIMENSOES = {
        status_acerto: "Status Acerto",
        tipo_granja: "Tipo de Granja",
        modelo: "Modelo",
        produtor: "Produtor",
        tecnico: "Técnico",
        linhagem: "Linhagem",
        galpao: "Galpão.1"
    };

    let initPromise = null;
    let duckdb = null;
    let db = null;
    let conn = null;
    let columns = new Set();
    let dateColumn = null;
    let updatedAt = "—";
    let recordCount = 0;


    function normalize(value) {
        if (typeof value === "bigint") {
            const number = Number(value);
            return Number.isSafeInteger(number)
                ? number
                : value.toString();
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (
            value
            && typeof value === "object"
            && typeof value.toString === "function"
            && value.constructor
            && /Decimal/i.test(value.constructor.name)
        ) {
            const n = Number(value.toString());
            return Number.isNaN(n)
                ? value.toString()
                : n;
        }

        return value;
    }


    function rows(table) {
        const fields =
            table.schema.fields.map(
                field => field.name
            );

        return table.toArray().map(row => {
            const result = {};

            fields.forEach(field => {
                result[field] =
                    normalize(
                        row[field]
                    );
            });

            return result;
        });
    }


    function sqlLiteral(value) {
        return `'${String(value)
            .replaceAll("'", "''")}'`;
    }


    function qid(value) {
        return `"${String(value)
            .replaceAll('"', '""')}"`;
    }


    function detectDateColumn() {
        for (
            const candidate
            of [
                "Data Abate",
                "Data de Abate"
            ]
        ) {
            if (
                columns.has(candidate)
            ) {
                return candidate;
            }
        }

        throw new Error(
            "Não encontrei 'Data Abate' nem 'Data de Abate' no Parquet."
        );
    }


    async function init() {
        if (initPromise) {
            return initPromise;
        }

        initPromise =
            (async () => {
                try {
                    duckdb =
                        await import(
                            APP_CONFIG
                                .duckdbModuleUrl
                        );

                    const bundles =
                        duckdb
                            .getJsDelivrBundles();

                    const bundle =
                        await duckdb
                            .selectBundle(
                                bundles
                            );

                    const workerUrl =
                        URL.createObjectURL(
                            new Blob(
                                [
                                    `importScripts("${bundle.mainWorker}");`
                                ],
                                {
                                    type:
                                        "text/javascript"
                                }
                            )
                        );

                    const worker =
                        new Worker(
                            workerUrl
                        );

                    const logger =
                        new duckdb
                            .ConsoleLogger(
                                duckdb
                                    .LogLevel
                                    ?.WARNING
                            );

                    db =
                        new duckdb
                            .AsyncDuckDB(
                                logger,
                                worker
                            );

                    await db.instantiate(
                        bundle.mainModule,
                        bundle.pthreadWorker
                    );

                    URL.revokeObjectURL(
                        workerUrl
                    );

                    const parquetResponse =
                        await fetch(
                            APP_CONFIG
                                .parquetUrl,
                            {
                                cache:
                                    "no-cache"
                            }
                        );

                    if (
                        !parquetResponse.ok
                    ) {
                        throw new Error(
                            `Não foi possível baixar ${APP_CONFIG.parquetUrl} (${parquetResponse.status}).`
                        );
                    }

                    const lastModified =
                        parquetResponse.headers.get(
                            "last-modified"
                        );

                    if (lastModified) {
                        updatedAt =
                            new Date(
                                lastModified
                            )
                                .toLocaleString(
                                    "pt-BR"
                                );
                    }

                    const parquetBuffer =
                        new Uint8Array(
                            await parquetResponse
                                .arrayBuffer()
                        );

                    await db.registerFileBuffer(
                        "base_dinamica.parquet",
                        parquetBuffer
                    );

                    conn =
                        await db.connect();

                    await conn.query(`
                        CREATE OR REPLACE VIEW base_dinamica AS
                        SELECT *
                        FROM read_parquet(
                            'base_dinamica.parquet'
                        )
                    `);

                    const schemaTable =
                        await conn.query(`
                            SELECT *
                            FROM base_dinamica
                            LIMIT 0
                        `);

                    columns =
                        new Set(
                            schemaTable
                                .schema
                                .fields
                                .map(
                                    field =>
                                        field.name
                                )
                        );

                    dateColumn =
                        detectDateColumn();

                    const countTable =
                        await conn.query(`
                            SELECT COUNT(*) AS qtd
                            FROM base_dinamica
                        `);

                    const countRows =
                        rows(countTable);

                    recordCount =
                        Number(
                            countRows[0]?.qtd
                            ?? 0
                        );

                    if (
                        updatedAt === "—"
                    ) {
                        updatedAt =
                            "arquivo publicado";
                    }

                    return true;
                }
                catch (error) {
                    initPromise = null;
                    throw error;
                }
            })();

        return initPromise;
    }


    function buildWhere(
        filtros = {},
        excluir = null
    ) {
        const conditions = [];

        for (
            const [
                key,
                column
            ]
            of Object.entries(
                DIMENSOES
            )
        ) {
            if (
                key === excluir
            ) {
                continue;
            }

            const value =
                filtros[key];

            if (
                value === null
                || value === undefined
                || value === ""
            ) {
                continue;
            }

            if (
                !columns.has(column)
            ) {
                continue;
            }

            conditions.push(`
                CAST(${qid(column)} AS VARCHAR)
                =
                ${sqlLiteral(value)}
            `);
        }

        if (
            excluir
            !== "tipo_linhagem"
        ) {
            const tipo =
                filtros
                    .tipo_linhagem;

            if (
                tipo === "mista"
            ) {
                conditions.push(`
                    ${qid("Linhagem")}
                    IS NOT NULL

                    AND
                    TRIM(
                        CAST(
                            ${qid("Linhagem")}
                            AS VARCHAR
                        )
                    ) <> ''

                    AND
                    STRPOS(
                        CAST(
                            ${qid("Linhagem")}
                            AS VARCHAR
                        ),
                        '/'
                    ) > 0
                `);
            }

            if (
                tipo === "pura"
            ) {
                conditions.push(`
                    ${qid("Linhagem")}
                    IS NOT NULL

                    AND
                    TRIM(
                        CAST(
                            ${qid("Linhagem")}
                            AS VARCHAR
                        )
                    ) <> ''

                    AND
                    STRPOS(
                        CAST(
                            ${qid("Linhagem")}
                            AS VARCHAR
                        ),
                        '/'
                    ) = 0
                `);
            }
        }

        const dateExpr =
            `TRY_CAST(${qid(dateColumn)} AS TIMESTAMP)`;

        if (
            excluir !== "ano"
            && filtros.ano !== null
            && filtros.ano !== undefined
            && filtros.ano !== ""
        ) {
            const year =
                Number.parseInt(
                    filtros.ano,
                    10
                );

            if (
                Number.isFinite(year)
            ) {
                conditions.push(
                    `YEAR(${dateExpr}) = ${year}`
                );
            }
        }

        if (
            excluir !== "mes"
            && filtros.mes !== null
            && filtros.mes !== undefined
            && filtros.mes !== ""
        ) {
            const month =
                Number.parseInt(
                    filtros.mes,
                    10
                );

            if (
                Number.isFinite(month)
            ) {
                conditions.push(
                    `MONTH(${dateExpr}) = ${month}`
                );
            }
        }

        if (
            conditions.length === 0
        ) {
            return "";
        }

        return (
            " WHERE "
            + conditions.join(
                " AND "
            )
        );
    }


    async function query(sql) {
        await init();

        const table =
            await conn.query(sql);

        return rows(table);
    }


    async function formulas() {
        return {
            metricas:
                ORDEM_INDICADORES
                    .map(
                        id =>
                            METRICAS[id]
                    )
        };
    }


    async function info() {
        await init();

        return {
            arquivo:
                "base_dinamica.parquet",
            atualizado_em:
                updatedAt,
            registros:
                recordCount,
            coluna_calendario:
                dateColumn,
            modo:
                "DuckDB-Wasm no navegador"
        };
    }


    async function filtros(
        filtrosAtuais = {}
    ) {
        await init();

        const resposta = {};

        for (
            const [
                key,
                column
            ]
            of Object.entries(
                DIMENSOES
            )
        ) {
            if (
                !columns.has(column)
            ) {
                resposta[key] = [];
                continue;
            }

            const where =
                buildWhere(
                    filtrosAtuais,
                    key
                );

            const extra =
                where
                    ? " AND "
                    : " WHERE ";

            const result =
                await query(`
                    SELECT DISTINCT
                        CAST(
                            ${qid(column)}
                            AS VARCHAR
                        ) AS valor
                    FROM base_dinamica
                    ${where}
                    ${extra}
                        ${qid(column)}
                        IS NOT NULL
                    AND
                        TRIM(
                            CAST(
                                ${qid(column)}
                                AS VARCHAR
                            )
                        ) <> ''
                    ORDER BY valor
                `);

            resposta[key] =
                result.map(
                    row =>
                        row.valor
                );
        }

        if (
            columns.has(
                "Linhagem"
            )
        ) {
            const where =
                buildWhere(
                    filtrosAtuais,
                    "tipo_linhagem"
                );

            const extra =
                where
                    ? " AND "
                    : " WHERE ";

            const result =
                await query(`
                    SELECT DISTINCT
                        CASE
                            WHEN STRPOS(
                                CAST(
                                    ${qid("Linhagem")}
                                    AS VARCHAR
                                ),
                                '/'
                            ) > 0
                                THEN 'mista'
                            ELSE 'pura'
                        END AS valor
                    FROM base_dinamica
                    ${where}
                    ${extra}
                        ${qid("Linhagem")}
                        IS NOT NULL
                    AND
                        TRIM(
                            CAST(
                                ${qid("Linhagem")}
                                AS VARCHAR
                            )
                        ) <> ''
                    ORDER BY valor
                `);

            resposta
                .tipo_linhagem =
                result.map(
                    row => ({
                        valor:
                            row.valor,
                        nome:
                            row.valor
                            === "mista"
                                ? "Mista"
                                : "Pura"
                    })
                );
        }
        else {
            resposta
                .tipo_linhagem = [];
        }

        const dateExpr =
            `TRY_CAST(${qid(dateColumn)} AS TIMESTAMP)`;

        {
            const where =
                buildWhere(
                    filtrosAtuais,
                    "ano"
                );

            const extra =
                where
                    ? " AND "
                    : " WHERE ";

            const result =
                await query(`
                    SELECT DISTINCT
                        YEAR(
                            ${dateExpr}
                        ) AS ano
                    FROM base_dinamica
                    ${where}
                    ${extra}
                        ${dateExpr}
                        IS NOT NULL
                    ORDER BY ano DESC
                `);

            resposta.ano =
                result
                    .filter(
                        row =>
                            row.ano
                            !== null
                    )
                    .map(
                        row =>
                            Number(
                                row.ano
                            )
                    );
        }

        {
            const where =
                buildWhere(
                    filtrosAtuais,
                    "mes"
                );

            const extra =
                where
                    ? " AND "
                    : " WHERE ";

            const result =
                await query(`
                    SELECT DISTINCT
                        MONTH(
                            ${dateExpr}
                        ) AS mes
                    FROM base_dinamica
                    ${where}
                    ${extra}
                        ${dateExpr}
                        IS NOT NULL
                    ORDER BY mes
                `);

            resposta.mes =
                result
                    .filter(
                        row =>
                            row.mes
                            !== null
                    )
                    .map(row => {
                        const month =
                            Number(
                                row.mes
                            );

                        return {
                            valor:
                                month,
                            nome:
                                MESES[
                                    month - 1
                                ]
                        };
                    });
        }

        return resposta;
    }


    async function desempenho(
        filtrosAtuais = {}
    ) {
        await init();

        for (
            const metricId
            of ORDEM_INDICADORES
        ) {
            const metric =
                METRICAS[
                    metricId
                ];

            if (
                !columns.has(
                    metric.coluna
                )
            ) {
                throw new Error(
                    `Coluna de métrica não encontrada no Parquet: ${metric.coluna}`
                );
            }
        }

        const where =
            buildWhere(
                filtrosAtuais
            );

        const dateExpr =
            `TRY_CAST(${qid(dateColumn)} AS TIMESTAMP)`;

        const extra =
            where
                ? " AND "
                : " WHERE ";

        const metricExpressions =
            ORDEM_INDICADORES
                .map(
                    metricId =>
                        `${sqlMetrica(metricId)} AS ${qid(metricId)}`
                )
                .join(",\n");

        const mensal =
            await query(`
                SELECT
                    YEAR(
                        ${dateExpr}
                    ) AS ano,

                    MONTH(
                        ${dateExpr}
                    ) AS mes_numero,

                    ${metricExpressions}
                FROM base_dinamica
                ${where}
                ${extra}
                    ${dateExpr}
                    IS NOT NULL
                GROUP BY 1, 2
                ORDER BY 1, 2
            `);

        const totals =
            await query(`
                SELECT
                    YEAR(
                        ${dateExpr}
                    ) AS ano,

                    ${metricExpressions}
                FROM base_dinamica
                ${where}
                ${extra}
                    ${dateExpr}
                    IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            `);

        const anos =
            [
                ...new Set(
                    mensal
                        .filter(
                            row =>
                                row.ano
                                !== null
                        )
                        .map(
                            row =>
                                Number(
                                    row.ano
                                )
                        )
                )
            ]
                .sort(
                    (a, b) =>
                        a - b
                );

        const indicadores = {};

        for (
            const metricId
            of ORDEM_INDICADORES
        ) {
            const metric =
                METRICAS[
                    metricId
                ];

            const porAno = {};

            anos.forEach(year => {
                porAno[
                    String(year)
                ] =
                    Array(12)
                        .fill(null);
            });

            mensal.forEach(row => {
                if (
                    row.ano === null
                    || row.mes_numero
                        === null
                ) {
                    return;
                }

                const year =
                    String(
                        Number(
                            row.ano
                        )
                    );

                const month =
                    Number(
                        row
                            .mes_numero
                    );

                if (
                    porAno[year]
                ) {
                    porAno[year][
                        month - 1
                    ] =
                        row[
                            metricId
                        ];
                }
            });

            const totalByYear = {};

            anos.forEach(year => {
                totalByYear[
                    String(year)
                ] = null;
            });

            totals.forEach(row => {
                if (
                    row.ano
                    !== null
                ) {
                    totalByYear[
                        String(
                            Number(
                                row.ano
                            )
                        )
                    ] =
                        row[
                            metricId
                        ];
                }
            });

            indicadores[
                metricId
            ] = {
                id:
                    metricId,
                nome:
                    metric.nome,
                unidade:
                    metric.unidade
                    || "",
                casas_decimais:
                    metric
                        .casas_decimais
                    ?? 2,
                por_ano:
                    porAno,
                totais:
                    totalByYear
            };
        }

        return {
            arquivo:
                "base_dinamica.parquet",
            atualizado_em:
                updatedAt,
            anos,
            meses:
                MESES.map(
                    (
                        nome,
                        index
                    ) => ({
                        numero:
                            index + 1,
                        nome
                    })
                ),
            indicadores
        };
    }


    async function detalhes(
        filtrosAtuais = {}
    ) {
        await init();

        const indicador =
            filtrosAtuais
                .indicador
            || "gmd";

        const metric =
            METRICAS[
                indicador
            ];

        if (!metric) {
            throw new Error(
                `Indicador inválido: ${indicador}`
            );
        }

        const filtros = {
            ...filtrosAtuais
        };

        delete filtros.indicador;

        const where =
            buildWhere(
                filtros
            );

        const expr =
            sqlMetrica(
                indicador
            );

        const valueRows =
            await query(`
                SELECT
                    ${expr}
                    AS valor
                FROM base_dinamica
                ${where}
            `);

        const valor =
            valueRows[0]
                ?.valor
            ?? null;

        async function ranking(
            column,
            limit = 20
        ) {
            if (
                !columns.has(
                    column
                )
            ) {
                return [];
            }

            const extra =
                where
                    ? " AND "
                    : " WHERE ";

            const result =
                await query(`
                    SELECT
                        CAST(
                            ${qid(column)}
                            AS VARCHAR
                        ) AS nome,

                        ${expr}
                        AS valor

                    FROM base_dinamica

                    ${where}

                    ${extra}
                        ${qid(column)}
                        IS NOT NULL

                    AND
                        TRIM(
                            CAST(
                                ${qid(column)}
                                AS VARCHAR
                            )
                        ) <> ''

                    GROUP BY 1

                    HAVING
                        ${expr}
                        IS NOT NULL

                    ORDER BY
                        valor DESC
                        NULLS LAST

                    LIMIT ${Number(limit)}
                `);

            return result.map(
                row => ({
                    nome:
                        row.nome,
                    valor:
                        row.valor
                })
            );
        }

        const [
            rankingTecnicos,
            rankingProdutores
        ] =
            await Promise.all([
                ranking(
                    "Técnico"
                ),
                ranking(
                    "Produtor"
                )
            ]);

        const dateExpr =
            `TRY_CAST(${qid(dateColumn)} AS TIMESTAMP)`;

        const extra =
            where
                ? " AND "
                : " WHERE ";

        const evolutionRows =
            await query(`
                SELECT
                    YEAR(
                        ${dateExpr}
                    ) AS ano,

                    MONTH(
                        ${dateExpr}
                    ) AS mes,

                    ${expr}
                    AS valor

                FROM base_dinamica

                ${where}

                ${extra}
                    ${dateExpr}
                    IS NOT NULL

                GROUP BY 1, 2
                ORDER BY 1, 2
            `);

        const years =
            [
                ...new Set(
                    evolutionRows
                        .filter(
                            row =>
                                row.ano
                                !== null
                        )
                        .map(
                            row =>
                                Number(
                                    row.ano
                                )
                        )
                )
            ]
                .sort(
                    (a, b) =>
                        a - b
                );

        const series =
            years.map(year => {
                const values =
                    Array(12)
                        .fill(null);

                evolutionRows
                    .forEach(row => {
                        if (
                            Number(
                                row.ano
                            ) === year
                            && row.mes
                                !== null
                        ) {
                            values[
                                Number(
                                    row.mes
                                ) - 1
                            ] =
                                row.valor;
                        }
                    });

                return {
                    ano:
                        year,
                    valores:
                        values
                };
            });

        return {
            arquivo:
                "base_dinamica.parquet",
            atualizado_em:
                updatedAt,
            indicador: {
                id:
                    indicador,
                nome:
                    metric.nome,
                unidade:
                    metric.unidade
                    || "",
                casas_decimais:
                    metric
                        .casas_decimais
                    ?? 2,
                valor
            },
            ranking_tecnicos:
                rankingTecnicos,
            ranking_produtores:
                rankingProdutores,
            evolucao: {
                meses:
                    MESES.map(
                        (
                            nome,
                            index
                        ) => ({
                            numero:
                                index + 1,
                            nome
                        })
                    ),
                series
            },
            filtros
        };
    }


    async function route(
        endpoint,
        params = {}
    ) {
        await init();

        switch (endpoint) {
            case "/api/health":
                return {
                    status:
                        "ok",
                    mode:
                        "static-duckdb-wasm"
                };

            case "/api/zootecnico/info":
                return info();

            case "/api/zootecnico/formulas":
                return formulas();

            case "/api/zootecnico/filtros":
                return filtros(
                    params
                );

            case "/api/zootecnico/desempenho":
                return desempenho(
                    params
                );

            case "/api/zootecnico/detalhes":
                return detalhes(
                    params
                );

            default:
                throw new Error(
                    `Endpoint local não reconhecido: ${endpoint}`
                );
        }
    }


    return {
        init,
        route,
        info
    };
})();


async function apiGet(
    endpoint,
    params = {},
    options = {}
) {
    if (
        options.signal
        ?.aborted
    ) {
        throw new DOMException(
            "Aborted",
            "AbortError"
        );
    }

    const result =
        await BIStatic.route(
            endpoint,
            params
        );

    if (
        options.signal
        ?.aborted
    ) {
        throw new DOMException(
            "Aborted",
            "AbortError"
        );
    }

    return result;
}
