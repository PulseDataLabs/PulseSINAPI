import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { X, Calendar, MapPin, Layers, Award, Tag } from 'lucide-react';

export default function DetailsPanel({ code, type, uf, month, desonerado, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoint = type === 'INSUMO' 
      ? `/api/insumos/${code}`
      : `/api/composicoes/${code}`;

    axios.get(endpoint, {
      params: { uf, month, desonerado }
    })
    .then(res => {
      setData(res.data);
      setLoading(false);
    })
    .catch(err => {
      console.error(`Error loading details for ${type} ${code}:`, err);
      setLoading(false);
    });
  }, [code, type, uf, month, desonerado]);

  if (loading) {
    return (
      <div className="details-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div className="loading-skeleton" style={{ height: '28px', width: '70%' }}></div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="loading-skeleton" style={{ height: '80px', marginBottom: '1rem' }}></div>
        <div className="loading-skeleton" style={{ height: '200px' }}></div>
      </div>
    );
  }

  if (!data) return null;

  // Option for Insumo Price History Chart
  const historyOption = type === 'INSUMO' ? {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e4e7',
      borderWidth: 1,
      textStyle: { color: '#09090b', fontFamily: 'DM Sans, sans-serif' }
    },
    grid: { left: '2%', right: '4%', bottom: '2%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.history.map(h => {
        const [year, mStr] = h.data_referencia.split('-');
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${months[parseInt(mStr) - 1]}/${year.substring(2)}`;
      }),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)', fontFamily: 'DM Sans', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      min: 'dataMin',
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      splitLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)', fontFamily: 'DM Sans', fontSize: 10 }
    },
    series: [
      {
        name: 'Preço R$',
        type: 'line',
        data: data.history.map(h => h.preco),
        color: '#2563eb',
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        smooth: true
      }
    ]
  } : null;

  return (
    <div className="details-card">
      <div className="details-header">
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Tag size={12} />
            {type === 'INSUMO' ? 'Insumo SINAPI' : 'Composição SINAPI'}
          </span>
          <h2 style={{ textTransform: 'capitalize', marginTop: '0.25rem' }}>
            {data.descricao.toLowerCase()}
          </h2>
        </div>
        <button className="btn-icon" onClick={onClose} title="Fechar Painel">
          <X size={16} />
        </button>
      </div>

      {/* Meta Specs Box */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Código</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>{data.codigo}</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Unidade</div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{data.unidade || 'UN'}</div>
        </div>
      </section>

      {/* Pricing / Cost Value Display */}
      <section className="details-meta-item" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <div className="label">
          {type === 'INSUMO' ? 'Preço Unitário Mediano' : 'Custo Unitário Total Calculado'}
        </div>
        <div className="value" style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            R$ {data.preco.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            per {data.unidade || 'UN'}
          </span>
        </div>
      </section>

      {/* Insumo Price History Chart */}
      {type === 'INSUMO' && data.history && data.history.length > 0 && (
        <article>
          <div className="details-section-title">Evolução do Preço ({uf})</div>
          <div style={{ height: '220px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', backgroundColor: 'var(--bg-page)' }}>
            <ReactECharts 
              option={historyOption} 
              style={{ height: '100%', width: '100%' }}
              theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
            />
          </div>
        </article>
      )}

      {/* Composition items breakdown */}
      {type === 'COMPOSICAO' && data.itens && (
        <article>
          <div className="details-section-title">Detalhamento dos Itens da Composição</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {data.itens.map(item => {
              const costPct = data.preco > 0 ? (item.preco_total / data.preco) * 100 : 0;
              // Sparkline color based on cost driver percentage
              let sparkColorClass = 'success';
              if (costPct > 30) sparkColorClass = 'danger';
              else if (costPct > 10) sparkColorClass = 'warning';

              return (
                <div 
                  key={item.item_codigo}
                  style={{
                    backgroundColor: 'var(--bg-page)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.8rem 1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div style={{ maxWidth: '75%' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{item.item_codigo}</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          {item.item_tipo.substring(0, 4)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', marginTop: '0.15rem' }}>
                        {item.descricao.toLowerCase()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>R$ {item.preco_total.toFixed(2)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {item.coeficiente.toFixed(4)} {item.unidade} x R$ {item.preco_unitario.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Sparkline indicating cost proportion */}
                  <div className="sparkline-container">
                    <div className="sparkline-track">
                      <div 
                        className={`sparkline-fill ${sparkColorClass}`} 
                        style={{ width: `${Math.min(100, costPct)}%` }}
                      ></div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', minWidth: '32px', textAlign: 'right' }}>
                      {costPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}

      {/* Context stamp */}
      <footer style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={10} />{uf}</span>
        <span>•</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Calendar size={10} />{month}</span>
        <span>•</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Layers size={10} />{desonerado ? 'Deson.' : 'Não-Deson.'}</span>
      </footer>
    </div>
  );
}
