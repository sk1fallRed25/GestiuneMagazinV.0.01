import React from 'react';
import { Truck, Upload, Plus, History } from 'lucide-react';

interface ReceptionHeaderProps {
    view: 'form' | 'history' | 'detail';
    setView: (v: 'form' | 'history' | 'detail') => void;
    onNewReception: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    storeName?: string;
}

export const ReceptionHeader = ({ 
    view, 
    setView, 
    onNewReception, 
    onFileUpload,
    storeName
}: ReceptionHeaderProps) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <Truck size={28} />
                    </span>
                    Recepție Marfă
                </h1>
                <p className="text-gray-500 mt-2 ml-1 text-xs font-semibold">
                    Punct de lucru curent: <span className="text-indigo-650 font-bold">{storeName || 'Magazin Curent'}</span>
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    data-testid="reception-new-button"
                    onClick={onNewReception}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition duration-200 active:scale-95 text-xs uppercase tracking-wide border ${view === 'form' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'}`}
                >
                    <Plus size={16} />
                    Recepție nouă
                </button>

                <button
                    data-testid="reception-history-button"
                    onClick={() => setView('history')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition duration-200 active:scale-95 text-xs uppercase tracking-wide border ${view === 'history' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'}`}
                >
                    <History size={16} />
                    Istoric recepții
                </button>

                {view === 'form' && (
                    <label className="flex items-center gap-2 bg-slate-800 hover:bg-black text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 cursor-pointer transition active:scale-95 text-xs uppercase tracking-wide">
                        <Upload size={16} />
                        Importă XML
                        <input
                            type="file"
                            accept=".xml"
                            onChange={onFileUpload}
                            className="hidden"
                        />
                    </label>
                )}
            </div>
        </div>
    );
};
