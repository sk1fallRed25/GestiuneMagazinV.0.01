import React from 'react';
import { StoreFiscalSettings } from '../types';
import { Building2 } from 'lucide-react';

interface Props {
  settings: StoreFiscalSettings;
  fiscalCode: string | null;
  disabled: boolean;
  onChange: (updated: StoreFiscalSettings) => void;
}

export const StoreFiscalSettingsPanel: React.FC<Props> = ({ settings, fiscalCode, disabled, onChange }) => {
  const update = (field: keyof StoreFiscalSettings, value: string | number) => {
    onChange({ ...settings, [field]: value });
  };

  const inputCls = `w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-gray-400 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;
  const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4">
        <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
          <Building2 size={22} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Date Fiscale</h3>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Informații despre firmă și punctul de lucru</p>
        </div>
      </div>

      <div className="p-8">
        {/* CUI read-only */}
        {fiscalCode && (
          <div className="mb-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">CUI / Cod Fiscal</span>
            <p className="text-lg font-black text-indigo-700 mt-1">{fiscalCode}</p>
            <p className="text-[10px] text-indigo-400 mt-1 font-semibold">Gestionat din Consolă Proprietar • Nu se modifică aici</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Denumire Firmă</label>
            <input type="text" value={settings.companyName} disabled={disabled}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder="SC Exemplu SRL" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nr. Registru Comerț</label>
            <input type="text" value={settings.regNumber ?? ''} disabled={disabled}
              onChange={(e) => update('regNumber', e.target.value)}
              placeholder="J40/1234/2024" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nr. Punct de Lucru</label>
            <input type="number" value={settings.workpointNumber} disabled={disabled} min={1}
              onChange={(e) => update('workpointNumber', Math.max(1, parseInt(e.target.value) || 1))}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nume Punct de Lucru</label>
            <input type="text" value={settings.workpointName} disabled={disabled}
              onChange={(e) => update('workpointName', e.target.value)}
              placeholder="Magazin Central" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Cod Afișare</label>
            <input type="text" value={settings.displayCode} disabled={disabled}
              onChange={(e) => update('displayCode', e.target.value)}
              placeholder="MAG-01" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefon</label>
            <input type="tel" value={settings.phone ?? ''} disabled={disabled}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+40 7XX XXX XXX" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={settings.email ?? ''} disabled={disabled}
              onChange={(e) => update('email', e.target.value)}
              placeholder="contact@firma.ro" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Județ</label>
            <input type="text" value={settings.county ?? ''} disabled={disabled}
              onChange={(e) => update('county', e.target.value)}
              placeholder="București" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Oraș</label>
            <input type="text" value={settings.city ?? ''} disabled={disabled}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Sector 1" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Adresă Completă</label>
            <input type="text" value={settings.addressFull ?? ''} disabled={disabled}
              onChange={(e) => update('addressFull', e.target.value)}
              placeholder="Str. Exemplu nr. 10, bl. A1, sc. 2" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Note Interne</label>
            <textarea value={settings.notes ?? ''} disabled={disabled}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Observații interne despre acest punct de lucru..."
              rows={3}
              className={`${inputCls} resize-none`} />
          </div>
        </div>
      </div>
    </div>
  );
};
