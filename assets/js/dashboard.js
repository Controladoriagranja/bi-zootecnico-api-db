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


Object.values(METRICS)
    .forEach(metric => {

        charts[metric.id] =
            criarCard(metric);

    });



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



carregarDashboard();
