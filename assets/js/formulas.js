async function carregarFormulas() {

    const container =
        document.getElementById(
            "formulaContainer"
        );


    try {

        const resposta =
            await apiGet(
                "/api/zootecnico/formulas"
            );


        container.innerHTML = "";


        resposta.metricas
            .forEach(metrica => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "formula-card";


                let regraExtra = "";


                if (
                    metrica.regra_adicional
                ) {

                    regraExtra = `

                        <div class="formula-warning">

                            <strong>
                                Regra adicional
                            </strong>

                            <p>
                                ${
                                    metrica
                                    .regra_adicional
                                    .descricao
                                }
                            </p>

                        </div>

                    `;

                }


                card.innerHTML = `

                    <div class="formula-title">

                        <div>

                            <h2>
                                ${metrica.nome}
                            </h2>

                            <span>
                                ${metrica.id}
                            </span>

                        </div>

                    </div>


                    <div class="formula-section">

                        <strong>
                            Fórmula
                        </strong>

                        <div class="formula-readable">

                            ${
                                metrica
                                .formula_exibicao
                            }

                        </div>

                    </div>


                    <div class="formula-section">

                        <strong>
                            Descrição
                        </strong>

                        <p>
                            ${metrica.descricao}
                        </p>

                    </div>


                    ${
                        metrica.ponderador
                            ? `
                                <div class="formula-section">

                                    <strong>
                                        Ponderação
                                    </strong>

                                    <p>
                                        ${metrica.ponderador}
                                    </p>

                                </div>
                            `
                            : ""
                    }


                    ${regraExtra}


                    <details class="formula-code">

                        <summary>
                            Ver fórmula DAX original
                        </summary>

                        <pre><code>${
                            escapeHtml(
                                metrica.formula_dax
                            )
                        }</code></pre>

                    </details>

                `;


                container.appendChild(
                    card
                );

            });


    }
    catch (erro) {

        console.error(erro);


        container.innerHTML = `

            <div class="formula-error">

                Não foi possível carregar
                as fórmulas.

            </div>

        `;

    }

}



function escapeHtml(texto) {

    return texto

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        );

}



carregarFormulas();
