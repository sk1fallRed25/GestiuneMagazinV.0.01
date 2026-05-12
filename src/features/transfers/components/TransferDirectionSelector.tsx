import React from 'react';
import { Warehouse, Store, ArrowRightLeft } from 'lucide-react';
import { TransferDirection } from '../types';

interface TransferDirectionSelectorProps {
    direction: TransferDirection;
    onChange: (direction: TransferDirection) => void;
}

export const TransferDirectionSelector: React.FC<TransferDirectionSelectorProps> = ({
    direction,
    onChange
}) => {
    return (
        <div className="mb-8">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
                Direcție Transfer
            </label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onChange('depozit_spre_magazin')}
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                        direction === 'depozit_spre_magazin'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-500'
                            : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Warehouse size={20} /> 
                        <ArrowRightLeft size={14} className="opacity-50" /> 
                        <Store size={20} />
                    </div>
                    <span className="font-bold text-sm">Depozit ➔ Magazin</span>
                </button>

                <button
                    onClick={() => onChange('magazin_spre_depozit')}
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                        direction === 'magazin_spre_depozit'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-500'
                            : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Store size={20} /> 
                        <ArrowRightLeft size={14} className="opacity-50" /> 
                        <Warehouse size={20} />
                    </div>
                    <span className="font-bold text-sm">Magazin ➔ Depozit</span>
                </button>
            </div>
        </div>
    );
};
