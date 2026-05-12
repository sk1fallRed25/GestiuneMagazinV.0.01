import React from 'react';
import { Warehouse, Store, ArrowRight } from 'lucide-react';
import { TransferDirection } from '../types';

interface TransferDirectionSelectorProps {
    direction: TransferDirection;
    setDirection: (d: TransferDirection) => void;
}

export const TransferDirectionSelector = ({ direction, setDirection }: TransferDirectionSelectorProps) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <label className="block text-xs font-bold text-gray-400 uppercase mb-4 ml-1">Pas 2: Alege Direcția</label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
                onClick={() => setDirection('depozit_spre_magazin')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
                    direction === 'depozit_spre_magazin' 
                    ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-50' 
                    : 'border-gray-50 bg-white hover:border-amber-200'
                }`}
            >
                <div className="flex items-center gap-3">
                    <Warehouse className={direction === 'depozit_spre_magazin' ? 'text-amber-500' : 'text-gray-300'} />
                    <ArrowRight size={14} className="text-gray-300" />
                    <Store className={direction === 'depozit_spre_magazin' ? 'text-amber-500' : 'text-gray-300'} />
                </div>
                <span className={`text-xs font-black uppercase tracking-widest ${
                    direction === 'depozit_spre_magazin' ? 'text-amber-700' : 'text-gray-400'
                }`}>Depozit → Magazin</span>
            </button>

            <button
                onClick={() => setDirection('magazin_spre_depozit')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
                    direction === 'magazin_spre_depozit' 
                    ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-50' 
                    : 'border-gray-50 bg-white hover:border-amber-200'
                }`}
            >
                <div className="flex items-center gap-3">
                    <Store className={direction === 'magazin_spre_depozit' ? 'text-amber-500' : 'text-gray-300'} />
                    <ArrowRight size={14} className="text-gray-300" />
                    <Warehouse className={direction === 'magazin_spre_depozit' ? 'text-amber-500' : 'text-gray-300'} />
                </div>
                <span className={`text-xs font-black uppercase tracking-widest ${
                    direction === 'magazin_spre_depozit' ? 'text-amber-700' : 'text-gray-400'
                }`}>Magazin → Depozit</span>
            </button>
        </div>
    </div>
);
