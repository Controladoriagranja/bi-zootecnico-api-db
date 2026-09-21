async function apiGet(
    endpoint,
    params = {},
    options = {}
) {
    if (!endpoint) {
        throw new Error("Endpoint da API não informado.");
    }

    const url = new URL(
        APP_CONFIG.API_URL + endpoint
    );

    Object.entries(params).forEach(
        ([key, value]) => {
            if (
                value !== null
                && value !== undefined
                && value !== ""
            ) {
                url.searchParams.append(
                    key,
                    value
                );
            }
        }
    );

    const response = await fetch(
        url,
        {
            signal: options.signal,
            cache: options.cache || "no-store"
        }
    );

    if (!response.ok) {
        let detalhe = "";

        try {
            const corpo = await response.json();
            detalhe = corpo.detail
                ? ` - ${corpo.detail}`
                : "";
        }
        catch (_) {}

        throw new Error(
            `Erro na API: ${response.status}${detalhe}`
        );
    }

    return response.json();
}
