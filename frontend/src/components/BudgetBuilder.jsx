import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Download, Receipt, Info, Hammer, Construction } from 'lucide-react';

export default function BudgetBuilder({ uf, month, desonerado }) {
  // Current items in budget: [{ codigo, tipo, quantidade }]
  const [budgetItems, setBudgetItems] = useState([
    { codigo: '00088316', tipo: 'COMPOSICAO', quantidade: 5.0 }, // 5m3 concrete column
    { codigo: '00089123', tipo: 'COMPOSICAO', quantidade: 45.0 }, // 45m2 brick wall
    { codigo: '00092210', tipo: 'COMPOSICAO', quantidade: 90.0 }, // 90m2 wall paint
    { codigo: '00001014', tipo: 'INSUMO', quantidade: 100.0 }     // 100m copper wire
  ]);

  // Calculated budget details from backend
  const [calculatedBudget, setCalculatedBudget] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states to add new item
  const [addItemType, setAddItemType] = useState('COMPOSICAO');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [addQty, setAddQty] = useState(1.0);
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. Calculate budget when items list or filters change
  useEffect(() => {
    if (budgetItems.length === 0) {
      setCalculatedBudget({ items: [], total_geral: 0 });
      return;
    }

    setLoading(true);
    axios.post('http://localhost:8000/api/budget', {
      items: budgetItems,
      uf: uf,
      month: month,
      desonerado: desonerado
    })
    .then(res => {
      setCalculatedBudget(res.data);
      setLoading(false);
    })
    .catch(err => {
      console.error("Error calculating budget:", err);
      setLoading(false);
    });
  }, [budgetItems, uf, month, desonerado]);

  // 2. Query autocomplete search results
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const endpoint = addItemType === 'INSUMO' ? 'insumos' : 'composicoes';
    axios.get(`http://localhost:8000/api/${endpoint}`, {
      params: {
        q: searchQuery,
        uf: uf,
        month: month,
        desonerado: desonerado,
        page: 1,
        limit: 8
      }
    })
    .then(res => {
      setSearchResults(res.data.items);
      setShowDropdown(true);
    })
    .catch(err => console.error("Error searching items:", err));
  }, [searchQuery, addItemType, uf, month, desonerado]);

  // Handle adding item
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    // Check if item already exists, if so update quantity
    const existingIndex = budgetItems.findIndex(i => i.codigo === selectedItem.codigo && i.tipo === addItemType);
    if (existingIndex > -1) {
      const updated = [...budgetItems];
      updated[existingIndex].quantidade += parseFloat(addQty);
      setBudgetItems(updated);
    } else {
      setBudgetItems([...budgetItems, {
        codigo: selectedItem.codigo,
        tipo: addItemType,
        quantidade: parseFloat(addQty)
      }]);
    }

    // Reset inputs
    setSearchQuery('');
    setSelectedItem(null);
    setAddQty(1.0);
    setShowDropdown(false);
  };

  // Handle removing item
  const handleRemoveItem = (codigo, tipo) => {
    setBudgetItems(budgetItems.filter(i => !(i.codigo === codigo && i.tipo === tipo)));
  };

  // Handle quantity change directly in table
  const handleQtyChange = (codigo, tipo, val) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) return;
    
    setBudgetItems(budgetItems.map(item => {
      if (item.codigo === codigo && item.tipo === tipo) {
        return { ...item, quantidade: parsed };
      }
      return item;
    }));
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!calculatedBudget || calculatedBudget.items.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Codigo,Tipo,Descricao,Unidade,Quantidade,Preco Unitario (R$),Preco Total (R$)\n";

    calculatedBudget.items.forEach(item => {
      const descEscaped = `"${item.descricao.replace(/"/g, '""')}"`;
      csvContent += `${item.codigo},${item.tipo},${descEscaped},${item.unidade},${item.quantidade},${item.preco_unitario.toFixed(2)},${item.preco_total.toFixed(2)}\n`;
    });

    csvContent += `,,,TOTAL GERAL,,,${calculatedBudget.total_geral.toFixed(2)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sinapi_orcamento_${uf}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="budget-grid">
      {/* Worksheet Column */}
      <div>
        {/* Adder Form */}
        <section className="toolbar-card" style={{ display: 'block', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} color="var(--accent-primary)" />
            Adicionar Item à Planilha
          </h3>
          
          <form onSubmit={handleAddItem} className="budget-adder-row">
            {/* Type selector */}
            <div className="filter-item">
              <span className="filter-label">Tipo</span>
              <select 
                className="select-control"
                value={addItemType}
                onChange={e => {
                  setAddItemType(e.target.value);
                  setSearchQuery('');
                  setSelectedItem(null);
                }}
              >
                <option value="COMPOSICAO">Composição (Serviço)</option>
                <option value="INSUMO">Insumo (Insumo)</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="filter-item" style={{ position: 'relative' }}>
              <span className="filter-label">Item / Código</span>
              <input
                type="text"
                placeholder={selectedItem ? `${selectedItem.codigo} - ${selectedItem.descricao.substring(0, 25)}...` : "Pesquise por código ou palavra..."}
                className="input-control"
                style={{ width: '100%' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
              />
              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div 
                  className="dark" 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '450px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 100,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}
                >
                  {searchResults.map(res => (
                    <div
                      key={res.codigo}
                      style={{
                        padding: '0.6rem 1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                      onClick={() => {
                        setSelectedItem(res);
                        setSearchQuery(`${res.codigo} - ${res.descricao}`);
                        setShowDropdown(false);
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-page)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = ''}
                    >
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{res.codigo}</strong> - <span style={{ textTransform: 'capitalize' }}>{res.descricao.toLowerCase()}</span> ({res.unidade})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="filter-item">
              <span className="filter-label">Quantidade</span>
              <input
                type="number"
                step="any"
                min="0.0001"
                className="input-control"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                required
              />
            </div>

            {/* Add Button */}
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={!selectedItem}
              style={{ height: '38px', whiteSpace: 'nowrap' }}
            >
              Adicionar
            </button>
          </form>
        </section>

        {/* Budget Table */}
        <section className="table-wrapper">
          {loading && !calculatedBudget ? (
            <div style={{ padding: '2rem' }}>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px', marginBottom: '1rem' }}></div>
              <div className="loading-skeleton" style={{ height: '30px' }}></div>
            </div>
          ) : !calculatedBudget || calculatedBudget.items.length === 0 ? (
            <div className="empty-state">
              <Receipt size={48} />
              <h3>Planilha Vazia</h3>
              <p>Adicione insumos ou composições acima para simular seu orçamento.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Código</th>
                  <th style={{ width: '80px' }}>Tipo</th>
                  <th>Descrição</th>
                  <th style={{ width: '80px' }}>Unid.</th>
                  <th style={{ width: '120px' }}>Quantidade</th>
                  <th style={{ width: '140px', textAlign: 'right' }}>Vl. Unitário</th>
                  <th style={{ width: '140px', textAlign: 'right' }}>Vl. Total</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {calculatedBudget.items.map(item => (
                  <tr key={`${item.codigo}-${item.tipo}`}>
                    <td className="font-mono-data">{item.codigo}</td>
                    <td>
                      <span 
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          padding: '0.15rem 0.35rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {item.tipo === 'INSUMO' ? <Hammer size={10} style={{marginRight: '2px'}} /> : <Construction size={10} style={{marginRight: '2px'}} />}
                        {item.tipo.substring(0, 4)}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{item.descricao.toLowerCase()}</td>
                    <td className="font-mono-data">{item.unidade}</td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        className="input-control"
                        style={{ width: '90px', padding: '0.25rem 0.5rem' }}
                        value={item.quantidade}
                        onChange={e => handleQtyChange(item.codigo, item.tipo, e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>R$ {item.preco_unitario.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>R$ {item.preco_total.toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn-icon" 
                        style={{ border: 'none', background: 'transparent', color: 'var(--danger)' }}
                        onClick={() => handleRemoveItem(item.codigo, item.tipo)}
                        title="Remover Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Summary Total Card Column */}
      <aside className="budget-total-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={18} />
          Resumo Geral
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Valor Total Previsto</span>
          <div className="budget-total-val">
            R$ {calculatedBudget ? calculatedBudget.total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Itens na Planilha:</span>
            <strong>{budgetItems.length}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Localidade:</span>
            <strong>{uf}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Competência:</span>
            <strong>{month}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Encargos Sociais:</span>
            <strong>{desonerado ? 'Desonerado' : 'Não Desonerado'}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <button 
          className="btn-primary" 
          disabled={!calculatedBudget || calculatedBudget.items.length === 0}
          onClick={handleExportCSV}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Download size={16} />
          Exportar Planilha (CSV)
        </button>

        <div className="alert-card info" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.75rem' }}>
            Altere os filtros globais de <strong>Estado (UF)</strong> e <strong>Referência</strong> no topo para ver os preços da planilha recalcularem automaticamente.
          </div>
        </div>
      </aside>
    </div>
  );
}
