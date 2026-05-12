import React from 'react';
import { Send } from 'lucide-react';

interface TransferQuantityFormProps {
    quantity: string;
    setQuantity: (q: string) => void;
    onSubmit: () => void;
    submitting: boolean;
    disabled: boolean;
}

export const TransferQuantityForm = ({
    quantity, setQuantity, onSubmit, submitting, disabled
}: TransferQuantityFormProps) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <label className="block text-xs font-bold text-gray-400 uppercase mb-3 ml-1">Pas 3: Introdu Cantitatea</label>
        
        <div className="flex flex-col gap-4">
            <input
                type="number"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-mono text-2xl font-black text-center text-gray-800"
                placeholder="0.00"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
            />

            <button
                onClick={onSubmit}
                disabled={disabled || submitting}
                className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white py-5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed shadow-xl shadow-slate-100 flex items-center justify-center gap-3 uppercase tracking-widest"
            >
                {submitting ? (
                    <>
                        <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        Se procesează...
                    </>
                ) : (
                    <>
                        <Send size={20} />
                        Execută Transferul
                    </>
                )}
            </button>
        </div>
    </div>
);
