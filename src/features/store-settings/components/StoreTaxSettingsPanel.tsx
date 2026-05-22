import React from 'react';
import { StoreTaxSettings, VatGroupKey, VAT_GROUP_KEYS } from '../types';
import { Receipt, Info } from 'lucide-react';

interface Props {
  settings: StoreTaxSettings;
  disabled: boolean;
  onChange: (updated: StoreTaxSettings) => void;
}

export const StoreTaxSettingsPanel: React.FC<Props> = ({ settings, disabled, onChange }) => {
  const handleVatPayerToggle = (vatPayer: boolean) => {
    const updated = { ...settings, vatPayer };
    if (!vatPayer) {
      updated.defaultVatGroup = 'E';
    } else if (vatPayer && updated.defaultVatGroup === 'E') {
      updated.defaultVatGroup = 'A';
    }
    onChange(updated);
  };

  const handleDefaultGroupChange = (group: VatGroupKey) => {
    if (!settings.vatPayer) return; // Non-payer is always E
    onChange({ ...settings, defaultVatGroup: group });
  };

  const handlePolicyChange = (policy: 'inclusive' | 'exclusive') => {
    onChange({ ...settings, priceTaxPolicy: policy });
  };

  const toggleCls = (active: boolean) =>
    `flex-1 px-5 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-200 ${
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4">
        <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
          <Receipt size={22} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">TVA & Prețuri</h3>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Configurare fiscalitate și politică de preț</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* VAT Payer toggle */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Statut TVA Magazin
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              className={toggleCls(settings.vatPayer)}
              disabled={disabled}
              onClick={() => handleVatPayerToggle(true)}
            >
              ✓ Plătitor TVA
            </button>
            <button
              type="button"
              className={toggleCls(!settings.vatPayer)}
              disabled={disabled}
              onClick={() => handleVatPayerToggle(false)}
            >
              ✗ Neplătitor TVA
            </button>
          </div>
        </div>

        {/* Non-payer info banner */}
        {!settings.vatPayer && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Magazin neplătitor TVA</p>
              <p className="text-xs text-amber-600 mt-1">
                Produsele vor folosi implicit grupa <span className="font-black">E = 0% / Neplătitor TVA</span>.
                Selectorul de grupă TVA implicită este dezactivat.
              </p>
            </div>
          </div>
        )}

        {/* Default VAT Group selector */}
        {settings.vatPayer && (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Grupa TVA Implicită
            </label>
            <div className="grid grid-cols-5 gap-2">
              {VAT_GROUP_KEYS.map((key) => {
                const group = settings.vatGroups[key];
                const isSelected = settings.defaultVatGroup === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDefaultGroupChange(key)}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px] font-black">✓</span>
                      </div>
                    )}
                    <div className={`text-2xl font-black ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {key}
                    </div>
                    <div className={`text-lg font-black mt-1 ${isSelected ? 'text-indigo-600' : 'text-gray-600'}`}>
                      {group.rate}%
                    </div>
                    <div className="text-[10px] font-semibold text-gray-400 mt-1 leading-tight">
                      {group.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Non-payer locked indicator */}
        {!settings.vatPayer && (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Grupa TVA Implicită
            </label>
            <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200 text-center">
              <span className="text-2xl font-black text-gray-500">E</span>
              <span className="text-lg font-bold text-gray-400 ml-2">= 0% / Neplătitor TVA</span>
              <p className="text-[10px] font-semibold text-gray-400 mt-1">Blocat — magazin neplătitor TVA</p>
            </div>
          </div>
        )}

        {/* VAT Groups reference (read-only) */}
        {settings.vatPayer && (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Grupe TVA Active (România)
            </label>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Grupă</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cotă</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Denumire</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {VAT_GROUP_KEYS.map((key) => {
                    const group = settings.vatGroups[key];
                    return (
                      <tr key={key} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-black text-gray-800">{key}</td>
                        <td className="px-4 py-3 font-bold text-gray-700">{group.rate}%</td>
                        <td className="px-4 py-3 text-gray-600">{group.label}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            group.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {group.active ? 'Activ' : 'Inactiv'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Price tax policy */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Politică Preț
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              className={toggleCls(settings.priceTaxPolicy === 'inclusive')}
              disabled={disabled}
              onClick={() => handlePolicyChange('inclusive')}
            >
              TVA Inclus
            </button>
            <button
              type="button"
              className={toggleCls(settings.priceTaxPolicy === 'exclusive')}
              disabled={disabled}
              onClick={() => handlePolicyChange('exclusive')}
            >
              TVA Exclus
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-semibold mt-2 ml-1">
            „TVA Inclus" = prețul afișat conține deja TVA (standard retail). „TVA Exclus" = se adaugă TVA la calcul.
          </p>
        </div>

        {/* Future integration notice */}
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <Info size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 font-medium">
            Aplicarea automată a grupei TVA asupra produselor se implementează în <span className="font-black">Etapa 6D.4</span>.
            Momentan, setările sunt salvate la nivel de magazin.
          </p>
        </div>
      </div>
    </div>
  );
};
