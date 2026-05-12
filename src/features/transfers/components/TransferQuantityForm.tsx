import React from 'react';
import { Loader, CheckCircle } from 'lucide-react';

interface TransferQuantityFormProps {
    quantity: string;
    onQuantityChange: (value: string) => void;
    onSubmit: () => void;
    submitting: boolean;
    disabled: boolean;
}

export const TransferQuantityForm: React.FC<TransferQuantityFormProps> = ({
    quantity,
    onQuantityChange,
    onSubmit,
    submitting,
    disabled
}) => {
    return (
        <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="w-full sm:w-1/2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                    Cantitate
                </label>
                <input
                    type="number"
                    min="1"
                    placeholder="ex: 50"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xl text-gray-800 transition-all"
                    value={quantity}
                    onChange={(e) => onQuantityChange(e.target.value)}
                />
            </div>
            <button
                onClick={onSubmit}
                disabled={submitting || disabled}
                className={`w-full sm:w-1/2 p-4 rounded-xl font-bold text-white shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 text-lg ${
                    submitting || disabled
                        ? 'bg-gray-300 cursor-not-allowed shadow-none'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
            >
                {submitting ? (
                    <Loader className="animate-spin" />
                ) : (
                    <>
                        <CheckCircle size={24} /> 
                        Confirmă
                    </>
                )}
            </button>
        </div>
    );
};
