async function apiGet(endpoint, params = {}) {

    const url =
        new URL(
            APP_CONFIG.API_URL + endpoint
        );


    Object.entries(params)
        .forEach(([key, value]) => {

            if (
                value !== null &&
                value !== undefined &&
                value !== ""
            ) {

                url.searchParams
                    .append(key, value);

            }

        });


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            `Erro na API: ${response.status}`
        );

    }


    return response.json();

}
