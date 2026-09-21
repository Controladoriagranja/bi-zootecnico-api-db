const container =
    document.getElementById(
        "indicadores"
    );


function criarCard(metric) {

    const card =
        document.createElement("article");


    card.className =
        "indicator-card";


    card.innerHTML = `

        <div class="card-header">

            <h2>
                ${metric.titulo}
            </h2>

            <div class="card-actions">

               <button
    class="info-button"
    data-metric-id="${metric.id}"
    aria-label="Ver fórmula de ${metric.titulo}"
>
    i
</button>

                <a
                    class="details-link"
                    href="detalhes.html?indicador=${metric.id}"
                >
                    Detalhes →
                </a>

            </div>

        </div>

        <div
            id="chart-${metric.id}"
            class="chart"
        ></div>

    `;


    container.appendChild(card);


    return echarts.init(
        document.getElementById(
            `chart-${metric.id}`
        )
    );

}



const charts = {};

let formulasCatalogo = {};

Object.values(METRICS)
    .forEach(metric => {

        charts[metric.id] =
            criarCard(metric);

    });

document
    .addEventListener(
        "click",
        event => {

            const botao =
                event.target.closest(
                    ".info-button"
                );


            if (!botao) {
                return;
            }


            abrirFormula(
                botao.dataset.metricId
            );

        }
    );


document
    .getElementById(
        "formulaModalFechar"
    )
    .addEventListener(
        "click",
        fecharFormula
    );


document
    .getElementById(
        "formulaModalBackdrop"
    )
    .addEventListener(
        "click",
        fecharFormula
    );

async function carregarCatalogoFormulas() {

    const resposta =
        await apiGet(
            "/api/zootecnico/formulas"
        );


    formulasCatalogo = {};


    resposta.metricas
        .forEach(metrica => {

            formulasCatalogo[
                metrica.id
            ] = metrica;

        });

}



function abrirFormula(metricId) {

    const metrica =
        formulasCatalogo[metricId];


    if (!metrica) {
        return;
    }


    document
        .getElementById(
            "formulaModalTitulo"
        )
        .textContent =
        metrica.nome;


    document
        .getElementById(
            "formulaModalFormula"
        )
        .textContent =
        metrica.formula_exibicao;


    document
        .getElementById(
            "formulaModalDescricao"
        )
        .textContent =
        metrica.descricao;


    const ponderacaoContainer =
        document.getElementById(
            "formulaModalPonderacaoContainer"
        );


    if (metrica.ponderador) {

        ponderacaoContainer
            .classList
            .remove("hidden");


        document
            .getElementById(
                "formulaModalPonderacao"
            )
            .textContent =
            metrica.ponderador;

    }
    else {

        ponderacaoContainer
            .classList
            .add("hidden");

    }


    const regraContainer =
        document.getElementById(
            "formulaModalRegraContainer"
        );


    if (metrica.regra_adicional) {

        regraContainer
            .classList
            .remove("hidden");


        document
            .getElementById(
                "formulaModalRegra"
            )
            .textContent =
            metrica
                .regra_adicional
                .descricao;

    }
    else {

        regraContainer
            .classList
            .add("hidden");

    }


    document
        .getElementById(
            "formulaModal"
        )
        .classList
        .remove("hidden");

}



function fecharFormula() {

    document
        .getElementById(
            "formulaModal"
        )
        .classList
        .add("hidden");

}

async function carregarDashboard() {

    try {

        const resposta =
            await apiGet(
                APP_CONFIG.endpoints.resumo
            );


        document
            .getElementById(
                "ultimaAtualizacao"
            )
            .textContent =
            `Atualizado em ${resposta.atualizado_em}`;


        Object.entries(charts)
            .forEach(
                ([metricId, chart]) => {

                    const metric =
                        resposta.indicadores[
                            metricId
                        ];


                    if (!metric)
                        return;


                    chart.setOption({

                        tooltip: {
                            trigger: "axis"
                        },


                        grid: {
                            left: 45,
                            right: 15,
                            top: 20,
                            bottom: 35
                        },


                        xAxis: {
                            type: "category",
                            data: metric.labels
                        },


                        yAxis: {
                            type: "value"
                        },


                        series: [

                            {

                                type: "bar",

                                data:
                                    metric.valores,

                                itemStyle: {

                                    color:
                                        "#7a1726",

                                    borderRadius:
                                        [6, 6, 0, 0]

                                }

                            }

                        ]

                    });

                }
            );


    }
    catch (erro) {

        console.error(erro);

        document
            .getElementById(
                "ultimaAtualizacao"
            )
            .textContent =
            "API indisponível";

    }

}



window.addEventListener(
    "resize",
    () => {

        Object.values(charts)
            .forEach(
                chart =>
                    chart.resize()
            );

    }
);

async function iniciar() {

    try {

        await carregarCatalogoFormulas();

        await carregarDashboard();

    }
    catch (erro) {

        console.error(
            "Erro ao iniciar dashboard:",
            erro
        );

    }

}


iniciar();
