import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { Search, Info, TrendingUp, TrendingDown, Layers, Hammer, Construction, Check } from 'lucide-react';

export default function UfCompareDashboard() {
  const [itemType, setItemType] = useState('INSUMO'); // INSUMO or COMPOSICAO
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  // Available UFs from API
  const [ufsList, setUfsList] = useState([]);
  const [selectedUfs, setSelectedUfs] = useState(['SP', 'RJ', 'MG', 'AC']);
  
  // Comparison data
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [desonerado, setDesonerado] = useState(true);

  const colors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
    "#14b8a6", "#f43f5e", "#a855f7", "#06b6d4", "#eab308"
  ];

  // Fetch available UFs on mount
  useEffect(() => {
    axios.get('/api/summary')
      .then(res => {
        setUfsList(res.data.ufs || ['SP', 'RJ', 'MG', 'AC', 'DF', 'CE', 'BA', 'PE']);
      })
      .catch(err => console.error("Error fetching summary stats:", err));
  }, []);

  // Search items based on type
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setLoadingSearch(true);
    const endpoint = itemType === 'INSUMO' ? 'insumos' : 'composicoes';
    
    axios.get(`/api/${endpoint}`, {
      params: {
        q: searchQuery,
        page: 1,
        limit: 8
      }
    })
    .then(res => {
      setSearchResults(res.data.items);
      setShowDropdown(true);
      setLoadingSearch(false);
    })
    .catch(err => {
      console.error("Error searching items:", err);
      setLoadingSearch(false);
    });
  }, [searchQuery, itemType]);

  // Load comparison data when selectedItem, selectedUfs or desonerado changes
  const loadComparison = () => {
    if (!selectedItem) return;

    setLoadingCompare(true);
    const endpoint = itemType === 'INSUMO' ? 'insumos' : 'composicoes';
    const ufsParam = selectedUfs.join(',');

    axios.get(`/api/${endpoint}/${selectedItem.codigo}/compare`, {
      params: {
        ufs: ufsParam,
        desonerado: desonerado
      }
    })
    .then(res => {
      setComparisonData(res.data);
      setLoadingCompare(false);
    })
    .catch(err => {
      console.error("Error loading comparison details:", err);
      setLoadingCompare(false);
    });
  };

  useEffect(() => {
    if (selectedItem) {
      loadComparison();
    }
  }, [selectedItem, desonerado]); // Trigger automatically when item or desonerado changes

  const handleSelectUf = (uf) => {
    let updated;
    if (selectedUfs.includes(uf)) {
      if (selectedUfs.length === 1) return; // Keep at least one
      updated = selectedUfs.filter(x => x !== uf);
    } else {
      updated = [...selectedUfs, uf];
    }
    setSelectedUfs(updated);
  };

  // Build chart configuration
  const getChartOption = () => {
    if (!comparisonData || !comparisonData.comparisons) return {};

    const comparisons = comparisonData.comparisons;
    const ufs = Object.keys(comparisons);
    
    // Find all distinct months/references across all selected UFs and sort them
    const allMonths = Array.from(
      new Set(
        ufs.flatMap(uf => comparisons[uf].map(r => r.data_referencia))
      )
    ).sort();

    const series = ufs.map((uf, idx) => {
      // Map data references correctly to match coordinates on the x-axis
      const dataPoints = allMonths.map(month => {
        const record = comparisons[uf].find(r => r.data_referencia === month);
        return record ? record.preco : null;
      });

      return {
        name: uf,
        type: 'line',
        data: dataPoints,
        color: colors[idx % colors.length],
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        smooth: true,
        connectNulls: true
      };
    });

    const formattedMonths = allMonths.map(month => {
      const [year, monthStr] = month.split('-');
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${months[parseInt(monthStr) - 1]}/${year.substring(2)}`;
    });

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e4e4e7',
        borderWidth: 1,
        textStyle: { color: '#09090b', fontFamily: 'DM Sans, sans-serif' }
      },
      legend: {
        data: ufs,
        textStyle: { color: 'var(--text-primary)' },
        top: 0
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: formattedMonths,
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
        axisLabel: { color: 'var(--text-secondary)', fontFamily: 'DM Sans', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        name: `Valor (${comparisonData.unidade || 'UN'})`,
        nameTextStyle: { color: 'var(--text-secondary)' },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
        splitLine: { lineStyle: { color: 'var(--border-color)' } },
        axisLabel: { color: 'var(--text-secondary)', fontFamily: 'DM Sans', fontSize: 11 }
      },
      series: series
    };
  };

  // Compile table metrics
  const getTableMetrics = () => {
    if (!comparisonData || !comparisonData.comparisons) return [];

    const comparisons = comparisonData.comparisons;
    return Object.keys(comparisons).map(uf => {
      const records = comparisons[uf].filter(r => r.preco !== null && r.preco > 0);
      if (records.length === 0) {
        return { uf, initial: '-', final: '-', diffVal: 0, diffPct: 0, noData: true };
      }
      
      // Sort to get first and last references
      records.sort((a, b) => a.data_referencia.localeCompare(b.data_referencia));
      const initialRecord = records[0];
      const finalRecord = records[records.length - 1];
      
      const initial = initialRecord.preco;
      const final = finalRecord.preco;
      const diffVal = final - initial;
      const diffPct = initial > 0 ? (diffVal / initial) * 100 : 0;

      return {
        uf,
        initial,
        initialMonth: initialRecord.data_referencia,
        final,
        finalMonth: finalRecord.data_referencia,
        diffVal,
        diffPct,
        noData: false
      };
    }).sort((a, b) => b.diffPct - a.diffPct); // Sort by highest inflation driver
  };

  const tableMetrics = getTableMetrics();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Selector Toolbar */}
      <section className="toolbar-card" style={{ display: 'block', padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          
          {/* Toggle Type & Search */}
          <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            
            <div className="filter-item">
              <span className="filter-label">Referencial</span>
              <div className="segmented-control">
                <button 
                  className={`segment-btn ${itemType === 'INSUMO' ? 'active' : ''}`}
                  onClick={() => {
                    setItemType('INSUMO');
                    setSearchQuery('');
                    setSelectedItem(null);
                    setComparisonData(null);
                  }}
                >
                  <Hammer size={12} style={{ marginRight: '4px', display: 'inline' }} />
                  Insumo
                </button>
                <button 
                  className={`segment-btn ${itemType === 'COMPOSICAO' ? 'active' : ''}`}
                  onClick={() => {
                    setItemType('COMPOSICAO');
                    setSearchQuery('');
                    setSelectedItem(null);
                    setComparisonData(null);
                  }}
                >
                  <Construction size={12} style={{ marginRight: '4px', display: 'inline' }} />
                  Composição
                </button>
              </div>
            </div>

            <div className="filter-item" style={{ position: 'relative', flexGrow: 1 }}>
              <span className="filter-label">Pesquisar Item</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="text"
                  placeholder={selectedItem ? `${selectedItem.codigo} - ${selectedItem.descricao.substring(0, 35)}...` : `Pesquise por código ou descrição de ${itemType.toLowerCase()}...`}
                  className="input-control"
                  style={{ paddingLeft: '38px', width: '100%' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                />
              </div>

              {/* Search dropdown list */}
              {showDropdown && searchResults.length > 0 && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
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
          </div>

          {/* Social charges selector */}
          <div className="filter-item">
            <span className="filter-label">Encargos Sociais</span>
            <div className="segmented-control">
              <button 
                className={`segment-btn ${desonerado ? 'active' : ''}`}
                onClick={() => setDesonerado(true)}
              >
                Deson.
              </button>
              <button 
                className={`segment-btn ${!desonerado ? 'active' : ''}`}
                onClick={() => setDesonerado(false)}
              >
                Não Deson.
              </button>
            </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={loadComparison}
            disabled={!selectedItem || selectedUfs.length === 0}
            style={{ height: '38px' }}
          >
            Atualizar Comparação
          </button>
        </div>

        {/* 2. UF Selection checkboxes */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <span className="filter-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Selecionar Estados para Comparação</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ufsList.map(uf => {
              const active = selectedUfs.includes(uf);
              return (
                <button
                  key={uf}
                  onClick={() => handleSelectUf(uf)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'var(--transition-smooth)',
                    backgroundColor: active ? 'var(--accent-bg)' : 'var(--bg-page)',
                    borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
                    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  {active && <Check size={12} />}
                  {uf}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard Analysis Panels */}
      {!selectedItem ? (
        <div className="empty-state" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <Layers size={48} />
          <h3>Nenhum Item Selecionado</h3>
          <p>Utilize o campo de busca acima para selecionar um Insumo ou Composição e analisar a variação de custo nacional.</p>
        </div>
      ) : loadingCompare ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="loading-skeleton" style={{ height: '350px', width: '100%', borderRadius: '12px' }}></div>
          <div className="loading-skeleton" style={{ height: '250px', width: '100%', borderRadius: '12px' }}></div>
        </div>
      ) : !comparisonData ? (
        <div className="empty-state">
          <Info size={48} />
          <h3>Erro ao Carregar Dados</h3>
          <p>Tente refazer a busca ou atualizar a comparação.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Title Header Card */}
          <article className="chart-container-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="kpi-icon-wrapper" style={{ padding: '0.5rem' }}>
                {itemType === 'INSUMO' ? <Hammer size={20} /> : <Construction size={20} />}
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Código: {comparisonData.codigo} · Unidade: {comparisonData.unidade || 'UN'}
                </span>
                <h3 style={{ textTransform: 'capitalize', fontSize: '1.25rem', fontWeight: 800 }}>
                  {comparisonData.descricao.toLowerCase()}
                </h3>
              </div>
            </div>
          </article>

          {/* Line Chart */}
          <article className="chart-container-card">
            <div className="chart-header">
              <h3>Evolução Comparativa Regional</h3>
              <p>Histórico mensal dos custos do item nas Unidades Federativas selecionadas</p>
            </div>
            <div style={{ height: '360px' }}>
              <ReactECharts 
                option={getChartOption()} 
                style={{ height: '100%', width: '100%' }}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
              />
            </div>
          </article>

          {/* Inflation Metrics Table */}
          <article className="table-wrapper">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Resumo de Variabilidade e Inflação</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Variação de preço comparativa ordenada pela maior inflação acumulada</p>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>UF</th>
                  <th style={{ width: '180px' }}>Ref. Inicial</th>
                  <th style={{ width: '180px' }}>Ref. Final</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Variação Absoluta</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Inflação Acumulada</th>
                </tr>
              </thead>
              <tbody>
                {tableMetrics.map(metric => {
                  if (metric.noData) {
                    return (
                      <tr key={metric.uf}>
                        <td className="font-mono-data" style={{ fontWeight: 'bold' }}>{metric.uf}</td>
                        <td colSpan="4" style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem' }}>Sem registros de preços no banco de dados</td>
                      </tr>
                    );
                  }
                  
                  const isUp = metric.diffVal > 0;
                  const isZero = metric.diffVal === 0;

                  return (
                    <tr key={metric.uf}>
                      <td className="font-mono-data" style={{ fontWeight: 'bold' }}>{metric.uf}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>R$ {metric.initial.toFixed(2)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mês ref: {metric.initialMonth}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>R$ {metric.final.toFixed(2)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mês ref: {metric.finalMonth}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '500' }}>
                        <span style={{ color: isZero ? 'inherit' : isUp ? 'var(--danger)' : 'var(--success)' }}>
                          {isZero ? '' : isUp ? '+' : ''}R$ {metric.diffVal.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span 
                          className={`kpi-trend ${isZero ? '' : isUp ? 'negative' : 'positive'}`}
                          style={{ margin: 0, display: 'inline-flex' }}
                        >
                          {isZero ? null : isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {metric.diffPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        </div>
      )}
    </div>
  );
}
