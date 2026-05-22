import React from 'react';
import { StorePosSettings } from '../types';
import { ShoppingCart } from 'lucide-react';

interface Props {
  settings: StorePosSettings;
  disabled: boolean;
  onChange: (updated: StorePosSettings) => void;
}

export const StorePosSettingsPanel: React.FC<Props> = ({ settings, disabled, onChange }) => {
  const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';
  const toggleCls = (active: boolean) =>
    `flex-1 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`;
  const selectCls = `w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

  const BoolRow = ({ label, value, tip, onToggle }: { label: string; value: boolean; tip?: string; onToggle: (v: boolean) => void }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-3">
        <button type="button" className={toggleCls(value)} disabled={disabled} onClick={() => onToggle(true)}>Da</button>
        <button type="button" className={toggleCls(!value)} disabled={disabled} onClick={() => onToggle(false)}>Nu</button>
      </div>
      {tip && <p className="text-[10px] text-gray-400 font-semibold mt-1 ml-1">{tip}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4">
        <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center"><ShoppingCart size={22} /></div>
        <div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">POS & Retururi/Anulări</h3>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Configurare puncte de vânzare și control antifraudă</p>
        </div>
      </div>
      <div className="p-8 space-y-6">
        <div>
          <label className={labelCls}>Metodă de Plată Implicită</label>
          <select value={settings.defaultPaymentMethod} disabled={disabled}
            onChange={(e) => onChange({ ...settings, defaultPaymentMethod: e.target.value as 'cash' | 'card' | 'mixed' })}
            className={selectCls}>
            <option value="cash">Numerar</option>
            <option value="card">Card</option>
            <option value="mixed">Mixt</option>
          </select>
        </div>
        <BoolRow label="Permite Plată Mixtă" value={settings.allowMixedPayment}
          onToggle={(v) => onChange({ ...settings, allowMixedPayment: v })} />
        <BoolRow label="Necesită Tură Activă pentru Vânzare" value={settings.requireActiveShift}
          tip="Recomandat ON — previne vânzări în afara turelor de casă"
          onToggle={(v) => onChange({ ...settings, requireActiveShift: v })} />
        <BoolRow label="Necesită Manager pentru Anulare Bon" value={settings.requireManagerForVoid}
          tip="Control antifraudă — managerul aprobă anulările"
          onToggle={(v) => onChange({ ...settings, requireManagerForVoid: v })} />
        <BoolRow label="Necesită Manager pentru Retur" value={settings.requireManagerForReturn}
          tip="Control antifraudă — managerul aprobă retururile"
          onToggle={(v) => onChange({ ...settings, requireManagerForReturn: v })} />
      </div>
    </div>
  );
};
