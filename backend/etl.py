import os
import re
import zipfile
import glob
import pandas as pd
from sqlalchemy.orm import Session
from backend.db import engine, init_db, Insumo, Composicao, ComposicaoItem, PrecoInsumo

def find_header_row(df: pd.DataFrame, target_cols: list) -> int:
    """
    Scans the first 20 rows of the dataframe to find the header row containing target columns.
    """
    for idx in range(min(20, len(df))):
        row_vals = [str(val).strip().upper() for val in df.iloc[idx].values]
        matches = sum(1 for target in target_cols if any(target in val for val in row_vals))
        if matches >= 2:  # Found header if at least 2 column names match
            return idx
    return 0

def clean_code(val) -> str:
    """Cleans integer codes to standard strings (removing decimal formatting)."""
    if pd.isna(val):
        return ""
    val_str = str(val).split('.')[0].strip()
    # pad with zeros if numeric
    if val_str.isdigit():
        return val_str.zfill(8)
    return val_str

def parse_sinapi_zip(zip_path: str, db_session: Session, uf: str, data_referencia: str, desonerado: bool):
    """
    Extracts and parses Excel files from a SINAPI ZIP file and writes them to the DB.
    """
    print(f"Parsing ZIP: {zip_path} for {uf} - {data_referencia} (Desonerado: {desonerado})")
    
    # Create temp directory
    temp_dir = "backend/temp_extract"
    os.makedirs(temp_dir, exist_ok=True)
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(temp_dir)
        
    excel_files = glob.glob(f"{temp_dir}/**/*.xlsx", recursive=True) + glob.glob(f"{temp_dir}/**/*.xls", recursive=True)
    print("Found files:", excel_files)
    
    insumos_file = None
    composicoes_file = None
    
    for f in excel_files:
        name = os.path.basename(f).upper()
        if "INSUMO" in name:
            insumos_file = f
        elif "COMP" in name:
            composicoes_file = f
            
    # Process Insumos
    if insumos_file:
        print("Processing insumos from:", insumos_file)
        df = pd.read_excel(insumos_file)
        header_idx = find_header_row(df, ["CÓDIGO", "DESCRIÇÃO", "UNIDADE", "PREÇO"])
        
        # Reload with correct header row
        df = pd.read_excel(insumos_file, skiprows=header_idx)
        # Standardize column headers
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        # Map columns
        code_col = next((c for c in df.columns if "CÓDIGO" in c or "CODIGO" in c), None)
        desc_col = next((c for c in df.columns if "DESCRIÇÃO" in c or "DESCRICAO" in c), None)
        unit_col = next((c for c in df.columns if "UNIDADE" in c), None)
        price_col = next((c for c in df.columns if "PREÇO" in c or "PRECO" in c or "VALOR" in c), None)
        
        if code_col and desc_col:
            for _, row in df.iterrows():
                code = clean_code(row[code_col])
                if not code or len(code) < 3:
                    continue
                
                desc = str(row[desc_col]).strip()
                unit = str(row[unit_col]).strip() if unit_col and not pd.isna(row[unit_col]) else None
                
                # Check if Insumo exists
                insumo = db_session.query(Insumo).filter_by(codigo=code).first()
                if not insumo:
                    insumo = Insumo(codigo=code, descricao=desc, unidade=unit)
                    db_session.add(insumo)
                
                # Get price
                price_val = None
                if price_col and not pd.isna(row[price_col]):
                    try:
                        # Clean currency formats if string
                        if isinstance(row[price_col], str):
                            p_clean = row[price_col].replace("R$", "").replace(".", "").replace(",", ".").strip()
                            price_val = float(p_clean)
                        else:
                            price_val = float(row[price_col])
                    except:
                        pass
                
                # Update/Create price
                price_record = db_session.query(PrecoInsumo).filter_by(
                    insumo_codigo=code, uf=uf, data_referencia=data_referencia, desonerado=desonerado
                ).first()
                
                if not price_record:
                    price_record = PrecoInsumo(
                        insumo_codigo=code,
                        uf=uf,
                        data_referencia=data_referencia,
                        desonerado=desonerado,
                        preco=price_val
                    )
                    db_session.add(price_record)
                else:
                    price_record.preco = price_val
            db_session.commit()
            print("Insumos processed successfully.")
            
    # Process Composições
    if composicoes_file:
        print("Processing compositions from:", composicoes_file)
        df = pd.read_excel(composicoes_file)
        header_idx = find_header_row(df, ["COMPOSIÇÃO", "DESCRIÇÃO", "COEFICIENTE", "CÓDIGO"])
        
        df = pd.read_excel(composicoes_file, skiprows=header_idx)
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        comp_code_col = next((c for c in df.columns if "CÓDIGO COMPOSIÇÃO" in c or "CODIGO COMPOSICAO" in c or "COMPOSICAO" in c), None)
        comp_desc_col = next((c for c in df.columns if "DESCRIÇÃO COMPOSIÇÃO" in c or "DESCRICAO COMPOSICAO" in c), None)
        comp_unit_col = next((c for c in df.columns if "UNIDADE" in c and "ITEM" not in c), None)
        
        item_code_col = next((c for c in df.columns if "CÓDIGO ITEM" in c or "CODIGO ITEM" in c or "ITEM" in c), None)
        item_type_col = next((c for c in df.columns if "TIPO ITEM" in c or "TIPO" in c), None)
        coef_col = next((c for c in df.columns if "COEFICIENTE" in c), None)
        
        if comp_code_col and item_code_col:
            # Group by composition
            current_comp_code = None
            for _, row in df.iterrows():
                comp_code = clean_code(row[comp_code_col])
                if not comp_code:
                    continue
                
                # Check if composition changed
                if comp_code != current_comp_code:
                    current_comp_code = comp_code
                    comp_desc = str(row[comp_desc_col]).strip() if comp_desc_col else "Composição " + comp_code
                    comp_unit = str(row[comp_unit_col]).strip() if comp_unit_col and not pd.isna(row[comp_unit_col]) else None
                    
                    # Create/Update Composition
                    comp = db_session.query(Composicao).filter_by(codigo=comp_code).first()
                    if not comp:
                        comp = Composicao(codigo=comp_code, descricao=comp_desc, unidade=comp_unit)
                        db_session.add(comp)
                    else:
                        comp.descricao = comp_desc
                        comp.unidade = comp_unit
                    
                    # Clear old items to rebuild
                    db_session.query(ComposicaoItem).filter_by(composicao_codigo=comp_code).delete()
                    db_session.commit()
                
                # Add item
                item_code = clean_code(row[item_code_col])
                if not item_code:
                    continue
                    
                item_type = str(row[item_type_col]).strip().upper() if item_type_col and not pd.isna(row[item_type_col]) else "INSUMO"
                if "COMP" in item_type:
                    item_type_clean = "COMPOSICAO"
                else:
                    item_type_clean = "INSUMO"
                    
                coef = 0.0
                if coef_col and not pd.isna(row[coef_col]):
                    try:
                        coef = float(row[coef_col])
                    except:
                        pass
                
                comp_item = ComposicaoItem(
                    composicao_codigo=comp_code,
                    item_codigo=item_code,
                    item_tipo=item_type_clean,
                    coeficiente=coef
                )
                db_session.add(comp_item)
            db_session.commit()
            print("Compositions processed successfully.")
            
    # Clean up temp files
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    init_db()
    print("Database schema initialized.")
