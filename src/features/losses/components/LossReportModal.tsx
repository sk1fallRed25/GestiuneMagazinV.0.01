import React from 'react';
import { X, AlertOctagon, Warehouse, Store, ArrowDownWideNarrow } from 'lucide-react';
import { LossProduct, LossStockSource } from '../types';

interface LossReportModalProps {
    product: LossProduct | null;
    isOpen: boolean;
    quantity: string;
    reason: string;
    description: string;
    source: LossStockSource;
    submitting: boolean;
    onQuantityChange: (value: string) => void;
    onReasonChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onSourceChange: (value: LossStockSource) => void;
    onClose: () => void;
    onSubmit: () => void;
}

const REASON_PRESETS = [
    "Produs expirat",
    "Produs deteriorat",
    "Inventar lipsă",
    "Retur imposibil",
    "Alt motiv"
];

export const LossReportModal: React.FC<LossReportModalProps> = ({
    product,
    isOpen,
    quantity,
    reason,
    description,
    source,
    submitting,
    onQuantityChange,
    onReasonChange,
    onDescriptionChange,
    onSourceChange,
    onClose,
    onSubmit
}) => {
    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-8 md:p-12">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-gray-800">Raport Casare</h2>
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">Schema v2 • Trasabilitate Loturi</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                    >
                        <X size={28} />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Header Produs */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Produs Vizat</p>
                            <p className="text-2xl font-black text-gray-800">{product.nume}</p>
                            <p className="text-xs font-bold text-slate-400">Cod: {product.cod_bare}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stoc Total</p>
                            <p className="text-2xl font-black text-amber-600">{product.stoc_total} <span className="text-sm font-bold">{product.um}</span></p>
                        </div>
                    </div>

                    {/* Selector Sursă */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Sursa Stocului</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => onSourceChange('magazin')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                    source === 'magazin' ? 'border-red-500 bg-red-50 text-red-700 shadow-lg shadow-red-50' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-red-200'
                                }`}
                            >
                                <Store size={20} />
                                <span className="text-[10px] font-black uppercase">Magazin ({product.stoc_magazin})</span>
                            </button>
                            <button
                                onClick={() => onSourceChange('depozit')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                    source === 'depozit' ? 'border-red-500 bg-red-50 text-red-700 shadow-lg shadow-red-50' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-red-200'
                                }`}
                            >
                                <Warehouse size={20} />
                                <span className="text-[10px] font-black uppercase">Depozit ({product.stoc_depozit})</span>
                            </button>
                            <button
                                onClick={() => onSourceChange('auto')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                    source === 'auto' ? 'border-red-500 bg-red-50 text-red-700 shadow-lg shadow-red-50' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-red-200'
                                }`}
                            >
                                <ArrowDownWideNarrow size={20} />
                                <span className="text-[10px] font-black uppercase">Auto (FIFO)</span>
                            </button>
                        </div>
                    </div>

                    {/* Cantitate și Motiv */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Cantitate de Scos</label>
                            <input
                                type="number"
                                className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 font-black text-2xl text-center text-red-600"
                                placeholder="0"
                                value={quantity}
                                onChange={(e) => onQuantityChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Motiv Casare</label>
                            <select
                                className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 font-bold text-gray-700 appearance-none"
                                value={reason}
                                onChange={(e) => onReasonChange(e.target.value)}
                            >
                                <option value="">Selectează motiv...</option>
                                {REASON_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Descriere Detaliată (Opțional)</label>
                        <textarea
                            className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 font-medium text-gray-700 min-h-[100px]"
                            placeholder="Adaugă detalii suplimentare despre starea produsului..."
                            value={description}
                            onChange={(e) => onDescriptionChange(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={onSubmit}
                        disabled={submitting}
                        className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black hover:bg-black disabled:bg-slate-200 shadow-2xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-4 text-xl uppercase tracking-widest"
                    >
                        {submitting ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <><AlertOctagon size={24} className="text-red-500" /> Confirmă Casarea</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
