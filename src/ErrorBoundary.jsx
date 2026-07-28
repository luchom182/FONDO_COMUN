import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL APP ERROR CATCHED BY ERROR BOUNDARY:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.removeItem('fondo_comun_data_v1');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0b0f19',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div className="glass-panel" style={{
            maxWidth: '540px',
            width: '100%',
            padding: '2.5rem',
            textAlign: 'center',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            background: 'rgba(18, 26, 43, 0.9)'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <AlertOctagon size={32} />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Se ha producido un error inesperado
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              La aplicación ha capturado una excepción para evitar que el sistema se bloquee. Puedes intentar reiniciar la aplicación o restablecer los datos guardados.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '0.85rem',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                textAlign: 'left',
                marginBottom: '1.5rem',
                overflowX: 'auto'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Reintentar Cargar
              </button>
              <button 
                className="btn btn-danger"
                onClick={this.handleReset}
              >
                <RefreshCw size={16} /> Restablecer Datos de Fábrica
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
