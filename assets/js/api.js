/**
 * Cliente HTTP do BI Zootécnico.
 *
 * O navegador não lê mais Parquet.
 * Todos os dados vêm da API publicada pelo Cloudflare Worker,
 * que valida a sessão do Portal BI e encaminha a consulta
 * pelo Cloudflare Tunnel até a API interna.
 */

function getPortalToken() {
  try {
    return sessionStorage.getItem("granjabi_auth_token") || "";
  } catch (_) {
    return "";
  }
}

async function apiGet(endpoint, params = {}, options = {}) {
  if (!endpoint) {
    throw new Error("Endpoint da API não informado.");
  }

  const baseUrl = String(APP_CONFIG.API_URL || "").replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("APP_CONFIG.API_URL não configurada.");
  }

  const token = getPortalToken();

  if (!token) {
    throw new Error(
      "Sessão do Portal BI não encontrada. Entre pelo Portal BI e abra o relatório novamente."
    );
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = new URL(baseUrl + normalizedEndpoint);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined && item !== "") {
          url.searchParams.append(key, String(item));
        }
      });
      return;
    }

    url.searchParams.append(key, String(value));
  });

  let response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      signal: options.signal,
      cache: options.cache || "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Não foi possível conectar à API do BI. " +
        "Verifique a conexão com a internet e a disponibilidade do serviço."
    );
  }

  if (!response.ok) {
    let body = null;

    try {
      body = await response.json();
    } catch (_) {
      // Resposta não-JSON.
    }

    if (response.status === 401) {
      throw new Error(
        body?.detail ||
          body?.mensagem ||
          "Sessão inválida ou expirada. Entre novamente no Portal BI."
      );
    }

    if (response.status === 403) {
      throw new Error(
        body?.detail ||
          body?.mensagem ||
          "Você não possui permissão para acessar este relatório."
      );
    }

    const detail =
      body?.detail ||
      body?.mensagem ||
      body?.erro ||
      "";

    throw new Error(
      `Erro na API: ${response.status}${detail ? ` - ${detail}` : ""}`
    );
  }

  return response.json();
}
