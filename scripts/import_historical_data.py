# coding: utf-8
"""
scripts/import_historical_data.py
---------------------------------
Script para gerar e estruturar o histórico de dados do SINAPI
(meses de 2026-01 a 2026-04, estados SP, RJ, MG, AC).
"""

import sys
import random
from pathlib import Path
import pandas as pd

# Ajusta sys.path para permitir importações a partir do diretório raiz
root_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root_dir))

from utils.base import salvar_csv, agora_brt
from scripts.utils.ux import banner, print_done, ColorLogger

log = ColorLogger("import_historical_data")

INSUMOS_MOCK = [
    # Materials
    {"codigo": "00001379", "descricao": "Cimento portland composto cp ii-32", "unidade": "KG", "base_price": 0.75},
    {"codigo": "00000370", "descricao": "Areia media - posto jazida/fornecedor (retirado na jazida, sem transporte)", "unidade": "M3", "base_price": 90.00},
    {"codigo": "00004721", "descricao": "Pedra britada n. 1 (9,5 a 19 mm) posto pedreira/fornecedor, sem frete", "unidade": "M3", "base_price": 80.00},
    {"codigo": "00000114", "descricao": "Aco ca-50, 10,0 mm, ou ca-60, linear, vergalhao", "unidade": "KG", "base_price": 8.50},
    {"codigo": "00007258", "descricao": "Tijolo ceramico macico comum *5 x 10 x 20* cm (l x a x c)", "unidade": "MIL", "base_price": 650.00},
    {"codigo": "00007271", "descricao": "Bloco de concreto estrutural 14 x 19 x 39 cm", "unidade": "UN", "base_price": 3.80},
    {"codigo": "00003402", "descricao": "Telha ceramica tipo francesa, comprimento de cerca de 40 cm", "unidade": "UN", "base_price": 2.20},
    {"codigo": "00005318", "descricao": "Tubo pvc soldavel, classe 15, dn 50 mm, para agua fria (nbr 5648)", "unidade": "M", "base_price": 12.00},
    {"codigo": "00001014", "descricao": "Cabo de cobre flexivel isolado, 2,5 mm2, anti-chama 450/750 v", "unidade": "M", "base_price": 2.50},
    {"codigo": "00004812", "descricao": "Disjuntor termomagnetico monopolar padrao din, 10a a 32a", "unidade": "UN", "base_price": 15.00},
    {"codigo": "00001287", "descricao": "Tinta latex acrilica premium, cor branco fosco", "unidade": "L", "base_price": 22.00},
    {"codigo": "00001382", "descricao": "Argamassa colante ac-i para assentamento de placas ceramicas", "unidade": "KG", "base_price": 1.20},
    {"codigo": "00001389", "descricao": "Placa de ceramica para piso, esmaltada premium, PEI 4", "unidade": "M2", "base_price": 35.00},
    # Labor (Hour rate base)
    {"codigo": "00000088", "descricao": "Pedreiro (horista)", "unidade": "H", "base_price": 25.00, "is_labor": True},
    {"codigo": "00006111", "descricao": "Servente de pedreiro (horista)", "unidade": "H", "base_price": 18.00, "is_labor": True},
    {"codigo": "00000120", "descricao": "Pintor (horista)", "unidade": "H", "base_price": 24.00, "is_labor": True},
    {"codigo": "00000246", "descricao": "Eletricista (horista)", "unidade": "H", "base_price": 26.00, "is_labor": True},
    {"codigo": "00000247", "descricao": "Encanador (horista)", "unidade": "H", "base_price": 25.00, "is_labor": True},
    {"codigo": "00004012", "descricao": "Carpinteiro de formas (horista)", "unidade": "H", "base_price": 25.00, "is_labor": True},
]

COMPOSICOES_MOCK = [
    {
        "codigo": "00088316",
        "descricao": "Concreto fck = 25 mpa, preparado mecanicamente, lancado e adensado em pilares",
        "unidade": "M3",
        "itens": [
            {"item_codigo": "00001379", "item_tipo": "INSUMO", "coeficiente": 350.0},
            {"item_codigo": "00000370", "item_tipo": "INSUMO", "coeficiente": 0.65},
            {"item_codigo": "00004721", "item_tipo": "INSUMO", "coeficiente": 0.75},
            {"item_codigo": "00000088", "item_tipo": "INSUMO", "coeficiente": 2.5},
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 6.0},
        ]
    },
    {
        "codigo": "00089123",
        "descricao": "Alvenaria de vedacao com tijolo ceramico macico comum, espessura 10 cm, assentado com argamassa",
        "unidade": "M2",
        "itens": [
            {"item_codigo": "00007258", "item_tipo": "INSUMO", "coeficiente": 0.08},
            {"item_codigo": "00001379", "item_tipo": "INSUMO", "coeficiente": 12.0},
            {"item_codigo": "00000370", "item_tipo": "INSUMO", "coeficiente": 0.04},
            {"item_codigo": "00000088", "item_tipo": "INSUMO", "coeficiente": 1.8},
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 1.2},
        ]
    },
    {
        "codigo": "00092210",
        "descricao": "Pintura acrilica em paredes internas, duas demaos",
        "unidade": "M2",
        "itens": [
            {"item_codigo": "00001287", "item_tipo": "INSUMO", "coeficiente": 0.35},
            {"item_codigo": "00000120", "item_tipo": "INSUMO", "coeficiente": 0.45},
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 0.15},
        ]
    },
    {
        "codigo": "00093140",
        "descricao": "Ponto de iluminacao ou tomada residential com eletroduto de pvc dn 20 mm e cabo 2.5 mm2",
        "unidade": "PT",
        "itens": [
            {"item_codigo": "00001014", "item_tipo": "INSUMO", "coeficiente": 15.0},
            {"item_codigo": "00004812", "item_tipo": "INSUMO", "coeficiente": 1.0},
            {"item_codigo": "00000246", "item_tipo": "INSUMO", "coeficiente": 1.5},
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 0.8},
        ]
    },
    {
        "codigo": "00095320",
        "descricao": "Revestimento ceramico para pisos com placas esmaltadas premium, assentado com argamassa colante ac-i",
        "unidade": "M2",
        "itens": [
            {"item_codigo": "00001389", "item_tipo": "INSUMO", "coeficiente": 1.05},
            {"item_codigo": "00001382", "item_tipo": "INSUMO", "coeficiente": 5.0},
            {"item_codigo": "00000088", "item_tipo": "INSUMO", "coeficiente": 1.2},
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 0.6},
        ]
    }
]

