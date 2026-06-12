import uvicorn
from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from backend.db import get_db, init_db, Insumo, Composicao, ComposicaoItem, PrecoInsumo

app = FastAPI(title="PulseSINAPI API", version="1.0.0")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; refine for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helpers for recursive cost calculation
def get_insumo_price(db: Session, insumo_code: str, uf: str, month: str, desonerado: bool) -> float:
    p = db.query(PrecoInsumo).filter_by(
        insumo_codigo=insumo_code, uf=uf, data_referencia=month, desonerado=desonerado
    ).first()
    return p.preco if p and p.preco is not None else 0.0

def get_composition_cost(db: Session, comp_code: str, uf: str, month: str, desonerado: bool, visited=None) -> float:
    if visited is None:
        visited = set()
    if comp_code in visited:
        return 0.0
    visited.add(comp_code)
    
    items = db.query(ComposicaoItem).filter_by(composicao_codigo=comp_code).all()
    total_cost = 0.0
    for item in items:
        if item.item_tipo == "INSUMO":
            price = get_insumo_price(db, item.item_codigo, uf, month, desonerado)
        else:
            price = get_composition_cost(db, item.item_codigo, uf, month, desonerado, visited)
        total_cost += item.coeficiente * price
    return total_cost

# Models for request body
class BudgetItemInput(BaseModel):
    codigo: str
    tipo: str  # 'INSUMO' or 'COMPOSICAO'
    quantidade: float

class BudgetCalculationInput(BaseModel):
    items: List[BudgetItemInput]
    uf: str = "SP"
    month: str = "2026-04"
    desonerado: bool = True

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/summary")
def get_summary(db: Session = Depends(get_db)):
    total_insumos = db.query(Insumo).count()
    total_composicoes = db.query(Composicao).count()
    
    # Query unique UFs and months
    ufs = [r[0] for r in db.query(PrecoInsumo.uf).distinct().order_by(PrecoInsumo.uf).all()]
    months = [r[0] for r in db.query(PrecoInsumo.data_referencia).distinct().order_by(PrecoInsumo.data_referencia).all()]
    
    return {
        "total_insumos": total_insumos,
        "total_composicoes": total_composicoes,
        "ufs": ufs if ufs else ["SP", "RJ", "MG", "AC"],
        "months": months if months else ["2026-01", "2026-02", "2026-03", "2026-04"],
        "default_uf": "SP",
        "default_month": months[-1] if months else "2026-04"
    }

@app.get("/api/insumos")
def list_insumos(
    q: Optional[str] = Query(None),
    uf: str = "SP",
    month: str = "2026-04",
    desonerado: bool = True,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1),
    db: Session = Depends(get_db)
):
    query = db.query(Insumo)
    
    if q:
        query = query.filter(
            or_(
                Insumo.codigo.like(f"%{q}%"),
                Insumo.descricao.like(f"%{q}%")
            )
        )
        
    total_count = query.count()
    insumos = query.offset((page - 1) * limit).limit(limit).all()
    
    result = []
    for insumo in insumos:
        price = get_insumo_price(db, insumo.codigo, uf, month, desonerado)
        result.append({
            "codigo": insumo.codigo,
            "descricao": insumo.descricao,
            "unidade": insumo.unidade,
            "preco": price
        })
        
    return {
        "items": result,
        "total_count": total_count,
        "page": page,
        "limit": limit
    }

@app.get("/api/insumos/{code}")
def get_insumo_detail(
    code: str,
    uf: str = "SP",
    month: str = "2026-04",
    desonerado: bool = True,
    db: Session = Depends(get_db)
):
    insumo = db.query(Insumo).filter_by(codigo=code).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
        
    current_price = get_insumo_price(db, code, uf, month, desonerado)
    
    # Query price history for line charts
    history_records = db.query(PrecoInsumo).filter_by(
        insumo_codigo=code, uf=uf, desonerado=desonerado
    ).order_by(PrecoInsumo.data_referencia).all()
    
    history = [{"data_referencia": r.data_referencia, "preco": r.preco} for r in history_records]
    
    return {
        "codigo": insumo.codigo,
        "descricao": insumo.descricao,
        "unidade": insumo.unidade,
        "preco": current_price,
        "history": history
    }

