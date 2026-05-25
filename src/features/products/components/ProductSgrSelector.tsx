import React from 'react';
import { Sparkles } from 'lucide-react';
import { SgrSelection, SGR_OPTIONS } from '../utils/sgr';

interface ProductSgrSelectorProps {
    value: SgrSelection;
    onChange: (value: SgrSelection) => void;
    disabled?: boolean;
    compact?: boolean;
}

export const ProductSgrSelector: React.FC<ProductSgrSelectorProps> = ({
    value,
    onChange,
    disabled = false,
    compact = false
}) => {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Garanție Retur SGR
                </label>
                {value !== 'none' && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Garanție: 0.50 RON
                    </span>
                )}
            </div>

            <div className="relative group">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as SgrSelection)}
                    disabled={disabled}
                    data-testid="product-sgr-selector"
                    className={`w-full border p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 bg-white appearance-none border-slate-200 hover:border-slate-300 ${
                        disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100' : ''
                    }`}
                >
                    {SGR_OPTIONS.map((opt) => (
                        <option 
                            key={opt.value} 
                            value={opt.value} 
                            data-testid={`sgr-option-${opt.value}`}
                        >
                            {opt.label} — {opt.description}
                        </option>
                    ))}
                </select>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-500 transition-colors">
                    <Sparkles size={18} />
                </div>
            </div>

            {!compact && (
                <p className="text-[11px] text-slate-500 mt-1 leading-snug bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                    <span className="bg-indigo-50 text-indigo-600 p-0.5 rounded mt-0.5">
                        💡
                    </span>
                    <span>
                        SGR se aplică ambalajului, are garanție <span className="font-extrabold text-slate-700">0.50 lei</span> și <span className="font-extrabold text-slate-700">TVA 0% (Grupa D)</span>. Nu modifică TVA-ul produsului.
                    </span>
                </p>
            )}
        </div>
    );
};
