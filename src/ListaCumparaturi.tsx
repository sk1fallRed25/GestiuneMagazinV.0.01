import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Printer, ShoppingCart, AlertTriangle, Check, Loader, Package, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ListaCumparaturi() {
    const [produse, setProduse] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cantitatiDeComandat, setCantitatiDeComandat] = useState<Record<number, number>>({});

    const fetchProduseCritice = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('*')
                .order('nume');

            if (error) throw error;

            // Filtrăm produsele critice
            const critice = data?.filter((p: any) => {
                const stocTotal = (p.stoc_depozit || 0) + (p.stoc_magazin || 0);
                const prag = p.stoc_minim_depozit || 0;
                // Considerăm critic dacă e sub prag sau stoc 0
                return stocTotal <= prag && prag > 0;
            }) || [];

            setProduse(critice);

            // Inițializăm cantitatea sugerată (Prag - Stoc + Buffer 20%)
            const initialState: Record<number, number> = {};
            critice.forEach((p: any) => {
                const stocTotal = (p.stoc_depozit || 0) + (p.stoc_magazin || 0);
                const necesar = Math.max(0, p.stoc_minim_depozit - stocTotal);
                // Sugerăm o comandă care să acopere deficitul + 20%
                initialState[p.id] = Math.ceil(necesar * 1.2) || p.stoc_minim_depozit;
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

    const handleQuantityChange = (id: number, valoare: string) => {
        const val = parseInt(valoare) || 0;
        setCantitatiDeComandat(prev => ({ ...prev, [id]: val }));
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-gray-500 gap-3">
            <Loader className="animate-spin text-indigo-600" /> Se generează necesarul de aprovizionare...
        </div>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50/50 pb-20">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200"><ShoppingCart size={24} /></span>
                        Listă de Cumpărături
                    </h1>
                    <p className="text-gray-500 mt-2 ml-1 text-lg">
                        Produse identificate automat sub pragul de siguranță.
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    disabled={produse.length === 0}
                    className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-900 transition shadow-xl hover:shadow-2xl active:scale-95 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Printer size={20} />
                    Printează Necesarul
                </button>
            </div>

            {/* --- LISTA --- */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">

                {/* Antet Tabel (Vizibil la Print) */}
                <div className="hidden print:block p-8 border-b-2 border-black mb-4">
                    <h1 className="text-2xl font-bold uppercase">Necesar Aprovizionare</h1>
                    <p>Data generării: {new Date().toLocaleDateString('ro-RO')}</p>
                </div>

                {produse.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center text-gray-400">
                        <div className="bg-green-100 p-6 rounded-full mb-6 animate-in zoom-in duration-300">
                            <Check className="w-16 h-16 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Stoc Optim!</h3>
                        <p className="text-lg">Nu există produse sub pragul de alertă în acest moment.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {/* Header Coloane */}
                        <div className="bg-gray-50/80 p-5 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider items-center border-b border-gray-100 print:bg-white print:border-black print:text-black">
                            <div className="col-span-5 md:col-span-6 pl-2">Produs</div>
                            <div className="col-span-3 text-center">Stoc vs Prag</div>
                            <div className="col-span-4 md:col-span-3 text-right pr-2">Comandă</div>
                        </div>

                        {produse.map((produs) => {
                            const stocTotal = (produs.stoc_depozit || 0) + (produs.stoc_magazin || 0);
                            const prag = produs.stoc_minim_depozit;
                            const cantitate = cantitatiDeComandat[produs.id] || 0;
                            const isWarning = cantitate < (prag - stocTotal); // Avertizăm dacă comanda nu acoperă deficitul

                            return (
                                <div key={produs.id} className="p-5 grid grid-cols-12 gap-6 items-center hover:bg-slate-50 transition-colors group print:border-b print:border-gray-300 print:break-inside-avoid">

                                    {/* INFO PRODUS */}
                                    <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 border border-red-100 print:hidden shadow-sm">
                                            <Package size={22} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg leading-tight">{produs.nume}</h3>
                                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 font-medium">
                                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 text-xs">
                                                    {produs.cod_bare || 'FĂRĂ COD'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* METRICI */}
                                    <div className="col-span-6 md:col-span-3 flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm print:shadow-none print:border-0">
                                            <span className="text-red-600">{stocTotal}</span>
                                            <span className="text-gray-300">/</span>
                                            <span>{prag}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wide print:hidden">Curent / Minim</span>
                                    </div>

                                    {/* INPUT COMANDĂ */}
                                    <div className="col-span-6 md:col-span-3 flex justify-end">
                                        <div className="flex flex-col items-end w-full">
                                            <div className="relative w-full md:w-36 group-hover:scale-105 transition-transform duration-200">
                                                <input
                                                    type="number"
                                                    value={cantitate}
                                                    onChange={(e) => handleQuantityChange(produs.id, e.target.value)}
                                                    className={`w-full pl-4 pr-10 py-3 bg-white border-2 rounded-xl font-bold text-xl outline-none text-center shadow-sm print:border-0 print:text-right print:shadow-none print:bg-transparent ${
                                                        isWarning && cantitate > 0
                                                            ? 'border-yellow-400 text-yellow-700 focus:border-yellow-500'
                                                            : 'border-indigo-100 text-gray-800 focus:border-indigo-500'
                                                    }`}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none print:hidden">
                                                    buc
                                                </span>
                                            </div>

                                            {/* Mesaje contextuale */}
                                            {isWarning && cantitate > 0 && (
                                                <p className="text-[10px] text-yellow-600 font-bold mt-1.5 flex items-center gap-1 print:hidden">
                                                    <AlertCircle size={10} /> Sub necesar!
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

            {/* STILURI PRINT */}
            <style>{`
                @media print {
                    @page { margin: 1.5cm; size: A4; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    nav, aside, button, .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .print\\:border-0 { border: 0 !important; }
                    input { text-align: right; font-weight: 800; font-size: 14pt; }
                }
            `}</style>
        </div>
    );
}