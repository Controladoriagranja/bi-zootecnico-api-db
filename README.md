# BI Zootécnico V6 — GitHub Pages / DuckDB-Wasm

Esta versão é 100% estática e NÃO precisa de:
- FastAPI
- Python rodando
- Render
- Cloudflare Tunnel
- instalação no Windows

## Estrutura

index.html
detalhes.html
formulas.html
assets/
data/
  base_dinamica.parquet

O navegador baixa o Parquet e executa as consultas com DuckDB-Wasm.

## Como publicar no GitHub sem Git instalado

1. Extraia o ZIP.
2. No repositório do GitHub, use **Add file > Upload files**.
3. Envie TODO o conteúdo desta pasta mantendo as pastas:
   - index.html
   - detalhes.html
   - formulas.html
   - assets/
   - data/
4. Faça Commit changes.
5. Vá em **Settings > Pages**.
6. Use:
   - Deploy from a branch
   - main
   - / (root)
7. Aguarde o GitHub Pages publicar.
8. Abra a URL do Pages no PC e no celular.

## Atualizar os dados depois

Para um novo teste, basta substituir no GitHub:

data/base_dinamica.parquet

mantendo exatamente esse nome.

## Regra de linhagem

- contém "/" => Mista
- não contém "/" => Pura

O filtro "Tipo de Linhagem" restringe o filtro "Linhagem".

## Atenção de segurança

O arquivo `data/base_dinamica.parquet` fica publicamente baixável quando o GitHub Pages/repositório é público.
Esta arquitetura é indicada para protótipo/teste, não para dados confidenciais em produção.

## Dependências web

Carregadas por CDN:
- DuckDB-Wasm 1.30.0
- ECharts 5
- Geist Variable Font

## Problemas comuns

### Tela fica em "Carregando..."
Abra F12 > Console. Os erros mais prováveis são:
- arquivo `data/base_dinamica.parquet` não foi enviado;
- CDN bloqueada pela rede;
- nome de uma coluna do Parquet mudou.

### No celular não carrega
Confirme que está abrindo a URL HTTPS do GitHub Pages e não um arquivo local.

### Dados antigos após substituir o Parquet
Faça atualização forçada no navegador ou abra em guia anônima.
