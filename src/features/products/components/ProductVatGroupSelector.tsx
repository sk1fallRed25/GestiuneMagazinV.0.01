import React from 'react';
import { Percent, Info } from 'lucide-react';
import { VatGroupKey, ProductVatConfig } from '../types';

interface ProductVatGroupSelectorProps {
    value: VatGroupKey;
    onChange: (value: VatGroupKey) => void;
    config: ProductVatConfig | null;
    disabled?: boolean;
    readOnly?: boolean;
    error?: string;
}

export const ProductVatGroupSelector: React.FC<ProductVatGroupSelectorProps> = ({
    value,
    onChange,
    config,
    disabled = false,
    readOnly = false,
    error
}) => {
    if (!config) {
        return (
            <div className="animate-pulse space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                <div className="h-12 bg-slate-100 rounded-2xl border border-slate-200"></div>
            </div>
        );
    }

    const { vatPayer, vatGroups } = config;

    // Dacă magazinul este neplătitor de TVA, selectorul este read-only și fixat la grupa 'E'
    if (!vatPayer) {
        return (
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Grupă TVA Fiscală
                </label>
                <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-4 rounded-2xl shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-xl text-amber-600 mt-0.5">
                        <Info size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">Magazin neplătitor TVA</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Produsele folosesc automat grupa fiscală <span className="font-extrabold text-amber-700 font-mono">E = 0%</span> conform setărilor fiscale ale punctului de lucru.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Filtrăm grupele de TVA active
    const activeGroups = Object.entries(vatGroups)
        .filter(([_, g]) => g.active)
        .map(([key, g]) => ({
            key: key as VatGroupKey,
            ...g
        }));

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Grupă TVA Fiscală
                </label>
                {value && vatGroups[value] && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Cotă selectată: {vatGroups[value].rate}%
                    </span>
                )}
            </div>

            <div className="relative group">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as VatGroupKey)}
                    disabled={disabled || readOnly}
                    className={`w-full border p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 bg-white appearance-none ${
                        error ? 'border-red-300 ring-4 ring-red-500/5' : 'border-slate-200 hover:border-slate-300'
                    } ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100' : ''}`}
                >
                    {activeGroups.map((g) => (
                        <option key={g.key} value={g.key}>
                            Grupa {g.key} — {g.label} ({g.rate}%)
                        </option>
                    ))}
                </select>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-500 transition-colors">
                    <Percent size={18} />
                </div>
            </div>

            {error && (
                <p className="text-red-500 text-xs font-semibold ml-1 animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
};
