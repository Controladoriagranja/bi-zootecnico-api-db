from datetime import datetime
from pathlib import Path
from typing import Optional

import duckdb
from fastapi import FastAPI, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware

from config import PARQUET_BASE_DINAMICA
from metrics import METRICAS, ORDEM_INDICADORES, sql_metrica


app = FastAPI(title="BI Zootécnico API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MESES = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]

FILTROS_COLUNAS = {
    "status_acerto": "Status Acerto",
    "tipo_granja": "Tipo de Granja",
    "modelo": "Modelo",
    "produtor": "Produtor",
    "tecnico": "Técnico",
    "mist_linha": "Mist Linha",
}


def validar_parquet() -> Path:
    caminho = Path(PARQUET_BASE_DINAMICA)
    if not caminho.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Parquet não encontrado: {caminho}",
        )
    return caminho


def caminho_sql(caminho: Path) -> str:
    return str(caminho).replace("\\", "/").replace("'", "''")


def obter_colunas(con: duckdb.DuckDBPyConnection, sql_path: str) -> set[str]:
    resultado = con.execute(
        f"""
        DESCRIBE
        SELECT *
        FROM read_parquet('{sql_path}')
        """
    ).fetchall()
    return {linha[0] for linha in resultado}


def detectar_coluna_data(colunas: set[str]) -> str:
    candidatos = [
        "Data Abate",
        "Data de Abate",
    ]
    for candidato in candidatos:
        if candidato in colunas:
            return candidato

    raise HTTPException(
        status_code=500,
        detail=(
            "Não encontrei a coluna de relacionamento com a DimCalendario. "
            "Esperado: 'Data Abate' ou 'Data de Abate'."
        ),
    )


def montar_where(
    status_acerto: Optional[str] = None,
    tipo_granja: Optional[str] = None,
    modelo: Optional[str] = None,
    produtor: Optional[str] = None,
    tecnico: Optional[str] = None,
    mist_linha: Optional[str] = None,
) -> tuple[str, list]:
    recebidos = {
        "status_acerto": status_acerto,
        "tipo_granja": tipo_granja,
        "modelo": modelo,
        "produtor": produtor,
        "tecnico": tecnico,
        "mist_linha": mist_linha,
    }

    condicoes = []
    parametros = []

    for chave, valor in recebidos.items():
        if valor is None or valor == "":
            continue

        coluna = FILTROS_COLUNAS[chave]
        condicoes.append(f'CAST("{coluna}" AS VARCHAR) = ?')
        parametros.append(valor)

    if not condicoes:
        return "", parametros

    return " WHERE " + " AND ".join(condicoes), parametros


