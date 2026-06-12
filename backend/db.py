import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, Index
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///backend/sinapi.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Insumo(Base):
    __tablename__ = "insumos"
    
    codigo = Column(String, primary_key=True, index=True)
    descricao = Column(String, nullable=False)
    unidade = Column(String, nullable=True)
    
    precos = relationship("PrecoInsumo", back_populates="insumo", cascade="all, delete-orphan")

class Composicao(Base):
    __tablename__ = "composicoes"
    
    codigo = Column(String, primary_key=True, index=True)
    descricao = Column(String, nullable=False)
    unidade = Column(String, nullable=True)
    
    itens = relationship("ComposicaoItem", back_populates="composicao", cascade="all, delete-orphan")

class ComposicaoItem(Base):
    __tablename__ = "composicao_itens"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    composicao_codigo = Column(String, ForeignKey("composicoes.codigo"), nullable=False, index=True)
    item_codigo = Column(String, nullable=False, index=True)
    item_tipo = Column(String, nullable=False)  # 'INSUMO' or 'COMPOSICAO'
    coeficiente = Column(Float, nullable=False)
    
    composicao = relationship("Composicao", back_populates="itens")

class PrecoInsumo(Base):
    __tablename__ = "preco_insumos"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    insumo_codigo = Column(String, ForeignKey("insumos.codigo"), nullable=False, index=True)
    uf = Column(String(2), nullable=False, index=True)
    data_referencia = Column(String(7), nullable=False, index=True)  # YYYY-MM
    desonerado = Column(Boolean, nullable=False, index=True)
    preco = Column(Float, nullable=True)
    
    insumo = relationship("Insumo", back_populates="precos")

# Index for fast lookup of pricing combinations
Index("idx_preco_lookup", PrecoInsumo.insumo_codigo, PrecoInsumo.uf, PrecoInsumo.data_referencia, PrecoInsumo.desonerado, unique=True)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
