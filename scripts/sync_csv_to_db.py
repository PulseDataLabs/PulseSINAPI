# coding: utf-8
"""
scripts/sync_csv_to_db.py
-------------------------
Script utilitário para sincronizar as bases flat CSV de insumos e composições
com o banco de dados relacional SQLite usado pelo backend da aplicação web
usando inserções em lote (bulk inserts) para máxima velocidade.
"""

import sys
import pandas as pd
from pathlib import Path

# Ajusta sys.path para permitir importações a partir do diretório raiz
root_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root_dir))

from backend.db import SessionLocal, init_db, Insumo, Composicao, ComposicaoItem, PrecoInsumo

def sync():
    db = SessionLocal()
    init_db()
    
    # 1. Sincronizar Insumos e Preços
    insumos_csv = root_dir / "data" / "sinapi_insumos.csv"
    if insumos_csv.exists():
        print(f"Lendo base flat de insumos: {insumos_csv.name}...")
        df = pd.read_csv(insumos_csv, dtype=str)
        
        # Padronizar códigos com 8 dígitos
        df["codigo_insumo"] = df["codigo_insumo"].astype(str).str.zfill(8)
        
        # Limpar e recriar insumos únicos em lote
        unique_insumos = df[["codigo_insumo", "descricao_insumo", "unidade"]].drop_duplicates(subset=["codigo_insumo"])
        print(f"Sincronizando {len(unique_insumos)} registros únicos de insumos...")
        
        # Deletar insumos antigos
        db.query(Insumo).delete()
        db.commit()
        
        insumo_mappings = []
        for _, row in unique_insumos.iterrows():
            insumo_mappings.append({
                "codigo": row["codigo_insumo"],
                "descricao": row["descricao_insumo"],
                "unidade": row["unidade"] if pd.notna(row["unidade"]) else "UN"
            })
        db.bulk_insert_mappings(Insumo, insumo_mappings)
        db.commit()
        
        # Limpar e recriar preços em lote
        print(f"Sincronizando {len(df)} registros de preços históricos...")
        db.query(PrecoInsumo).delete()
        db.commit()
        
        price_mappings = []
        for _, row in df.iterrows():
            try:
                preco = float(row["preco_mediano"])
            except:
                preco = 0.0
            price_mappings.append({
                "insumo_codigo": row["codigo_insumo"],
                "uf": row["uf"].upper(),
                "data_referencia": row["data_referencia"],
                "desonerado": str(row["desonerado"]).lower() == "true",
                "preco": preco
            })
        db.bulk_insert_mappings(PrecoInsumo, price_mappings)
        db.commit()
        print("Tabela de preços sincronizada.")
        
    # 2. Sincronizar Composições e Itens constituintes
    composicoes_csv = root_dir / "data" / "sinapi_composicoes.csv"
    if composicoes_csv.exists():
        print(f"Lendo base flat de composições: {composicoes_csv.name}...")
        df = pd.read_csv(composicoes_csv, dtype=str)
        
        # Padronizar códigos com 8 dígitos
        df["codigo_composicao"] = df["codigo_composicao"].astype(str).str.zfill(8)
        df["codigo_item"] = df["codigo_item"].astype(str).str.zfill(8)
        
        # Limpar e recriar composições em lote
        unique_comps = df[["codigo_composicao", "descricao_composicao", "unidade_composicao"]].drop_duplicates(subset=["codigo_composicao"])
        print(f"Sincronizando {len(unique_comps)} composições principais...")
        
        db.query(Composicao).delete()
        db.commit()
        
        comp_mappings = []
        for _, row in unique_comps.iterrows():
            comp_mappings.append({
                "codigo": row["codigo_composicao"],
                "descricao": row["descricao_composicao"],
                "unidade": row["unidade_composicao"] if pd.notna(row["unidade_composicao"]) else "UN"
            })
        db.bulk_insert_mappings(Composicao, comp_mappings)
        db.commit()
        
        # Limpar e recriar itens em lote
        print(f"Sincronizando {len(df)} coeficientes/detalhes de composição...")
        db.query(ComposicaoItem).delete()
        db.commit()
        
        item_mappings = []
        for _, row in df.iterrows():
            try:
                coef = float(row["coeficiente"])
            except:
                coef = 0.0
            item_mappings.append({
                "composicao_codigo": row["codigo_composicao"],
                "item_codigo": row["codigo_item"],
                "item_tipo": row["tipo_item"].upper(),
                "coeficiente": coef
            })
        db.bulk_insert_mappings(ComposicaoItem, item_mappings)
        db.commit()
        print("Tabela de coeficientes de composições sincronizada.")
        
    db.close()
    print("Sincronização com o banco sinapi.db concluída com sucesso!")

if __name__ == "__main__":
    sync()
