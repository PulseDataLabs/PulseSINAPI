import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info } from 'lucide-react';
import DetailsPanel from './DetailsPanel';

export default function ComposicoesTable({ uf, month, desonerado }) {
  const [composicoes, setComposicoes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCompCode, setSelectedCompCode] = useState(null);

  const pageSize = 15;

  const fetchComposicoes = () => {
    setLoading(true);
    axios.get(`/api/composicoes`, {
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
      setComposicoes(res.data.items);
      setTotalCount(res.data.total_count);
      setLoading(false);
    })
    .catch(err => {
      console.error("Error loading compositions:", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchComposicoes();
  }, [uf, month, desonerado, currentPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchComposicoes();
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
              placeholder="Pesquise composições por código ou descrição... (Pressione Enter para buscar)"
              className="input-control search"
              style={{ paddingLeft: '38px', width: '100%' }}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button className="btn-primary" onClick={fetchComposicoes}>
            Buscar
          </button>
        </div>
      </section>

      {/* Main Split Layout */}
      <section className={`content-layout ${selectedCompCode ? 'split' : ''}`}>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem' }}>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px' }}></div>
            </div>
          ) : composicoes.length === 0 ? (
            <div className="empty-state">
              <Info size={48} />
              <h3>Nenhuma composição encontrada</h3>
              <p>Tente ajustar sua busca ou mudar os filtros no cabeçalho.</p>
            </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Código</th>
                    <th>Descrição do Serviço</th>
                    <th style={{ width: '100px' }}>Unidade</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Custo Unitário</th>
                  </tr>
                </thead>
                <tbody>
                  {composicoes.map(comp => (
                    <tr 
                      key={comp.codigo}
                      className={`clickable ${selectedCompCode === comp.codigo ? 'active' : ''}`}
                      onClick={() => setSelectedCompCode(comp.codigo === selectedCompCode ? null : comp.codigo)}
                    >
                      <td className="font-mono-data">{comp.codigo}</td>
                      <td style={{ textTransform: 'capitalize' }}>{comp.descricao.toLowerCase()}</td>
                      <td className="font-mono-data">{comp.unidade || 'UN'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        R$ {comp.preco.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Pagination */}
              <div className="table-footer">
                <span className="pagination-info">
                  Exibindo <strong>{(currentPage - 1) * pageSize + 1}</strong> a <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> de <strong>{totalCount}</strong> composições
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

        {/* Details Panel side drawer */}
        {selectedCompCode && (
          <div className="details-wrapper">
            <DetailsPanel
              code={selectedCompCode}
              type="COMPOSICAO"
              uf={uf}
              month={month}
              desonerado={desonerado}
              onClose={() => setSelectedCompCode(null)}
            />
          </div>
        )}
      </section>
    </div>
  );
}
