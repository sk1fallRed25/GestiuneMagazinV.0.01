import React from 'react';
import { BrainCircuit, RefreshCw, ArrowLeft } from 'lucide-react';

interface AiConsultantHeaderProps {
    generatedAt: string;
    storeName: string | null;
    onRefresh: () => void;
    isRefreshing: boolean;
}

export const AiConsultantHeader: React.FC<AiConsultantHeaderProps> = ({
    generatedAt,
    storeName,
    onRefresh,
    isRefreshing
}) => {
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-start gap-4 z-10">
                <button 
                    onClick={() => window.history.back()}
                    className="p-3 bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 rounded-2xl transition-all shadow-sm border border-slate-700/50 mt-1 shrink-0"
                    aria-label="Înapoi"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <BrainCircuit className="text-indigo-400 animate-pulse" size={32} /> AI Consultant
                        </h1>
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                            Determinist v2
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm font-semibold max-w-xl leading-relaxed">
                        Recomandări automate pentru stocuri, vânzări și risc operațional bazate pe datele din ultimele 30 de zile.
                    </p>
                    
                    <div className="flex flex-wrap gap-4 mt-4 text-xs font-bold">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700/50">
                            <span className="text-slate-500 uppercase tracking-wider">Magazin:</span>
                            <span className="text-slate-200">{storeName || 'Nespecificat'}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700/50">
                            <span className="text-slate-500 uppercase tracking-wider">Actualizat:</span>
                            <span className="text-slate-200">{new Date(generatedAt).toLocaleString('ro-RO')}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={onRefresh}
                disabled={isRefreshing}
                data-testid="ai-refresh-button"
                className="w-full md:w-auto z-10 flex items-center justify-center gap-3 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all border border-indigo-500 disabled:opacity-50"
            >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Se re-analizează...' : 'Reîmprospătează analiza'}
            </button>
        </header>
    );
};
