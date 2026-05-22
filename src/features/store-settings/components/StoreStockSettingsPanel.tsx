import React from 'react';
import { StoreStockSettings } from '../types';
import { Package, Info } from 'lucide-react';

interface Props {
  settings: StoreStockSettings;
  disabled: boolean;
  onChange: (updated: StoreStockSettings) => void;
}

export const StoreStockSettingsPanel: React.FC<Props> = ({ settings, disabled, onChange }) => {
  const inputCls = `w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;
  const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';
  const toggleCls = (active: boolean) =>
    `flex-1 px-5 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4">
        <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Package size={22} /></div>
        <div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Stoc &amp; Expirări</h3>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Praguri de stoc și avertizări de expirare</p>
        </div>
      </div>
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Stoc Minim Implicit</label>
            <input type="number" value={settings.stockMinDefault} disabled={disabled} min={0}
              onChange={(e) => onChange({ ...settings, stockMinDefault: Math.max(0, parseInt(e.target.value) || 0) })} className={inputCls} />
            <p className="text-[10px] text-gray-400 font-semibold mt-1 ml-1">Prag sub care se generează avertizare stoc scăzut</p>
          </div>
          <div>
            <label className={labelCls}>Zile Avertizare Expirare</label>
            <input type="number" value={settings.expiryWarningDays} disabled={disabled} min={0}
              onChange={(e) => onChange({ ...settings, expiryWarningDays: Math.max(0, parseInt(e.target.value) || 0) })} className={inputCls} />
            <p className="text-[10px] text-gray-400 font-semibold mt-1 ml-1">Cu câte zile înainte de expirare se trimite alertă</p>
          </div>
        </div>
        <div>
          <label className={labelCls}>Stoc Negativ</label>
          <div className="flex gap-3">
            <button type="button" className={toggleCls(!settings.allowNegativeStock)} disabled={disabled}
              onClick={() => onChange({ ...settings, allowNegativeStock: false })}>Nu Permite</button>
            <button type="button" className={toggleCls(settings.allowNegativeStock)} disabled={disabled}
              onClick={() => onChange({ ...settings, allowNegativeStock: true })}>Permite</button>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
          <Info size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium"><span className="font-black">Recomandat pentru pilot:</span> nu permite stoc negativ. Previne vânzarea produselor care nu sunt în stoc.</p>
        </div>
      </div>
    </div>
  );
};
