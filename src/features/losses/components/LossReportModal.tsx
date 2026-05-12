import React from 'react';
import { X, AlertOctagon } from 'lucide-react';
import { LossProduct } from '../types';

interface LossReportModalProps {
    product: LossProduct | null;
    isOpen: boolean;
    quantity: string;
    reason: string;
    loading: boolean;
    onQuantityChange: (value: string) => void;
    onReasonChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}

export const LossReportModal: React.FC<LossReportModalProps> = ({
    product,
    isOpen,
    quantity,
    reason,
    loading,
    onQuantityChange,
    onReasonChange,
    onClose,
    onSubmit
}) => {
    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-10">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-gray-800">Validare Casare</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="bg-red-50 p-5 rounded-3xl border border-red-100">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Repere Vizate</p>
                        <p className="text-xl font-bold text-gray-800">{product.nume}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Volum Pierdere</label>
                            <input
                                type="number"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-xl"
                                placeholder="0"
                                value={quantity}
                                onChange={(e) => onQuantityChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Motiv (Ex: Deteriorat)</label>
                            <input
                                type="text"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Motivul..."
                                value={reason}
                                onChange={(e) => onReasonChange(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        onClick={onSubmit}
                        disabled={loading}
                        className="w-full py-5 bg-red-600 text-white rounded-3xl font-black hover:bg-red-700 shadow-xl shadow-red-200 transition-all flex items-center justify-center gap-3 text-lg"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <><AlertOctagon size={24} /> Finalizează Raportul</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
