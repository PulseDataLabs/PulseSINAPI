import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sun, Moon, Database, LayoutDashboard, Construction, Hammer, Receipt, Layers } from 'lucide-react';
import Dashboard from './components/Dashboard';
import InsumosTable from './components/InsumosTable';
import ComposicoesTable from './components/ComposicoesTable';
import BudgetBuilder from './components/BudgetBuilder';
import UfCompareDashboard from './components/UfCompareDashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  
  // Global filters
  const [selectedUf, setSelectedUf] = useState('SP');
  const [selectedMonth, setSelectedMonth] = useState('2026-04');
  const [desonerado, setDesonerado] = useState(true);
  
  // Available filters (populated from database)
  const [availableUfs, setAvailableUfs] = useState(['SP', 'RJ', 'MG', 'AC']);
  const [availableMonths, setAvailableMonths] = useState(['2026-01', '2026-02', '2026-03', '2026-04']);
  const [dbSummary, setDbSummary] = useState({ total_insumos: 0, total_composicoes: 0 });

  // Fetch db configuration on load
  useEffect(() => {
    axios.get('/api/summary')
      .then(res => {
        setAvailableUfs(res.data.ufs);
        setAvailableMonths(res.data.months);
        setSelectedMonth(res.data.default_month);
        setSelectedUf(res.data.default_uf);
        setDbSummary({
          total_insumos: res.data.total_insumos,
          total_composicoes: res.data.total_composicoes
        });
      })
      .catch(err => console.error("Error loading DB configuration:", err));
  }, []);

  // Update HTML class on theme change
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="container">
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="title-section">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg viewBox="0 0 20 20" fill="none" style={{ width: '20px', height: '20px' }}>
                <path d="M10 2L2 6.5H18L10 2Z" fill="rgba(255,255,255,0.9)"/>
                <rect x="2" y="15.5" width="16" height="2" rx=".5" fill="rgba(255,255,255,0.9)"/>
                <rect x="4" y="8" width="5" height="6" rx=".5" fill="rgba(255,255,255,0.75)"/>
                <rect x="11" y="8" width="5" height="6" rx=".5" fill="rgba(255,255,255,0.75)"/>
                <line x1="6.5" y1="5.5" x2="6.5" y2="13.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="13.5" y1="5.5" x2="13.5" y2="13.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            PulseSINAPI
          </h1>
          <p>Explorer &amp; Orçamentador da Construção Civil — PulseDataLabs</p>
        </div>

        {/* Filters and Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="filters-group">
            <div className="filter-item">
              <span className="filter-label">Estado (UF)</span>
              <select 
                className="select-control"
                value={selectedUf}
                onChange={e => setSelectedUf(e.target.value)}
              >
                {availableUfs.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <span className="filter-label">Referência</span>
              <select 
                className="select-control"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                {availableMonths.map(m => {
                  const [year, month] = m.split('-');
                  // Formatting to readably display MMM/YYYY in Portuguese
                  const monthsName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const readable = `${monthsName[parseInt(month) - 1]} de ${year}`;
                  return (
                    <option key={m} value={m}>{readable}</option>
                  );
                })}
              </select>
            </div>

            <div className="filter-item">
              <span className="filter-label">Encargos Sociais</span>
              <div className="segmented-control">
                <button 
                  className={`segment-btn ${desonerado ? 'active' : ''}`}
                  onClick={() => setDesonerado(true)}
                >
                  Desonerado
                </button>
                <button 
                  className={`segment-btn ${!desonerado ? 'active' : ''}`}
                  onClick={() => setDesonerado(false)}
                >
                  Não Desonerado
                </button>
              </div>
            </div>
          </div>

          {/* Theme Toggle */}
          <button 
            className="btn-icon" 
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div className="tabs-container">
          <button 
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button 
            className={`tab-button ${activeTab === 'insumos' ? 'active' : ''}`}
            onClick={() => setActiveTab('insumos')}
          >
            <Hammer size={18} />
            Insumos
          </button>
          <button 
            className={`tab-button ${activeTab === 'composicoes' ? 'active' : ''}`}
            onClick={() => setActiveTab('composicoes')}
          >
            <Construction size={18} />
            Composições
          </button>
          <button 
            className={`tab-button ${activeTab === 'comparador' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparador')}
          >
            <Layers size={18} />
            Comparador Regional
          </button>
          <button 
            className={`tab-button ${activeTab === 'budget' ? 'active' : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            <Receipt size={18} />
            Orçamentador
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)' }}>
            <span>Insumos: <strong>{dbSummary.total_insumos}</strong></span>
            <span>Composições: <strong>{dbSummary.total_composicoes}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.25rem' }}>
            <a 
              href="https://pulsedatalabs.github.io/PulseSINAPI/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="tab-button"
              style={{ fontSize: '0.85rem', padding: 0, border: 'none' }}
            >
              Portal ↗
            </a>
            <a 
              href="https://github.com/PulseDataLabs/PulseSINAPI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="tab-button"
              style={{ fontSize: '0.85rem', padding: 0, border: 'none', color: 'var(--accent-primary)' }}
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </nav>

      {/* Main Tab Views */}
      <main>
        {activeTab === 'dashboard' && (
          <Dashboard 
            uf={selectedUf} 
            month={selectedMonth} 
            desonerado={desonerado} 
          />
        )}
        {activeTab === 'insumos' && (
          <InsumosTable 
            uf={selectedUf} 
            month={selectedMonth} 
            desonerado={desonerado} 
          />
        )}
        {activeTab === 'composicoes' && (
          <ComposicoesTable 
            uf={selectedUf} 
            month={selectedMonth} 
            desonerado={desonerado} 
          />
        )}
        {activeTab === 'comparador' && (
          <UfCompareDashboard />
        )}
        {activeTab === 'budget' && (
          <BudgetBuilder 
            uf={selectedUf} 
            month={selectedMonth} 
            desonerado={desonerado} 
          />
        )}
      </main>

      <hr style={{ borderColor: 'var(--border-color)', margin: '3rem 0 1.5rem 0' }} />

      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        <div>
          <span>© 2026 <a href="https://pulsedatalabs.github.io" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>PulseDataLabs</a></span>
          <span style={{ margin: '0 0.5rem', color: 'var(--border-color)' }}>·</span>
          <span>Dados públicos do <a href="https://www.caixa.gov.br/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>SINAPI/Caixa</a></span>
          <span style={{ margin: '0 0.5rem', color: 'var(--border-color)' }}>·</span>
          <span>Licença MIT</span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <a href="https://pulsedatalabs.github.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>A Empresa</a>
          <a href="https://pulsedatalabs.github.io/PulseFlat/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>PulseFlat</a>
          <a href="https://pulsedatalabs.github.io/PulseIFData/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>PulseIFData</a>
          <a href="https://pulsedatalabs.github.io/PulseSICRO/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>PulseSICRO</a>
          <a href="https://github.com/PulseDataLabs/PulseSINAPI/issues" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Contato/Suporte</a>
        </div>
      </footer>
    </div>
  );
}
