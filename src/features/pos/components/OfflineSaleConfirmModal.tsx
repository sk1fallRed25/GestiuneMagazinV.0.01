import React, { useState } from 'react';

interface OfflineSaleConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const OfflineSaleConfirmModal: React.FC<OfflineSaleConfirmModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [checked, setChecked] = useState(false);

    if (!isOpen) return null;

    return (
        <div 
            data-testid="offline-sale-confirm-dialog"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
        >
            <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Salvează vânzare offline?</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        Această vânzare va fi salvată local și sincronizată după reconectare. Bonul fiscal NU se emite acum.
                    </p>
                </div>
                
                <label className="flex items-start gap-3.5 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl cursor-pointer hover:bg-rose-50 transition-colors">
                    <input 
                        type="checkbox"
                        data-testid="offline-sale-confirm-checkbox"
                        checked={checked}
                        onChange={(e) => setChecked(e.target.checked)}
                        className="mt-0.5 h-4.5 w-4.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs text-rose-900 font-bold leading-normal select-none">
                        Am înțeles că bonul fiscal nu se emite în modul offline.
                    </span>
                </label>

                <div className="flex gap-3 justify-end">
                    <button
                        data-testid="offline-sale-cancel-button"
                        onClick={() => {
                            setChecked(false);
                            onClose();
                        }}
                        className="px-5 py-2.5 text-sm font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
                    >
                        Anulează
                    </button>
                    <button
                        data-testid="offline-sale-save-button"
                        onClick={() => {
                            setChecked(false);
                            onConfirm();
                        }}
                        disabled={!checked}
                        className="px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        Salvează offline
                    </button>
                </div>
            </div>
        </div>
    );
};