def atualizado_em(caminho: Path) -> str:
    return datetime.fromtimestamp(caminho.stat().st_mtime).strftime(
        "%d/%m/%Y %H:%M:%S"
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/zootecnico/info")
def info():
    caminho = validar_parquet()
    stat = caminho.stat()

    return {
        "arquivo": caminho.name,
        "caminho": str(caminho),
        "tamanho_mb": round(stat.st_size / 1024 / 1024, 2),
        "atualizado_em": atualizado_em(caminho),
    }


@app.get("/api/zootecnico/schema")
def schema():
    caminho = validar_parquet()
    sql_path = caminho_sql(caminho)
    con = duckdb.connect()

    try:
        resultado = con.execute(
            f"""
            DESCRIBE
            SELECT *
            FROM read_parquet('{sql_path}')
            """
        ).fetchall()

        return {
            "arquivo": caminho.name,
            "colunas": [
                {"nome": linha[0], "tipo": linha[1]}
                for linha in resultado
            ],
        }
    finally:
        con.close()


@app.get("/api/zootecnico/amostra")
def amostra(limite: int = 20):
    caminho = validar_parquet()
    limite = max(1, min(limite, 200))
    sql_path = caminho_sql(caminho)
    con = duckdb.connect()

    try:
        cursor = con.execute(
            f"""
            SELECT *
            FROM read_parquet('{sql_path}')
            LIMIT {limite}
            """
        )
        colunas = [descricao[0] for descricao in cursor.description]
        linhas = cursor.fetchall()
        dados = [dict(zip(colunas, linha)) for linha in linhas]

        return jsonable_encoder({
            "quantidade": len(dados),
            "dados": dados,
        })
    finally:
        con.close()


@app.get("/api/zootecnico/contagem")
def contagem():
    caminho = validar_parquet()
    sql_path = caminho_sql(caminho)
    con = duckdb.connect()

    try:
        quantidade = con.execute(
            f"""
            SELECT COUNT(*)
            FROM read_parquet('{sql_path}')
            """
        ).fetchone()[0]
        return {"registros": quantidade}
    finally:
        con.close()


@app.get("/api/zootecnico/formulas")
def formulas():
    return {
        "metricas": [METRICAS[item] for item in ORDEM_INDICADORES]
    }


@app.get("/api/zootecnico/filtros")
def filtros():
    caminho = validar_parquet()
    sql_path = caminho_sql(caminho)
    con = duckdb.connect()

    try:
        colunas = obter_colunas(con, sql_path)

        def valores_distintos(coluna: str):
            if coluna not in colunas:
                return []

            resultado = con.execute(
                f"""
                SELECT DISTINCT CAST("{coluna}" AS VARCHAR) AS valor
                FROM read_parquet('{sql_path}')
                WHERE "{coluna}" IS NOT NULL
                  AND TRIM(CAST("{coluna}" AS VARCHAR)) <> ''
                ORDER BY valor
                """
            ).fetchall()

            return [linha[0] for linha in resultado]

        return {
            chave: valores_distintos(coluna)
            for chave, coluna in FILTROS_COLUNAS.items()
        }
    finally:
        con.close()


@app.get("/api/zootecnico/desempenho")
def desempenho(
    status_acerto: Optional[str] = Query(default=None),
    tipo_granja: Optional[str] = Query(default=None),
    modelo: Optional[str] = Query(default=None),
    produtor: Optional[str] = Query(default=None),
    tecnico: Optional[str] = Query(default=None),
    mist_linha: Optional[str] = Query(default=None),
):
    caminho = validar_parquet()
    sql_path = caminho_sql(caminho)
    con = duckdb.connect()

    try:
        colunas = obter_colunas(con, sql_path)
        coluna_data = detectar_coluna_data(colunas)

        faltantes = []
        for metric_id in ORDEM_INDICADORES:
            coluna = METRICAS[metric_id]["coluna"]
            if coluna not in colunas:
                faltantes.append(coluna)

        if faltantes:
            raise HTTPException(
                status_code=500,
                detail=f"Colunas de métricas não encontradas: {', '.join(faltantes)}",
            )

        where_sql, parametros = montar_where(
            status_acerto=status_acerto,
            tipo_granja=tipo_granja,
            modelo=modelo,
            produtor=produtor,
            tecnico=tecnico,
            mist_linha=mist_linha,
        )

        data_expr = f'TRY_CAST("{coluna_data}" AS TIMESTAMP)'

        expressoes = ",\n".join(
            f"{sql_metrica(metric_id)} AS \"{metric_id}\""
            for metric_id in ORDEM_INDICADORES
        )

        # Mes/Ano equivalentes ao uso da DimCalendario ligada por Data Abate.
        sql_mensal = f"""
            SELECT
                YEAR({data_expr}) AS ano,
                MONTH({data_expr}) AS mes_numero,
                {expressoes}
            FROM read_parquet('{sql_path}')
            {where_sql}
            {'AND' if where_sql else 'WHERE'} {data_expr} IS NOT NULL
            GROUP BY 1, 2
            ORDER BY 1, 2
        """

        mensal = con.execute(sql_mensal, parametros).fetchall()
        nomes_mensal = [item[0] for item in con.description]
        linhas_mensais = [dict(zip(nomes_mensal, linha)) for linha in mensal]

        sql_total_ano = f"""
            SELECT
                YEAR({data_expr}) AS ano,
                {expressoes}
            FROM read_parquet('{sql_path}')
            {where_sql}
            {'AND' if where_sql else 'WHERE'} {data_expr} IS NOT NULL
            GROUP BY 1
            ORDER BY 1
        """

        total_ano = con.execute(sql_total_ano, parametros).fetchall()
        nomes_total = [item[0] for item in con.description]
        linhas_totais = [dict(zip(nomes_total, linha)) for linha in total_ano]

        anos = sorted(
            {
                int(linha["ano"])
                for linha in linhas_mensais
                if linha["ano"] is not None
            }
        )

        indicadores = {}

        for metric_id in ORDEM_INDICADORES:
            metrica = METRICAS[metric_id]

            por_ano = {
                str(ano): [None] * 12
                for ano in anos
            }

            for linha in linhas_mensais:
                ano = linha["ano"]
                mes_numero = linha["mes_numero"]

                if ano is None or mes_numero is None:
                    continue

                por_ano[str(int(ano))][int(mes_numero) - 1] = linha[metric_id]

            totais = {
                str(ano): None
                for ano in anos
            }

            for linha in linhas_totais:
                ano = linha["ano"]
                if ano is None:
                    continue
                totais[str(int(ano))] = linha[metric_id]

            indicadores[metric_id] = {
                "id": metric_id,
                "nome": metrica["nome"],
                "unidade": metrica.get("unidade", ""),
                "casas_decimais": metrica.get("casas_decimais", 2),
                "por_ano": por_ano,
                "totais": totais,
            }

        return jsonable_encoder({
            "arquivo": caminho.name,
            "atualizado_em": atualizado_em(caminho),
            "coluna_calendario": coluna_data,
            "anos": anos,
            "meses": [
                {"numero": indice + 1, "nome": nome}
                for indice, nome in enumerate(MESES)
            ],
            "indicadores": indicadores,
        })

    finally:
        con.close()
