from datetime import datetime
from pathlib import Path
from metrics import METRICAS

import duckdb

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
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
    """
    Converte o caminho do Windows para um formato
    mais amigável ao DuckDB.
    """

    return (
        str(caminho)
        .replace("\\", "/")
        .replace("'", "''")
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
        "arquivo": caminho.name,
        "caminho": str(caminho),
        "tamanho_mb": round(
            stat.st_size / 1024 / 1024,
            2
        ),
        "atualizado_em": datetime.fromtimestamp(
            stat.st_mtime
        ).strftime("%d/%m/%Y %H:%M:%S")
    }


# ============================================================
# COLUNAS DO PARQUET
# ============================================================

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
# AMOSTRA DOS DADOS
# ============================================================

@app.get("/api/zootecnico/amostra")
def amostra(limite: int = 20):
    caminho = validar_parquet()

    limite = max(
        1,
        min(limite, 200)
    )

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

        colunas = [
            descricao[0]
            for descricao in cursor.description
        ]

        linhas = cursor.fetchall()

        dados = [
            dict(zip(colunas, linha))
            for linha in linhas
        ]

        return jsonable_encoder({
            "quantidade": len(dados),
            "dados": dados
        })

    finally:
        con.close()


# ============================================================
# CONTAGEM DE REGISTROS
# ============================================================

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

        return {
            "registros": quantidade
        }

    finally:
        con.close()


# ============================================================
# CHAMAR METRICAS
# ============================================================
@app.get("/api/zootecnico/formulas")
def formulas():

    return {
        "metricas": list(
            METRICAS.values()
        )
    }
    @app.get("/api/zootecnico/filtros")
def filtros():

    caminho = validar_parquet()
    sql_path = caminho_sql(caminho)

    con = duckdb.connect()

    try:

        def valores_distintos(coluna):

            resultado = con.execute(
                f"""
                SELECT DISTINCT "{coluna}"
                FROM read_parquet('{sql_path}')
                WHERE "{coluna}" IS NOT NULL
                  AND TRIM(CAST("{coluna}" AS VARCHAR)) <> ''
                ORDER BY 1
                """
            ).fetchall()

            return [
                linha[0]
                for linha in resultado
            ]


        return {

            "status_acerto":
                valores_distintos(
                    "Status Acerto"
                ),

            "tipo_granja":
                valores_distintos(
                    "Tipo de Granja"
                ),

            "modelo":
                valores_distintos(
                    "Modelo"
                ),

            "produtor":
                valores_distintos(
                    "Produtor"
                ),

            "tecnico":
                valores_distintos(
                    "Técnico"
                ),

            "mist_linha":
                valores_distintos(
                    "Mist Linha"
                )

        }

    finally:
        con.close()
