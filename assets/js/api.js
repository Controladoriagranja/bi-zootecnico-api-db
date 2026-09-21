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
        status_acerto:
            "Status Acerto",
        tipo_granja:
            "Tipo de Granja",
        modelo:
            "Modelo",
        produtor:
            "Produtor",
        tecnico:
            "Técnico",
        linhagem:
            "Linhagem",
        galpao:
            "Galpão.1"
    };

    let initPromise = null;
    let data = [];
    let columns = new Set();
    let updatedAt = "—";
    let fileBytes = 0;


    function setLoadingStatus(text) {
        const top =
            document.querySelector(
                ".update-meta strong"
            );

        if (top) {
            top.textContent = text;
        }
    }


    function cleanString(value) {
        if (
            value === null
            || value === undefined
        ) {
            return "";
        }

        return String(value).trim();
    }


    function numeric(value) {
        if (
            value === null
            || value === undefined
            || value === ""
        ) {
            return null;
        }

        if (
            typeof value
            === "number"
        ) {
            return Number.isFinite(value)
                ? value
                : null;
        }

        if (
            typeof value
            === "bigint"
        ) {
            const n = Number(value);
            return Number.isFinite(n)
                ? n
                : null;
        }

        const raw =
            String(value)
                .trim();

        if (!raw) {
            return null;
        }

        let normalized = raw;

        if (
            raw.includes(",")
            && raw.includes(".")
        ) {
            normalized =
                raw
                    .replaceAll(".", "")
                    .replace(",", ".");
        }
        else if (
            raw.includes(",")
        ) {
            normalized =
                raw.replace(",", ".");
        }

        normalized =
            normalized
                .replace(/[^\d.+\-eE]/g, "");

        const n =
            Number(normalized);

        return Number.isFinite(n)
            ? n
            : null;
    }


    function dateParts(value) {
        if (
            value === null
            || value === undefined
            || value === ""
        ) {
            return null;
        }

        if (
            value instanceof Date
        ) {
            if (
                Number.isNaN(
                    value.getTime()
                )
            ) {
                return null;
            }

            return {
                ano:
                    value
                        .getUTCFullYear(),
                mes:
                    value
                        .getUTCMonth()
                    + 1
            };
        }

        if (
            typeof value
            === "bigint"
        ) {
            let n = value;

            // Ajusta timestamp conforme ordem de grandeza.
            const abs =
                n < 0n
                    ? -n
                    : n;

            let ms;

            if (
                abs
                > 100000000000000000n
            ) {
                // nanossegundos
                ms =
                    Number(
                        n
                        / 1000000n
                    );
            }
            else if (
                abs
                > 100000000000000n
            ) {
                // microssegundos
                ms =
                    Number(
                        n
                        / 1000n
                    );
            }
            else {
                ms =
                    Number(n);
            }

            const d =
                new Date(ms);

            if (
                Number.isNaN(
                    d.getTime()
                )
            ) {
                return null;
            }

            return {
                ano:
                    d
                        .getUTCFullYear(),
                mes:
                    d
                        .getUTCMonth()
                    + 1
            };
        }

        if (
            typeof value
            === "number"
        ) {
            let ms = value;

            if (
                Math.abs(ms)
                > 1e17
            ) {
                ms /= 1e6;
            }
            else if (
                Math.abs(ms)
                > 1e14
            ) {
                ms /= 1e3;
            }
            else if (
                Math.abs(ms)
                < 1e11
            ) {
                ms *= 1000;
            }

            const d =
                new Date(ms);

            if (
                !Number.isNaN(
                    d.getTime()
                )
            ) {
                return {
                    ano:
                        d
                            .getUTCFullYear(),
                    mes:
                        d
                            .getUTCMonth()
                        + 1
                };
            }

            return null;
        }

        const text =
            String(value)
                .trim();

        // dd/mm/yyyy
        const br =
            text.match(
                /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/
            );

        if (br) {
            return {
                ano:
                    Number(br[3]),
                mes:
                    Number(br[2])
            };
        }

        // yyyy-mm-dd
        const iso =
            text.match(
                /^(\d{4})-(\d{1,2})-(\d{1,2})/
            );

        if (iso) {
            return {
                ano:
                    Number(iso[1]),
                mes:
                    Number(iso[2])
            };
        }

        const d =
            new Date(text);

        if (
            Number.isNaN(
                d.getTime()
            )
        ) {
            return null;
        }

        return {
            ano:
                d
                    .getUTCFullYear(),
            mes:
                d
                    .getUTCMonth()
                + 1
        };
    }


    function prepareRow(row) {
        const date =
            dateParts(
                row[
                    "Data de Abate"
                ]
                ?? row[
                    "Data Abate"
                ]
            );

        row.__ano =
            date?.ano
            ?? null;

        row.__mes =
            date?.mes
            ?? null;

        const linhagem =
            cleanString(
                row.Linhagem
            );

        row.__tipo_linhagem =
            linhagem
                ? (
                    linhagem.includes("/")
                        ? "mista"
                        : "pura"
                )
                : "";

        return row;
    }


    function getMetricValue(
        row,
        metric
    ) {
        return numeric(
            row[
                metric.coluna
            ]
        );
    }


    function aggregateMetric(
        rows,
        metric
    ) {
        if (
            metric.tipo_calculo
            === "soma"
        ) {
            let sum = 0;
            let found = false;

            for (
                const row
                of rows
            ) {
                const value =
                    getMetricValue(
                        row,
                        metric
                    );

                if (
                    value === null
                ) {
                    continue;
                }

                found = true;
                sum += value;
            }

            return found
                ? sum
                : null;
        }

        if (
            metric.tipo_calculo
            === "media_ponderada"
        ) {
            let weighted = 0;
            let weightTotal = 0;

            for (
                const row
                of rows
            ) {
                const value =
                    getMetricValue(
                        row,
                        metric
                    );

                const weight =
                    numeric(
                        row[
                            metric.ponderador
                        ]
                    );

                if (
                    value === null
                    || weight === null
                    || weight === 0
                ) {
                    continue;
                }

                weighted +=
                    value * weight;

                weightTotal +=
                    weight;
            }

            return weightTotal
                ? weighted
                    / weightTotal
                : null;
        }

        return null;
    }


    function matches(
        row,
        filtros = {},
        excluir = null
    ) {
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

            const filterValue =
                filtros[key];

            if (
                filterValue === null
                || filterValue === undefined
                || filterValue === ""
            ) {
                continue;
            }

            if (
                cleanString(
                    row[column]
                )
                !==
                cleanString(
                    filterValue
                )
            ) {
                return false;
            }
        }

        if (
            excluir
            !== "tipo_linhagem"
        ) {
            const tipo =
                filtros
                    .tipo_linhagem;

            if (
                tipo
                && row
                    .__tipo_linhagem
                    !== tipo
            ) {
                return false;
            }
        }

        if (
            excluir !== "ano"
            && filtros.ano !== null
            && filtros.ano !== undefined
            && filtros.ano !== ""
        ) {
            if (
                row.__ano
                !== Number(
                    filtros.ano
                )
            ) {
                return false;
            }
        }

        if (
            excluir !== "mes"
            && filtros.mes !== null
            && filtros.mes !== undefined
            && filtros.mes !== ""
        ) {
            if (
                row.__mes
                !== Number(
                    filtros.mes
                )
            ) {
                return false;
            }
        }

        return true;
    }


    function filteredRows(
        filtros = {},
        excluir = null
    ) {
        return data.filter(
            row =>
                matches(
                    row,
                    filtros,
                    excluir
                )
        );
    }


    function uniqueSorted(
        rows,
        column
    ) {
        const set =
            new Set();

        for (
            const row
            of rows
        ) {
            const value =
                cleanString(
                    row[column]
                );

            if (value) {
                set.add(value);
            }
        }

        return [
            ...set
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    a.localeCompare(
                        b,
                        "pt-BR",
                        {
                            sensitivity:
                                "base",
                            numeric:
                                true
                        }
                    )
            );
    }


    async function init() {
        if (initPromise) {
            return initPromise;
        }

        initPromise =
            (async () => {
                const started =
                    performance.now();

                try {
                    setLoadingStatus(
                        "Baixando base..."
                    );

                    const [
                        hyparquet,
                        response
                    ] =
                        await Promise.all([
                            import(
                                APP_CONFIG
                                    .hyparquetModuleUrl
                            ),
                            fetch(
                                APP_CONFIG
                                    .parquetUrl,
                                {
                                    cache:
                                        "force-cache"
                                }
                            )
                        ]);

                    if (
                        !response.ok
                    ) {
                        throw new Error(
                            `Não foi possível baixar o Parquet (${response.status}).`
                        );
                    }

                    const lastModified =
                        response
                            .headers
                            .get(
                                "last-modified"
                            );

                    if (
                        lastModified
                    ) {
                        updatedAt =
                            new Date(
                                lastModified
                            )
                                .toLocaleString(
                                    "pt-BR"
                                );
                    }

                    setLoadingStatus(
                        "Lendo base..."
                    );

                    const buffer =
                        await response
                            .arrayBuffer();

                    fileBytes =
                        buffer.byteLength;

                    const raw =
                        await hyparquet
                            .parquetReadObjects({
                                file:
                                    buffer
                            });

                    setLoadingStatus(
                        "Preparando dados..."
                    );

                    data =
                        raw.map(
                            prepareRow
                        );

                    columns =
                        new Set(
                            data[0]
                                ? Object.keys(
                                    data[0]
                                )
                                : []
                        );

                    if (
                        data.length === 0
                    ) {
                        throw new Error(
                            "O Parquet foi carregado, mas não possui registros."
                        );
                    }

                    const required =
                        [
                            "Produtor",
                            "Tipo de Granja",
                            "Modelo",
                            "Técnico",
                            "Linhagem",
                            "Aves Abatidas",
                            "Data de Abate"
                        ];

                    const missing =
                        required.filter(
                            col =>
                                !columns
                                    .has(col)
                        );

                    if (
                        missing.length
                    ) {
                        throw new Error(
                            "Colunas não encontradas no Parquet: "
                            + missing.join(", ")
                        );
                    }

                    const elapsed =
                        Math.round(
                            performance.now()
                            - started
                        );

                    console.info(
                        `[BI] ${data.length.toLocaleString("pt-BR")} registros carregados em ${elapsed} ms.`
                    );

                    setLoadingStatus(
                        updatedAt === "—"
                            ? "Base carregada"
                            : updatedAt
                    );

                    return true;
                }
                catch (error) {
                    initPromise = null;

                    setLoadingStatus(
                        "Erro ao carregar"
                    );

                    throw error;
                }
            })();

        return initPromise;
    }


    async function formulas() {
        return {
            metricas:
                Object.values(
                    METRICAS
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
                data.length,
            tamanho_bytes:
                fileBytes,
            modo:
                "Hyparquet no navegador"
        };
    }


    async function filtros(
        filtrosAtuais = {}
    ) {
        await init();

        const response = {};

        for (
            const [
                key,
                column
            ]
            of Object.entries(
                DIMENSOES
            )
        ) {
            const rows =
                filteredRows(
                    filtrosAtuais,
                    key
                );

            response[key] =
                uniqueSorted(
                    rows,
                    column
                );
        }

        {
            const rows =
                filteredRows(
                    filtrosAtuais,
                    "tipo_linhagem"
                );

            const types =
                new Set();

            for (
                const row
                of rows
            ) {
                if (
                    row
                        .__tipo_linhagem
                ) {
                    types.add(
                        row
                            .__tipo_linhagem
                    );
                }
            }

            response
                .tipo_linhagem =
                [
                    "pura",
                    "mista"
                ]
                    .filter(
                        type =>
                            types
                                .has(type)
                    )
                    .map(
                        type => ({
                            valor:
                                type,
                            nome:
                                type
                                === "mista"
                                    ? "Mista"
                                    : "Pura"
                        })
                    );
        }

        {
            const rows =
                filteredRows(
                    filtrosAtuais,
                    "ano"
                );

            response.ano =
                [
                    ...new Set(
                        rows
                            .map(
                                row =>
                                    row
                                        .__ano
                            )
                            .filter(
                                value =>
                                    Number
                                        .isFinite(
                                            value
                                        )
                            )
                    )
                ]
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            b - a
                    );
        }

        {
            const rows =
                filteredRows(
                    filtrosAtuais,
                    "mes"
                );

            response.mes =
                [
                    ...new Set(
                        rows
                            .map(
                                row =>
                                    row
                                        .__mes
                            )
                            .filter(
                                value =>
                                    value >= 1
                                    && value <= 12
                            )
                    )
                ]
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a - b
                    )
                    .map(
                        month => ({
                            valor:
                                month,
                            nome:
                                MESES[
                                    month - 1
                                ]
                        })
                    );
        }

        return response;
    }


    function groupByYearMonth(
        rows
    ) {
        const map =
            new Map();

        for (
            const row
            of rows
        ) {
            if (
                !row.__ano
                || !row.__mes
            ) {
                continue;
            }

            const key =
                `${row.__ano}-${row.__mes}`;

            if (
                !map.has(key)
            ) {
                map.set(
                    key,
                    []
                );
            }

            map
                .get(key)
                .push(row);
        }

        return map;
    }


    function groupByYear(
        rows
    ) {
        const map =
            new Map();

        for (
            const row
            of rows
        ) {
            if (
                !row.__ano
            ) {
                continue;
            }

            const key =
                row.__ano;

            if (
                !map.has(key)
            ) {
                map.set(
                    key,
                    []
                );
            }

            map
                .get(key)
                .push(row);
        }

        return map;
    }


    async function desempenho(
        filtrosAtuais = {}
    ) {
        await init();

        const rows =
            filteredRows(
                filtrosAtuais
            );

        const years =
            [
                ...new Set(
                    rows
                        .map(
                            row =>
                                row.__ano
                        )
                        .filter(
                            value =>
                                Number
                                    .isFinite(
                                        value
                                    )
                        )
                )
            ]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a - b
                );

        const byYearMonth =
            groupByYearMonth(
                rows
            );

        const byYear =
            groupByYear(
                rows
            );

        const indicadores = {};

        for (
            const metricId
            of BI_METRIC_ORDER
        ) {
            const metric =
                METRICAS[
                    metricId
                ];

            const porAno = {};
            const totais = {};

            for (
                const year
                of years
            ) {
                const values =
                    Array(12)
                        .fill(null);

                for (
                    let month = 1;
                    month <= 12;
                    month++
                ) {
                    const group =
                        byYearMonth
                            .get(
                                `${year}-${month}`
                            )
                        || [];

                    if (
                        group.length
                    ) {
                        values[
                            month - 1
                        ] =
                            aggregateMetric(
                                group,
                                metric
                            );
                    }
                }

                porAno[
                    String(year)
                ] =
                    values;

                const yearRows =
                    byYear
                        .get(year)
                    || [];

                totais[
                    String(year)
                ] =
                    yearRows.length
                        ? aggregateMetric(
                            yearRows,
                            metric
                        )
                        : null;
            }

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
                totais
            };
        }

        return {
            arquivo:
                "base_dinamica.parquet",
            atualizado_em:
                updatedAt,
            anos:
                years,
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


    function ranking(
        rows,
        column,
        metric,
        limit = 20
    ) {
        const groups =
            new Map();

        for (
            const row
            of rows
        ) {
            const name =
                cleanString(
                    row[column]
                );

            if (!name) {
                continue;
            }

            if (
                !groups.has(name)
            ) {
                groups.set(
                    name,
                    []
                );
            }

            groups
                .get(name)
                .push(row);
        }

        return [
            ...groups
                .entries()
        ]
            .map(
                (
                    [
                        nome,
                        group
                    ]
                ) => ({
                    nome,
                    valor:
                        aggregateMetric(
                            group,
                            metric
                        )
                })
            )
            .filter(
                item =>
                    item.valor
                    !== null
                    && Number
                        .isFinite(
                            Number(
                                item.valor
                            )
                        )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(b.valor)
                    - Number(a.valor)
            )
            .slice(
                0,
                limit
            );
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

        const rows =
            filteredRows(
                filtros
            );

        const valor =
            aggregateMetric(
                rows,
                metric
            );

        const rankingTecnicos =
            ranking(
                rows,
                "Técnico",
                metric
            );

        const rankingProdutores =
            ranking(
                rows,
                "Produtor",
                metric
            );

        const byYearMonth =
            groupByYearMonth(
                rows
            );

        const years =
            [
                ...new Set(
                    rows
                        .map(
                            row =>
                                row.__ano
                        )
                        .filter(
                            value =>
                                Number
                                    .isFinite(
                                        value
                                    )
                        )
                )
            ]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a - b
                );

        const series =
            years.map(
                year => {
                    const values =
                        Array(12)
                            .fill(null);

                    for (
                        let month = 1;
                        month <= 12;
                        month++
                    ) {
                        const group =
                            byYearMonth
                                .get(
                                    `${year}-${month}`
                                )
                            || [];

                        if (
                            group.length
                        ) {
                            values[
                                month - 1
                            ] =
                                aggregateMetric(
                                    group,
                                    metric
                                );
                        }
                    }

                    return {
                        ano:
                            year,
                        valores:
                            values
                    };
                }
            );

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
        switch (endpoint) {
            case "/api/health":
                await init();

                return {
                    status:
                        "ok",
                    mode:
                        APP_CONFIG.mode
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
                    `Rota local não reconhecida: ${endpoint}`
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
