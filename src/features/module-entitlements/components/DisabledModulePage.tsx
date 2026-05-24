import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Terminal } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { useModuleEntitlementsContext } from '../ModuleEntitlementsContext';

interface DisabledModulePageProps {
  moduleKey?: string;
  path?: string;
}

export const DisabledModulePage: React.FC<DisabledModulePageProps> = ({ moduleKey }) => {
  const navigate = useNavigate();
  const { role, currentStoreName } = useAuth();
  const { getModule } = useModuleEntitlementsContext();

  const moduleItem = moduleKey ? getModule(moduleKey) : undefined;
  const moduleName = moduleItem?.name || moduleKey || 'Modul Opțional';
  const status = moduleItem?.status || 'disabled';
  const reason = moduleItem?.reason || '';

  const handleGoBack = () => {
    if (role === 'platform_owner') {
      navigate('/owner');
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
      color: '#f3f4f6',
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#1f2937',
        borderRadius: '16px',
        border: '1px solid #374151',
        padding: '32px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: status === 'planned' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: status === 'planned' ? '#3b82f6' : '#ef4444',
          marginBottom: '24px',
        }}>
          {status === 'planned' ? (
            <Terminal size={32} />
          ) : (
            <ShieldAlert size={32} />
          )}
        </div>

        <h1 style={{
          fontSize: '22px',
          fontWeight: 700,
          marginBottom: '12px',
          color: '#ffffff',
        }} id="disabled-module-title">
          {status === 'planned' ? 'Modul În Curs De Dezvoltare' : 'Modul Dezactivat / Restricționat'}
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#9ca3af',
          lineHeight: '1.6',
          marginBottom: '24px',
        }} id="disabled-module-description">
          {status === 'planned' ? (
            <>
              Modulul <strong>{moduleName}</strong> este planificat în roadmap-ul platformei. Reveniți în curând pentru actualizări!
            </>
          ) : (
            <>
              Accesul la modulul <strong>{moduleName}</strong> este dezactivat pentru magazinul{' '}
              <strong>{currentStoreName || 'implicit'}</strong>. Pentru activare, contactați un administrator de platformă.
            </>
          )}
        </p>

        {reason && (
          <div style={{
            backgroundColor: '#111827',
            border: '1px dashed #4b5563',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '13px',
            textAlign: 'left',
          }} id="disabled-module-reason">
            <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>Motiv specific:</strong>
            <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>{reason}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <button
            onClick={handleGoBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#374151',
              color: '#ffffff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
            id="disabled-module-back-btn"
          >
            <ArrowLeft size={16} />
            {role === 'platform_owner' ? 'Înapoi la Owner Console' : 'Înapoi la Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
