const params =
    new URLSearchParams(
        window.location.search
    );


const indicadorId =
    params.get("indicador")
    || "mortalidade";


const metric =
    METRICS[indicadorId]
    || METRICS.mortalidade;


document
    .getElementById(
        "tituloDetalhamento"
    )
    .textContent =
    `Detalhamento - ${metric.titulo}`;


document
    .getElementById(
        "tituloEvolucao"
    )
    .textContent =
    `Evolução de ${metric.titulo}`;



const chartTecnicos =
    echarts.init(
        document.getElementById(
            "rankingTecnicos"
        )
    );


const chartProdutores =
    echarts.init(
        document.getElementById(
            "rankingProdutores"
        )
    );


const chartEvolucao =
    echarts.init(
        document.getElementById(
            "evolucao"
        )
    );



async function carregarDetalhes() {

    const dados =
        await apiGet(
            APP_CONFIG.endpoints.detalhes,
            {
                indicador:
                    indicadorId
            }
        );


    configurarRanking(
        chartTecnicos,
        dados.tecnicos
    );


    configurarRanking(
        chartProdutores,
        dados.produtores
    );


    configurarEvolucao(
        chartEvolucao,
        dados.evolucao
    );

}



function configurarRanking(
    chart,
    dados
) {

    chart.setOption({

        tooltip: {
            trigger: "axis"
        },


        grid: {
            left: 150,
            right: 30,
            top: 10,
            bottom: 30
        },


        xAxis: {
            type: "value"
        },


        yAxis: {

            type: "category",

            inverse: true,

            data:
                dados.labels

        },


        series: [

            {

                type: "bar",

                data:
                    dados.valores,

                itemStyle: {

                    color:
                        "#7a1726",

                    borderRadius:
                        [0, 7, 7, 0]

                }

            }

        ]

    });

}



function configurarEvolucao(
    chart,
    dados
) {

    chart.setOption({

        tooltip: {
            trigger: "axis"
        },


        legend: {
            data:
                dados.series
                    .map(x => x.nome)
        },


        grid: {
            left: 50,
            right: 20,
            top: 40,
            bottom: 40
        },


        xAxis: {

            type: "category",

            data:
                dados.labels

        },


        yAxis: {
            type: "value"
        },


        series:
            dados.series.map(
                serie => ({

                    name:
                        serie.nome,

                    type:
                        "line",

                    smooth:
                        true,

                    data:
                        serie.valores

                })
            )

    });

}



window.addEventListener(
    "resize",
    () => {

        chartTecnicos.resize();

        chartProdutores.resize();

        chartEvolucao.resize();

    }
);



carregarDetalhes();
