function escapeHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function carregarFormulas() {
  const container = document.getElementById("formulaContainer");

  try {
    const metricas = BI_METRIC_ORDER.map((id) => METRICAS[id]).filter(Boolean);

    metricas.forEach((metrica) => {
      const card = document.createElement("article");

      card.className = "formula-card";

      const regra = metrica.regra_adicional
        ? `
                            <div class="notice">
                                <strong>
                                    Regra adicional
                                </strong>

                                <p>
                                    ${metrica.regra_adicional.descricao}
                                </p>
                            </div>
                        `
        : "";

      card.innerHTML = `
                    <div class="formula-title">
                        <h2>
                            ${metrica.nome}
                        </h2>

                        <span>
                            ${metrica.id}
                        </span>
                    </div>

                    <div class="formula-section">
                        <strong>
                            Fórmula
                        </strong>

                        <div class="code-inline">
                            ${metrica.formula_exibicao}
                        </div>
                    </div>

                    <div class="formula-section">
                        <strong>
                            Descrição
                        </strong>

                        <p>
                            ${metrica.descricao || ""}
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

                    ${regra}

                    <details class="code-details">
                        <summary>
                            Ver DAX original
                        </summary>

                        <pre><code>${escapeHtml(
                          metrica.formula_dax,
                        )}</code></pre>
                    </details>
                `;

      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `
            <div class="alert alert-error">
                ${error.message || "Não foi possível carregar as fórmulas."}
            </div>
        `;
  }
}

carregarFormulas();
