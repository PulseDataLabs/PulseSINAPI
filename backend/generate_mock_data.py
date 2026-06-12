import random
from sqlalchemy.orm import Session
from backend.db import engine, init_db, Insumo, Composicao, ComposicaoItem, PrecoInsumo, SessionLocal

# Sample standard materials and unit prices
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
            {"item_codigo": "00001379", "item_tipo": "INSUMO", "coeficiente": 350.0}, # 350 kg cement
            {"item_codigo": "00000370", "item_tipo": "INSUMO", "coeficiente": 0.65}, # 0.65 m3 sand
            {"item_codigo": "00004721", "item_tipo": "INSUMO", "coeficiente": 0.75}, # 0.75 m3 gravel
            {"item_codigo": "00000088", "item_tipo": "INSUMO", "coeficiente": 2.5},   # 2.5 h mason
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 6.0},   # 6.0 h helper
        ]
    },
    {
        "codigo": "00089123",
        "descricao": "Alvenaria de vedacao com tijolo ceramico macico comum, espessura 10 cm, assentado com argamassa",
        "unidade": "M2",
        "itens": [
            {"item_codigo": "00007258", "item_tipo": "INSUMO", "coeficiente": 0.08},  # 80 bricks (0.08 of a MIL)
            {"item_codigo": "00001379", "item_tipo": "INSUMO", "coeficiente": 12.0},  # 12 kg cement
            {"item_codigo": "00000370", "item_tipo": "INSUMO", "coeficiente": 0.04},  # 0.04 m3 sand
            {"item_codigo": "00000088", "item_tipo": "INSUMO", "coeficiente": 1.8},   # 1.8 h mason
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 1.2},   # 1.2 h helper
        ]
    },
    {
        "codigo": "00092210",
        "descricao": "Pintura acrilica em paredes internas, duas demaos",
        "unidade": "M2",
        "itens": [
            {"item_codigo": "00001287", "item_tipo": "INSUMO", "coeficiente": 0.35},  # 0.35 L latex paint
            {"item_codigo": "00000120", "item_tipo": "INSUMO", "coeficiente": 0.45},  # 0.45 h painter
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 0.15},  # 0.15 h helper
        ]
    },
    {
        "codigo": "00093140",
        "descricao": "Ponto de iluminacao ou tomada residencial com eletroduto de pvc dn 20 mm e cabo 2.5 mm2",
        "unidade": "PT",
        "itens": [
            {"item_codigo": "00001014", "item_tipo": "INSUMO", "coeficiente": 15.0},  # 15 m copper wire
            {"item_codigo": "00004812", "item_tipo": "INSUMO", "coeficiente": 1.0},   # 1 breaker
            {"item_codigo": "00000246", "item_tipo": "INSUMO", "coeficiente": 1.5},   # 1.5 h electrician
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 0.8},   # 0.8 h helper
        ]
    },
    {
        "codigo": "00095320",
        "descricao": "Revestimento ceramico para pisos com placas esmaltadas premium, assentado com argamassa colante ac-i",
        "unidade": "M2",
        "itens": [
            {"item_codigo": "00001389", "item_tipo": "INSUMO", "coeficiente": 1.05},  # 1.05 m2 ceramic tiles
            {"item_codigo": "00001382", "item_tipo": "INSUMO", "coeficiente": 5.0},   # 5 kg mortar
            {"item_codigo": "00000088", "item_tipo": "INSUMO", "coeficiente": 1.2},   # 1.2 h mason
            {"item_codigo": "00006111", "item_tipo": "INSUMO", "coeficiente": 0.6},   # 0.6 h helper
        ]
    }
]

UFS = ["SP", "RJ", "MG", "AC"]
MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04"]

def generate_mock_data():
    init_db()
    db = SessionLocal()
    
    print("Seeding insumos...")
    for item in INSUMOS_MOCK:
        insumo = db.query(Insumo).filter_by(codigo=item["codigo"]).first()
        if not insumo:
            insumo = Insumo(codigo=item["codigo"], descricao=item["descricao"], unidade=item["unidade"])
            db.add(insumo)
    db.commit()

    print("Seeding compositions & composition items...")
    for comp_data in COMPOSICOES_MOCK:
        comp = db.query(Composicao).filter_by(codigo=comp_data["codigo"]).first()
        if not comp:
            comp = Composicao(codigo=comp_data["codigo"], descricao=comp_data["descricao"], unidade=comp_data["unidade"])
            db.add(comp)
            db.commit()
            
            for child in comp_data["itens"]:
                comp_item = ComposicaoItem(
                    composicao_codigo=comp_data["codigo"],
                    item_codigo=child["item_codigo"],
                    item_tipo=child["item_tipo"],
                    coeficiente=child["coeficiente"]
                )
                db.add(comp_item)
            db.commit()

    print("Seeding pricing history per state and month...")
    # SP base = 100%, RJ = 103%, MG = 95%, AC = 118% (logistics premium)
    uf_multipliers = {"SP": 1.00, "RJ": 1.03, "MG": 0.95, "AC": 1.18}
    
    # Monthly inflation: Jan = 100%, Feb = 100.6%, Mar = 101.2%, Apr = 101.8%
    month_multipliers = {"2026-01": 1.00, "2026-02": 1.006, "2026-03": 1.012, "2026-04": 1.018}

    # Desonerado vs. Não Desonerado (Não Desonerado labor has payroll taxes included, ~18% higher)
    # Materials are the same price for both
    
    for month in MONTHS:
        month_mult = month_multipliers[month]
        for uf in UFS:
            uf_mult = uf_multipliers[uf]
            
            for item in INSUMOS_MOCK:
                base_price = item["base_price"]
                is_labor = item.get("is_labor", False)
                
                # Introduce slight random fluctuation (+/- 1.5%) for realism
                random_fluc = random.uniform(0.985, 1.015)
                
                for desonerado in [True, False]:
                    price_val = base_price * uf_mult * month_mult * random_fluc
                    
                    if is_labor:
                        # Labor costs are higher in Não Desonerado (desonerado = False)
                        if not desonerado:
                            price_val *= 1.18
                    
                    # Create price entry
                    price_record = db.query(PrecoInsumo).filter_by(
                        insumo_codigo=item["codigo"],
                        uf=uf,
                        data_referencia=month,
                        desonerado=desonerado
                    ).first()
                    
                    if not price_record:
                        price_record = PrecoInsumo(
                            insumo_codigo=item["codigo"],
                            uf=uf,
                            data_referencia=month,
                            desonerado=desonerado,
                            preco=round(price_val, 2)
                        )
                        db.add(price_record)
                    else:
                        price_record.preco = round(price_val, 2)
                        
            db.commit()
            
    db.close()
    print("Database seeded with realistic SINAPI mock data successfully!")

if __name__ == "__main__":
    generate_mock_data()
