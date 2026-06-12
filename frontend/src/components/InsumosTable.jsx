import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info } from 'lucide-react';
import DetailsPanel from './DetailsPanel';

export default function InsumosTable({ uf, month, desonerado }) {
  const [insumos, setInsumos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedInsumoCode, setSelectedInsumoCode] = useState(null);

  const pageSize = 15;

  const fetchInsumos = () => {
    setLoading(true);
    axios.get(`http://localhost:8000/api/insumos`, {
      params: {
        q: searchQuery,
        uf: uf,
        month: month,
        desonerado: desonerado,
        page: currentPage,
        limit: pageSize
      }
    })
    .then(res => {
      setInsumos(res.data.items);
      setTotalCount(res.data.total_count);
      setLoading(false);
    })
    .catch(err => {
      console.error("Error loading insumos:", err);
      setLoading(false);
    });
  };

  // Fetch when filters or page change
  useEffect(() => {
    fetchInsumos();
  }, [uf, month, desonerado, currentPage]);

  // Handle search submit/change (debounced or on enter)
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset page on new search
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchInsumos();
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div>
      {/* Search Toolbar */}
      <section className="toolbar-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <div style={{ position: 'relative', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Search 
              size={18} 
              color="var(--text-secondary)" 
              style={{ position: 'absolute', left: '12px' }} 
            />
            <input
              type="text"
              placeholder="Pesquise insumos por código ou descrição... (Pressione Enter para buscar)"
              className="input-control search"
              style={{ paddingLeft: '38px', width: '100%' }}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button className="btn-primary" onClick={fetchInsumos}>
            Buscar
          </button>
        </div>
      </section>

      {/* Main Table & Slide Panel Layout */}
      <section className={`content-layout ${selectedInsumoCode ? 'split' : ''}`}>
        {/* Table Column */}
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem' }}>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px' }}></div>
            </div>
          ) : insumos.length === 0 ? (
            <div className="empty-state">
              <Info size={48} />
              <h3>Nenhum insumo encontrado</h3>
              <p>Tente ajustar sua busca ou mudar os filtros no cabeçalho.</p>
            </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Código</th>
                    <th>Descrição</th>
                    <th style={{ width: '100px' }}>Unidade</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Preço Unitário</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map(insumo => (
                    <tr 
                      key={insumo.codigo}
                      className={`clickable ${selectedInsumoCode === insumo.codigo ? 'active' : ''}`}
                      onClick={() => setSelectedInsumoCode(insumo.codigo === selectedInsumoCode ? null : insumo.codigo)}
                    >
                      <td className="font-mono-data">{insumo.codigo}</td>
                      <td style={{ textTransform: 'capitalize' }}>{insumo.descricao.toLowerCase()}</td>
                      <td className="font-mono-data">{insumo.unidade || 'UN'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        {insumo.preco > 0 ? `R$ ${insumo.preco.toFixed(2)}` : 'Sem Coleta'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Pagination */}
              <div className="table-footer">
                <span className="pagination-info">
                  Exibindo <strong>{(currentPage - 1) * pageSize + 1}</strong> a <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> de <strong>{totalCount}</strong> insumos
                </span>
                
                <div className="pagination-controls">
                  <button 
                    className="btn-page"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="Primeira Página"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button 
                    className="btn-page"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    title="Página Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ alignSelf: 'center', margin: '0 0.5rem', fontSize: '0.85rem' }}>
                    Página <strong>{currentPage}</strong> de {totalPages}
                  </span>
                  <button 
                    className="btn-page"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    title="Próxima Página"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button 
                    className="btn-page"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Última Página"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Side Details Drawer */}
        {selectedInsumoCode && (
          <div className="details-wrapper">
            <DetailsPanel
              code={selectedInsumoCode}
              type="INSUMO"
              uf={uf}
              month={month}
              desonerado={desonerado}
              onClose={() => setSelectedInsumoCode(null)}
            />
          </div>
        )}
      </section>
    </div>
  );
}
