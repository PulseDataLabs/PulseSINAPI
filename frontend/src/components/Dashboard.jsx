import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { Hammer, CircleDollarSign, TrendingUp, Layers } from 'lucide-react';

export default function Dashboard({ uf, month, desonerado }) {
  const [kpis, setKpis] = useState({
    masonRate: 0,
    cementPrice: 0,
    steelPrice: 0,
    concreteCost: 0
  });
  
  const [ufComparisonData, setUfComparisonData] = useState([]);
  const [cementHistoryData, setCementHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

  useEffect(() => {
    setLoading(true);
    // 1. Fetch KPI values
    const fetchKPIs = async () => {
      try {
        const [masonRes, cementRes, steelRes, concreteRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/insumos/00000088?uf=${uf}&month=${month}&desonerado=${desonerado}`),
          axios.get(`http://localhost:8000/api/insumos/00001379?uf=${uf}&month=${month}&desonerado=${desonerado}`),
          axios.get(`http://localhost:8000/api/insumos/00000114?uf=${uf}&month=${month}&desonerado=${desonerado}`),
          axios.get(`http://localhost:8000/api/composicoes/00088316?uf=${uf}&month=${month}&desonerado=${desonerado}`)
        ]);

        setKpis({
          masonRate: masonRes.data.preco,
          cementPrice: cementRes.data.preco,
          steelPrice: steelRes.data.preco,
          concreteCost: concreteRes.data.preco
        });
        
        // Also save cement history for line chart
        setCementHistoryData(cementRes.data.history);
      } catch (err) {
        console.error("Error loading KPI data:", err);
      }
    };

    // 2. Fetch concrete composition prices across all UFs for state comparison chart
    const fetchStateComparison = async () => {
      try {
        const ufs = ['SP', 'RJ', 'MG', 'AC'];
        const comparisons = await Promise.all(
          ufs.map(async (state) => {
            const res = await axios.get(`http://localhost:8000/api/composicoes/00088316?uf=${state}&month=${month}&desonerado=${desonerado}`);
            return { uf: state, cost: res.data.preco };
          })
        );
        setUfComparisonData(comparisons);
      } catch (err) {
        console.error("Error loading state comparisons:", err);
      }
    };

    Promise.all([fetchKPIs(), fetchStateComparison()]).then(() => setLoading(false));
  }, [uf, month, desonerado]);

  // ECharts Configurations
  const stateComparisonOption = {
    title: {
      text: 'Custo do Concreto Usinado por Estado (R$/m³)',
      left: 'center',
      textStyle: {
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 14,
        color: 'var(--text-primary)'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e4e7',
      borderWidth: 1,
      textStyle: { color: '#09090b', fontFamily: 'DM Sans, sans-serif' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ufComparisonData.map(d => d.uf),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)', fontFamily: 'DM Sans' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      splitLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)', fontFamily: 'DM Sans' }
    },
    series: [
      {
        name: 'Preço R$',
        type: 'bar',
        data: ufComparisonData.map(d => d.cost),
        color: colors[0],
        barWidth: '40%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  };

  const cementHistoryOption = {
    title: {
      text: `Histórico de Preço do Cimento Portland CP II (${uf})`,
      left: 'center',
      textStyle: {
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 14,
        color: 'var(--text-primary)'
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e4e7',
      borderWidth: 1,
      textStyle: { color: '#09090b', fontFamily: 'DM Sans, sans-serif' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: cementHistoryData.map(h => {
        const [year, monthStr] = h.data_referencia.split('-');
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${months[parseInt(monthStr) - 1]}/${year.substring(2)}`;
      }),
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)', fontFamily: 'DM Sans' }
    },
    yAxis: {
      type: 'value',
      min: 'dataMin',
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
      splitLine: { lineStyle: { color: 'var(--border-color)' } },
      axisLabel: { color: 'var(--text-secondary)', fontFamily: 'DM Sans' }
    },
    series: [
      {
        name: 'Preço R$/kg',
        type: 'line',
        data: cementHistoryData.map(h => h.preco),
        color: colors[1],
        symbolSize: 8,
        lineStyle: { width: 3 },
        smooth: true
      }
    ]
  };

  return (
    <div>
      {/* KPI Cards Row */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <h3>Mão de Obra: Pedreiro</h3>
            <div className="kpi-value">R$ {loading ? '...' : kpis.masonRate.toFixed(2)}<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/h</span></div>
            <span className="kpi-trend positive">
              <TrendingUp size={12} />
              Ref: {uf}
            </span>
          </div>
          <div className="kpi-icon-wrapper">
            <Hammer size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <h3>Cimento Portland CP II</h3>
            <div className="kpi-value">R$ {loading ? '...' : kpis.cementPrice.toFixed(2)}<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/kg</span></div>
            <span className="kpi-trend positive">
              <TrendingUp size={12} />
              Material
            </span>
          </div>
          <div className="kpi-icon-wrapper">
            <CircleDollarSign size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <h3>Aço CA-50 (10mm)</h3>
            <div className="kpi-value">R$ {loading ? '...' : kpis.steelPrice.toFixed(2)}<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/kg</span></div>
            <span className="kpi-trend positive">
              <TrendingUp size={12} />
              Insumo
            </span>
          </div>
          <div className="kpi-icon-wrapper">
            <Layers size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <h3>Concreto Usinado fck=25</h3>
            <div className="kpi-value">R$ {loading ? '...' : kpis.concreteCost.toFixed(2)}<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/m³</span></div>
            <span className="kpi-trend positive">
              <TrendingUp size={12} />
              Composição
            </span>
          </div>
          <div className="kpi-icon-wrapper">
            <Construction size={24} color="var(--accent-primary)" />
          </div>
        </div>
      </section>

      {/* Analytics Charts - 1 Chart Per Row */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="loading-skeleton" style={{ height: '350px', width: '100%' }}></div>
          <div className="loading-skeleton" style={{ height: '350px', width: '100%' }}></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Chart 1: State Comparisons */}
          <article className="chart-container-card">
            <div className="chart-header">
              <h3>Comparativo Geográfico</h3>
              <p>Custo da composição de Concreto fck=25 MPa (cód: 00088316) nas diferentes Unidades Federativas</p>
            </div>
            <div style={{ height: '320px' }}>
              <ReactECharts 
                option={stateComparisonOption} 
                style={{ height: '100%', width: '100%' }}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
              />
            </div>
          </article>

          {/* Chart 2: Historical Pricing */}
          <article className="chart-container-card">
            <div className="chart-header">
              <h3>Evolução de Preço Histórica</h3>
              <p>Histórico mensal do quilo de Cimento Portland composto CP II-32 (cód: 00001379) no estado de {uf}</p>
            </div>
            <div style={{ height: '320px' }}>
              <ReactECharts 
                option={cementHistoryOption} 
                style={{ height: '100%', width: '100%' }}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
              />
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

// Dummy icon placeholder for structure matching
function Construction({ size, color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22h20"/>
      <path d="M16 22V12a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v10"/>
      <path d="M12 2v8"/>
      <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
    </svg>
  );
}
