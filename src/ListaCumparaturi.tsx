import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Printer, ShoppingCart, AlertTriangle, Check, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ListaCumparaturi() {
    const [produse, setProduse] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Stocăm cantitățile: { [id_produs]: cantitate }
    const [cantitatiDeComandat, setCantitatiDeComandat] = useState<Record<number, number>>({});

    // --- 1. Încărcare Date ---
    const fetchProduseCritice = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('*')
                .order('nume');

            if (error) throw error;

            // Filtrăm produsele sub prag
            const critice = data?.filter((p: any) => {
                const stocTotal = (p.stoc_depozit || 0) + (p.stoc_magazin || 0);
                const prag = p.stoc_minim_depozit || 0;
                return stocTotal <= prag && prag > 0;
            }) || [];

            setProduse(critice);

            // Inițializăm cu valoarea pragului
            const initialState: Record<number, number> = {};
            critice.forEach((p: any) => {
                initialState[p.id] = p.stoc_minim_depozit;
            });
            setCantitatiDeComandat(initialState);

        } catch (error: any) {
            toast.error('Eroare: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProduseCritice();
    }, []);

    // --- 2. Modificare Cantitate (FĂRĂ RESTRICȚII LA TASTARE) ---
    const handleQuantityChange = (id: number, valoare: string) => {
        // Dacă e gol, punem 0 temporar ca să nu crape, dar lăsăm userul să scrie
        const val = valoare === '' ? 0 : parseInt(valoare);

        setCantitatiDeComandat(prev => ({
            ...prev,
            [id]: isNaN(val) ? 0 : val
        }));
    };

    // --- 3. Funcția de Print ---
    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-slate-500 gap-2">
            <Loader className="animate-spin" /> Se generează lista...
        </div>
    );

    return (
        <div className="p-8 max-w-5xl mx-auto">

            {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-8 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><ShoppingCart size={24} /></span>
                        Listă de Cumpărături
                    </h1>
                    <p className="text-gray-500 mt-2 ml-14 max-w-xl">
                        Produse sub pragul de alertă. Dacă introduci o cantitate mai mică decât necesarul, vei fi avertizat.
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition shadow-lg shadow-slate-500/20 font-medium"
                >
                    <Printer size={20} />
                    Printează Lista
                </button>
            </div>

            {/* --- LISTA DE PRODUSE --- */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border-none">

                {produse.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                        <Check className="w-16 h-16 text-green-500 bg-green-100 p-3 rounded-full mb-4" />
                        <h3 className="text-xl font-bold text-gray-700">Totul e în regulă!</h3>
                        <p>Nu există produse sub pragul de alertă în acest moment.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {/* Header Tabel */}
                        <div className="bg-gray-50/50 p-4 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider items-center">
                            <div className="col-span-6">Produs / Stoc Curent</div>
                            <div className="col-span-3 text-center">Prag Alertă</div>
                            <div className="col-span-3 text-right">Cantitate Comandă</div>
                        </div>

                        {produse.map((produs) => {
                            const stocTotal = (produs.stoc_depozit || 0) + (produs.stoc_magazin || 0);
                            const prag = produs.stoc_minim_depozit;

                            // Dacă nu e setat, e undefined, deci punem 0
                            const cantitate = cantitatiDeComandat[produs.id] !== undefined ? cantitatiDeComandat[produs.id] : prag;

                            // Verificăm dacă e eroare (mai puțin decât pragul)
                            const isError = cantitate < prag;

                            return (
                                <div key={produs.id} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-slate-50 transition-colors group">

                                    {/* INFO PRODUS */}
                                    <div className="col-span-12 md:col-span-6 flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 border border-red-100">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">{produs.nume}</h3>
                                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                                <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                                                    Stoc Total: {stocTotal}
                                                </span>
                                                <span className="text-gray-400">•</span>
                                                <span>Cod: {produs.cod_bare || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PRAG ALERTĂ */}
                                    <div className="col-span-6 md:col-span-3 flex flex-col items-center justify-center">
                                        <span className="text-xs text-gray-400 uppercase font-bold mb-1">Prag Minim</span>
                                        <span className="text-xl font-bold text-gray-700 bg-gray-100 px-4 py-1 rounded-lg">
                                            {prag} <span className="text-xs text-gray-400 font-normal">buc</span>
                                        </span>
                                    </div>

                                    {/* INPUT CANTITATE */}
                                    <div className="col-span-6 md:col-span-3 flex justify-end">
                                        <div className="flex flex-col items-end w-full">
                                            <label className={`text-xs font-bold mb-2 uppercase block md:hidden ${isError ? 'text-red-500' : 'text-indigo-600'}`}>
                                                De Comandat
                                            </label>

                                            <div className="relative w-full md:w-32">
                                                <input
                                                    type="number"
                                                    // AM SCOS "min={prag}" CA SĂ POȚI SCRIE LIBER
                                                    value={cantitate}
                                                    onChange={(e) => handleQuantityChange(produs.id, e.target.value)}
                                                    className={`w-full pl-4 pr-12 py-3 bg-white border-2 rounded-xl font-bold text-xl outline-none transition-all text-center shadow-sm 
                                                        ${isError
                                                        ? 'border-red-300 text-red-600 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                                                        : 'border-indigo-100 text-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                                                    }
                                                    `}
                                                />
                                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none ${isError ? 'text-red-400' : 'text-gray-400'}`}>
                                                    buc
                                                </span>
                                            </div>

                                            {/* Mesaj de avertizare condiționat */}
                                            {isError ? (
                                                <p className="text-[10px] text-red-500 font-bold mt-2 text-right flex items-center gap-1 animate-pulse">
                                                    <AlertCircle size={10} /> Sub pragul de {prag}!
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-gray-400 mt-2 text-right">
                                                    Cantitate OK
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CSS PENTRU PRINT */}
            <style>{`
                @media print {
                    aside, header, button, .print\\:hidden { display: none !important; }
                    body { background: white; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:border-none { border: none !important; }
                    input { border: none !important; background: transparent !important; padding: 0 !important; text-align: right; }
                    /* Ascundem mesajele de eroare la print ca să iasă curat */
                    .text-red-500 { color: black !important; } 
                }
            `}</style>
        </div>
    );
}