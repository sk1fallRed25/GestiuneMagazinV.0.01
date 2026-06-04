import React from 'react';
import { FileText, HelpCircle } from 'lucide-react';

export const NirPage: React.FC = () => {
    const futureFeatures = [
        "Import XML e-Factura",
        "Matching furnizor-produs",
        "Confirmare manuală produse",
        "Conversii bax/buc/kg",
        "Detectare diferențe TVA",
        "Detectare linii SGR",
        "Generare NIR draft",
        "Finalizare NIR și actualizare stoc"
    ];

    return (
        <div data-testid="nir-page" className="p-8 max-w-4xl mx-auto pb-32 font-sans bg-gray-50/30 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                        <FileText size={28} className="text-indigo-600" />
                        NIR / Recepție din e-Factura
                    </h1>
                    <p className="text-gray-400 font-medium mt-1">
                        Modul pentru import facturi ANAF / e-Factura și generare Note de Intrare Recepție.
                    </p>
                </div>
            </div>

            {/* Content Card */}
            <div data-testid="nir-coming-soon-card" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full flex items-center justify-center">
                    <span className="text-indigo-600 font-black text-xs uppercase rotate-12 -mt-4 -mr-4 bg-indigo-100 px-3 py-1 rounded border border-indigo-200">
                        v0.3.0
                    </span>
                </div>
                
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-black uppercase tracking-wider text-indigo-700">
                            În dezvoltare
                        </span>
                    </div>

                    <h2 className="text-2xl font-black text-gray-800 mb-4">Modul în lucru</h2>
                    
                    <p className="text-slate-600 text-sm font-semibold leading-relaxed mb-6">
                        Acest modul va permite importul facturilor primite prin ANAF/e-Factura, potrivirea produselor din factură cu produsele din magazin și generarea NIR.
                    </p>

                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Funcționalități Viitoare</h3>
                    <ul data-testid="nir-feature-list" className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                        {futureFeatures.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 text-xs">✓</span>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="group relative inline-block">
                        <button 
                            disabled 
                            data-testid="nir-import-disabled-button"
                            className="px-6 py-3.5 bg-indigo-200 text-indigo-400 font-black rounded-2xl cursor-not-allowed text-sm uppercase tracking-wider border border-indigo-150 flex items-center gap-2"
                        >
                            <span>Importă factură</span>
                            <HelpCircle size={16} />
                        </button>
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg whitespace-nowrap z-50">
                            Funcționalitatea va fi disponibilă într-o versiune viitoare.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NirPage;
