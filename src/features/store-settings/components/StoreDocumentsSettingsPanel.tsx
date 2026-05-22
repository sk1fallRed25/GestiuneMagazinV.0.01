import React from 'react';
import { StoreDocumentsSettings } from '../types';
import { FileText } from 'lucide-react';

interface Props {
  settings: StoreDocumentsSettings;
  disabled: boolean;
  onChange: (updated: StoreDocumentsSettings) => void;
}

export const StoreDocumentsSettingsPanel: React.FC<Props> = ({ settings, disabled, onChange }) => {
  const inputCls = `w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all uppercase ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;
  const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  const fields: Array<{ key: keyof StoreDocumentsSettings; label: string; placeholder: string }> = [
    { key: 'posReceiptPrefix', label: 'Prefix Bon POS', placeholder: 'BON' },
    { key: 'returnPrefix', label: 'Prefix Retur', placeholder: 'RET' },
    { key: 'receptionPrefix', label: 'Prefix Recepție', placeholder: 'REC' },
    { key: 'wastePrefix', label: 'Prefix Pierdere', placeholder: 'PD' },
    { key: 'transferPrefix', label: 'Prefix Transfer', placeholder: 'TRF' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4">
        <div className="w-11 h-11 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center"><FileText size={22} /></div>
        <div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Documente</h3>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Prefixe pentru numerotarea documentelor operaționale</p>
        </div>
      </div>
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input type="text" value={settings[key]} disabled={disabled} maxLength={10}
                onChange={(e) => onChange({ ...settings, [key]: e.target.value.toUpperCase() })}
                placeholder={placeholder} className={inputCls} />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 font-semibold mt-4 ml-1">Max 10 caractere per prefix. Se recomandă uppercase.</p>
      </div>
    </div>
  );
};