@app.get("/api/composicoes")
def list_composicoes(
    q: Optional[str] = Query(None),
    uf: str = "SP",
    month: str = "2026-04",
    desonerado: bool = True,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1),
    db: Session = Depends(get_db)
):
    query = db.query(Composicao)
    if q:
        query = query.filter(
            or_(
                Composicao.codigo.like(f"%{q}%"),
                Composicao.descricao.like(f"%{q}%")
            )
        )
        
    total_count = query.count()
    composicoes = query.offset((page - 1) * limit).limit(limit).all()
    
    result = []
    for comp in composicoes:
        total_cost = get_composition_cost(db, comp.codigo, uf, month, desonerado)
        result.append({
            "codigo": comp.codigo,
            "descricao": comp.descricao,
            "unidade": comp.unidade,
            "preco": round(total_cost, 2)
        })
        
    return {
        "items": result,
        "total_count": total_count,
        "page": page,
        "limit": limit
    }

@app.get("/api/composicoes/{code}")
def get_composition_detail(
    code: str,
    uf: str = "SP",
    month: str = "2026-04",
    desonerado: bool = True,
    db: Session = Depends(get_db)
):
    comp = db.query(Composicao).filter_by(codigo=code).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Composição não encontrada")
        
    total_cost = get_composition_cost(db, code, uf, month, desonerado)
    
    # Retrieve items breakdown
    items = db.query(ComposicaoItem).filter_by(composicao_codigo=code).all()
    
    breakdown = []
    for item in items:
        # Resolve item description and unit
        if item.item_tipo == "INSUMO":
            ins = db.query(Insumo).filter_by(codigo=item.item_codigo).first()
            desc = ins.descricao if ins else "Item Desconhecido"
            unit = ins.unidade if ins else "UN"
            preco_unit = get_insumo_price(db, item.item_codigo, uf, month, desonerado)
        else:
            sub_comp = db.query(Composicao).filter_by(codigo=item.item_codigo).first()
            desc = sub_comp.descricao if sub_comp else "Subcomposição Desconhecida"
            unit = sub_comp.unidade if sub_comp else "UN"
            preco_unit = get_composition_cost(db, item.item_codigo, uf, month, desonerado)
            
        preco_total = item.coeficiente * preco_unit
        breakdown.append({
            "item_codigo": item.item_codigo,
            "item_tipo": item.item_tipo,
            "descricao": desc,
            "unidade": unit,
            "coeficiente": item.coeficiente,
            "preco_unitario": round(preco_unit, 2),
            "preco_total": round(preco_total, 2)
        })
        
    return {
        "codigo": comp.codigo,
        "descricao": comp.descricao,
        "unidade": comp.unidade,
        "preco": round(total_cost, 2),
        "itens": breakdown
    }

@app.post("/api/budget")
def calculate_budget(input_data: BudgetCalculationInput, db: Session = Depends(get_db)):
    result_items = []
    total_budget = 0.0
    
    for input_item in input_data.items:
        codigo = input_item.codigo
        tipo = input_item.tipo
        qty = input_item.quantidade
        
        desc = ""
        unit = ""
        unit_cost = 0.0
        
        if tipo == "INSUMO":
            insumo = db.query(Insumo).filter_by(codigo=codigo).first()
            if insumo:
                desc = insumo.descricao
                unit = insumo.unidade
                unit_cost = get_insumo_price(db, codigo, input_data.uf, input_data.month, input_data.desonerado)
        else:
            comp = db.query(Composicao).filter_by(codigo=codigo).first()
            if comp:
                desc = comp.descricao
                unit = comp.unidade
                unit_cost = get_composition_cost(db, codigo, input_data.uf, input_data.month, input_data.desonerado)
                
        total_cost = qty * unit_cost
        total_budget += total_cost
        
        result_items.append({
            "codigo": codigo,
            "tipo": tipo,
            "descricao": desc if desc else "Não encontrado",
            "unidade": unit if unit else "UN",
            "quantidade": qty,
            "preco_unitario": round(unit_cost, 2),
            "preco_total": round(total_cost, 2)
        })
        
    return {
        "items": result_items,
        "total_geral": round(total_budget, 2),
        "uf": input_data.uf,
        "month": input_data.month,
        "desonerado": input_data.desonerado
    }

if __name__ == "__main__":
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
