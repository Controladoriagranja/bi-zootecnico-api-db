window.ZooCharts = (() => {
    const instances = new Set();

    function css(name) {
        return getComputedStyle(
            document.documentElement
        ).getPropertyValue(name).trim();
    }

    function common() {
        return {
            text: css("--foreground"),
            muted: css("--muted-foreground"),
            border: css("--border"),
            primary: css("--primary"),
            primary2: css("--primary-2"),
            accent: css("--accent"),
            card: css("--card")
        };
    }

    function init(el) {
        const chart = echarts.init(el);
        instances.add(chart);
        return chart;
    }

    function ranking(chart, rows, title) {
        const c = common();

        chart.setOption({
            animationDuration: 450,
            animationEasing: "cubicOut",

            grid: {
                left: 150,
                right: 32,
                top: 10,
                bottom: 22,
                containLabel: false
            },

            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow"
                },
                backgroundColor: c.card,
                borderColor: c.border,
                textStyle: {
                    color: c.text
                },
                formatter(params) {
                    const item = params[0];

                    return `
                        <strong>${item.name}</strong><br>
                        ${title}: ${Number(item.value).toLocaleString("pt-BR", {
                            maximumFractionDigits: 3
                        })}
                    `;
                }
            },

            xAxis: {
                type: "value",
                splitLine: {
                    lineStyle: {
                        color: c.border,
                        opacity: 0.55
                    }
                },
                axisLabel: {
                    color: c.muted,
                    fontSize: 10
                }
            },

            yAxis: {
                type: "category",
                inverse: true,
                data: rows.map(r => r.nome),
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: c.text,
                    fontSize: 10,
                    width: 136,
                    overflow: "truncate"
                }
            },

            series: [{
                type: "bar",
                data: rows.map(r => r.valor),
                barWidth: 10,
                showBackground: true,
                backgroundStyle: {
                    color: c.border,
                    opacity: 0.35,
                    borderRadius: 8
                },
                itemStyle: {
                    color: c.primary,
                    borderRadius: [0, 8, 8, 0]
                }
            }]
        }, true);
    }

    function evolution(chart, response, metricName) {
        const c = common();

        const series = response.series.map(
            (serie, index) => ({
                name: String(serie.ano),
                type: "bar",
                data: serie.valores,
                barMaxWidth: 22,
                itemStyle: {
                    borderRadius: [6, 6, 0, 0],
                    color:
                        [
                            c.primary,
                            c.primary2,
                            c.accent,
                            c.muted
                        ][index % 4]
                },
                emphasis: {
                    focus: "series"
                }
            })
        );

        chart.setOption({
            animationDuration: 500,
            color: [
                c.primary,
                c.primary2,
                c.accent,
                c.muted
            ],

            tooltip: {
                trigger: "axis",
                backgroundColor: c.card,
                borderColor: c.border,
                textStyle: {
                    color: c.text
                }
            },

            legend: {
                top: 0,
                left: 0,
                textStyle: {
                    color: c.muted,
                    fontSize: 11
                }
            },

            grid: {
                left: 48,
                right: 22,
                top: 42,
                bottom: 42
            },

            xAxis: {
                type: "category",
                data: response.meses.map(m => m.nome),
                axisLine: {
                    lineStyle: {
                        color: c.border
                    }
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: c.muted,
                    fontSize: 10
                }
            },

            yAxis: {
                type: "value",
                name: metricName,
                nameTextStyle: {
                    color: c.muted,
                    fontSize: 10
                },
                splitLine: {
                    lineStyle: {
                        color: c.border,
                        opacity: 0.55
                    }
                },
                axisLabel: {
                    color: c.muted,
                    fontSize: 10
                }
            },

            dataZoom: [
                {
                    type: "inside"
                }
            ],

            series
        }, true);
    }

    function refreshTheme() {
        instances.forEach(chart => {
            chart.resize();
        });
    }

    window.addEventListener(
        "resize",
        () => {
            instances.forEach(
                chart => chart.resize()
            );
        }
    );

    document.addEventListener(
        "dashboard:theme-changed",
        () => {
            // detalhes.js redesenha com os mesmos dados.
            document.dispatchEvent(
                new CustomEvent(
                    "charts:theme-refresh"
                )
            );
        }
    );

    return {
        init,
        ranking,
        evolution,
        refreshTheme
    };
})();