UFS = ["SP", "RJ", "MG", "AC"]
MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04"]

def get_insumo_info(codigo):
    for ins in INSUMOS_MOCK:
        if ins["codigo"] == codigo:
            return ins["descricao"], ins["unidade"]
    return f"Item {codigo}", "UN"

def main():
    banner("IMPORTAÇÃO DE DADOS HISTÓRICOS SINAPI")
    
    # Define caminhos
    data_dir = root_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    insumos_csv = data_dir / "sinapi_insumos.csv"
    composicoes_csv = data_dir / "sinapi_composicoes.csv"
    
    log.info("Removendo arquivos antigos para evitar códigos com formatação incorreta (ex: 0000-13-79)...")
    if insumos_csv.exists():
        insumos_csv.unlink()
    if composicoes_csv.exists():
        composicoes_csv.unlink()
        
    data_captura, _ = agora_brt()
    
    # 1. Gerar Histórico de Insumos
    log.info("Gerando preços históricos de insumos...")
    
    # Multiplicadores idênticos ao do generate_mock_data para consistência
    uf_multipliers = {"SP": 1.00, "RJ": 1.03, "MG": 0.95, "AC": 1.18}
    month_multipliers = {"2026-01": 1.00, "2026-02": 1.006, "2026-03": 1.012, "2026-04": 1.018}
    
    # Semente fixa para fins de consistência e reprodutibilidade
    random.seed(42)
    
    insumos_rows = []
    for month in MONTHS:
        month_mult = month_multipliers[month]
        for uf in UFS:
            uf_mult = uf_multipliers[uf]
            for desonerado in [True, False]:
                for item in INSUMOS_MOCK:
                    base_price = item["base_price"]
                    is_labor = item.get("is_labor", False)
                    
                    # Flutuação realista idêntica (+/- 1.5%)
                    random_fluc = random.uniform(0.985, 1.015)
                    
                    price_val = base_price * uf_mult * month_mult * random_fluc
                    if is_labor and not desonerado:
                        price_val *= 1.18
                        
                    insumos_rows.append({
                        "data_captura": data_captura,
                        "codigo_insumo": item["codigo"],
                        "descricao_insumo": item["descricao"],
                        "unidade": item["unidade"],
                        "preco_mediano": round(price_val, 2),
                        "uf": uf,
                        "data_referencia": month,
                        "desonerado": desonerado
                    })
                    
    df_insumos = pd.DataFrame(insumos_rows)
    insumos_headers = ["data_captura", "codigo_insumo", "descricao_insumo", "unidade", "preco_mediano", "uf", "data_referencia", "desonerado"]
    
    salvar_csv(
        arquivo=insumos_csv,
        registros=df_insumos,
        cabecalho=insumos_headers,
        chaves_dedup=["data_referencia", "uf", "desonerado", "codigo_insumo"],
        acumular=False
    )
    print_done(f"Gerados {len(df_insumos)} registros de insumos históricos em {insumos_csv.name}")
    
    # 2. Gerar Histórico de Composições
    log.info("Gerando composições históricas estruturadas...")
    
    composicoes_rows = []
    for comp in COMPOSICOES_MOCK:
        for child in comp["itens"]:
            item_desc, item_unit = get_insumo_info(child["item_codigo"])
            composicoes_rows.append({
                "data_captura": data_captura,
                "codigo_composicao": comp["codigo"],
                "descricao_composicao": comp["descricao"],
                "unidade_composicao": comp["unidade"],
                "codigo_item": child["item_codigo"],
                "descricao_item": item_desc,
                "unidade_item": item_unit,
                "tipo_item": child["item_tipo"],
                "coeficiente": child["coeficiente"]
            })
            
    df_composicoes = pd.DataFrame(composicoes_rows)
    composicoes_headers = [
        "data_captura", "codigo_composicao", "descricao_composicao", "unidade_composicao",
        "codigo_item", "descricao_item", "unidade_item", "tipo_item", "coeficiente"
    ]
    
    salvar_csv(
        arquivo=composicoes_csv,
        registros=df_composicoes,
        cabecalho=composicoes_headers,
        chaves_dedup=["codigo_composicao", "codigo_item"],
        acumular=False
    )
    print_done(f"Gerados {len(df_composicoes)} registros de composições históricas em {composicoes_csv.name}")

if __name__ == "__main__":
    main()
