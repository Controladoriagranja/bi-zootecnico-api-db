class FilterController {
    constructor({
        fields,
        onChange,
        includeDependentRefresh = true
    }) {
        this.fields = fields;
        this.onChange = onChange;
        this.includeDependentRefresh = includeDependentRefresh;

        this.silent = false;
        this.refreshController = null;
    }


    values() {
        const data = {};

        this.fields.forEach(field => {
            const select =
                document.getElementById(
                    field.id
                );

            const value =
                select?.value || "";

            if (value !== "") {
                data[field.apiKey] = value;
            }
        });

        return data;
    }


    async loadOptions({
        preserve = true
    } = {}) {
        const current =
            preserve
                ? this.values()
                : {};

        if (this.refreshController) {
            this.refreshController.abort();
        }

        this.refreshController =
            new AbortController();

        const response =
            await apiGet(
                APP_CONFIG.endpoints.filtros,
                current,
                {
                    signal:
                        this.refreshController.signal
                }
            );

        this.silent = true;

        try {
            for (const field of this.fields) {
                const select =
                    document.getElementById(
                        field.id
                    );

                if (!select) {
                    continue;
                }

                let options =
                    response[field.apiKey]
                    || [];

                if (
                    field.apiKey === "mes"
                    || field.apiKey === "tipo_linhagem"
                ) {
                    options = options.map(item => ({
                        value: String(item.valor),
                        label: item.nome
                    }));
                }
                else {
                    options = options.map(item => ({
                        value: String(item),
                        label: String(item)
                    }));
                }

                const currentValue =
                    current[field.apiKey]
                    ? String(current[field.apiKey])
                    : "";

                select.innerHTML = "";

                const allOption =
                    document.createElement(
                        "option"
                    );

                allOption.value = "";
                allOption.textContent = "Todos";
                select.appendChild(allOption);

                options.forEach(option => {
                    const el =
                        document.createElement(
                            "option"
                        );

                    el.value = option.value;
                    el.textContent = option.label;

                    select.appendChild(el);
                });

                if (
                    currentValue
                    && [...select.options]
                        .some(
                            option =>
                                option.value
                                === currentValue
                        )
                ) {
                    select.value =
                        currentValue;
                }
                else {
                    select.value = "";
                }
            }
        }
        finally {
            this.silent = false;
        }
    }


    set(apiKey, value) {
        const field =
            this.fields.find(
                item =>
                    item.apiKey
                    === apiKey
            );

        if (!field) {
            return;
        }

        const select =
            document.getElementById(
                field.id
            );

        if (!select) {
            return;
        }

        select.value =
            String(value ?? "");
    }


    clear() {
        this.silent = true;

        try {
            this.fields.forEach(field => {
                const select =
                    document.getElementById(
                        field.id
                    );

                if (select) {
                    select.value = "";
                }
            });
        }
        finally {
            this.silent = false;
        }
    }


    register() {
        this.fields.forEach(field => {
            const select =
                document.getElementById(
                    field.id
                );

            if (!select) {
                return;
            }

            select.addEventListener(
                "change",
                async () => {
                    if (this.silent) {
                        return;
                    }

                    if (
                        this.includeDependentRefresh
                    ) {
                        try {
                            await this.loadOptions({
                                preserve: true
                            });
                        }
                        catch (error) {
                            if (
                                error.name
                                !== "AbortError"
                            ) {
                                console.error(
                                    "Erro ao atualizar filtros dependentes:",
                                    error
                                );
                            }
                        }
                    }

                    if (this.onChange) {
                        this.onChange(
                            this.values()
                        );
                    }
                }
            );
        });
    }
}
