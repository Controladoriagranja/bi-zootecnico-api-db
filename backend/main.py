from datetime import datetime
from pathlib import Path

import duckdb

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import PARQUET_BASE_DINAMICA


app = FastAPI(
    title="BI Zootécnico API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# UTILITÁRIOS
# ============================================================

def validar_parquet() -> Path:

    caminho = Path(PARQUET_BASE_DINAMICA)

    if not caminho.exists():

        raise HTTPException(
            status_code=500,
            detail=f"Parquet não encontrado: {caminho}"
        )

    return caminho


def caminho_sql(caminho: Path) -> str:

    return str(caminho).replace(
        "'",
        "''"
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():

    return {
        "status": "ok"
    }


# ============================================================
# INFORMAÇÕES DO PARQUET
# ============================================================

@app.get("/api/zootecnico/info")
def info():

    caminho = validar_parquet()

    stat = caminho.stat()

    return {

        "arquivo":
            caminho.name,

        "caminho":
            str(caminho),

        "tamanho_mb":
            round(
                stat.st_size / 1024 / 1024,
                2
            ),

        "atualizado_em":
            datetime.fromtimestamp(
                stat.st_mtime
            ).strftime(
                "%d/%m/%Y %H:%M:%S"
            )

    }


# ============================================================
# COLUNAS DO PARQUET
# ============================================================

@app.get("/api/zootecnico/schema")
def schema():

    caminho = validar_parquet()

    sql_path =
        caminho_sql(caminho)

    con =
        duckdb.connect()


    try:

        resultado =
            con.execute(
                f"""
                DESCRIBE
                SELECT *
                FROM read_parquet(
                    '{sql_path}'
                )
                """
            ).fetchall()


        return {

            "arquivo":
                caminho.name,

            "colunas": [

                {
                    "nome": linha[0],
                    "tipo": linha[1]
                }

                for linha in resultado

            ]

        }


    finally:

        con.close()


# ============================================================
# AMOSTRA REAL DOS DADOS
# ============================================================

@app.get("/api/zootecnico/amostra")
def amostra(
    limite: int = 20
):

    caminho =
        validar_parquet()

    limite =
        max(
            1,
            min(
                limite,
                200
            )
        )


    sql_path =
        caminho_sql(caminho)


    con =
        duckdb.connect()


    try:

        cursor =
            con.execute(
                f"""
                SELECT *
                FROM read_parquet(
                    '{sql_path}'
                )
                LIMIT {limite}
                """
            )


        colunas = [
            desc[0]
            for desc
            in cursor.description
        ]


        linhas =
            cursor.fetchall()


        dados = [

            dict(
                zip(
                    colunas,
                    linha
                )
            )

            for linha
            in linhas

        ]


        # deixa datas e outros objetos
        # compatíveis com JSON
        for registro in dados:

            for chave, valor \
                in registro.items():

                if isinstance(
                    valor,
                    (
                        datetime,
                    )
                ):

                    registro[chave] = (
                        valor.isoformat()
                    )


        return {

            "quantidade":
                len(dados),

            "dados":
                dados

        }


    finally:

        con.close()


# ============================================================
# QUANTIDADE TOTAL DE REGISTROS
# ============================================================

@app.get("/api/zootecnico/contagem")
def contagem():

    caminho =
        validar_parquet()

    sql_path =
        caminho_sql(caminho)


    con =
        duckdb.connect()


    try:

        quantidade =
            con.execute(
                f"""
                SELECT COUNT(*)
                FROM read_parquet(
                    '{sql_path}'
                )
                """
            ).fetchone()[0]


        return {

            "registros":
                quantidade

        }


    finally:

        con.close()
