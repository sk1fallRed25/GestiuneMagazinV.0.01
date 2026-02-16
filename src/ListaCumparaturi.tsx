import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
    ShoppingCart, Printer, Truck, Search,
    AlertTriangle, CheckCircle, Building2, Filter, Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Furnizor {
    id: number;
    nume: string;
    adresa: string;
}

interface ProdusNecesare {
    id: number;
    nume: string;
    cod_bare: string;
    stoc_actual: number;
    stoc_minim: number;
    metoda: 'Direct' | 'Agent';
}

export default function ListaCumparaturi() {
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [selectedFurnizorId, setSelectedFurnizorId] = useState<string>('all');
    const [produse, setProduse] = useState<ProdusNecesare[]>([]);
    const [loading, setLoading] = useState(true);

    // Pragul de siguranță implicit pentru alertă
    const SAFETY_THRESHOLD = 10;

    // --- 1. ÎNCĂRCARE LISTĂ FURNIZORI ---
    useEffect(() => {
        const fetchFurnizori = async () => {
            const { data } = await supabase
                .from('furnizori')
                .select('id, nume, adresa')
                .order('nume');
            if (data) setFurnizori(data);
        };
        fetchFurnizori();
    }, []);

    // --- 2. LOGICĂ HIBRIDĂ DE FILTRARE (DIRECT + AGENT) ---
    const fetchNecesare = useCallback(async () => {
        setLoading(true);
        try {
            let idsToFilter: number[] = [];

            if (selectedFurnizorId === 'all') {
                // Dacă selectăm "Toți", luăm toate produsele pentru analiză
                const { data: toate } = await supabase.from('produse').select('id');
                idsToFilter = toate?.map(p => p.id) || [];
            } else {
                const fId = parseInt(selectedFurnizorId);

                // A. Produse alocate DIRECT furnizorului
                const { data: directe } = await supabase
                    .from('furnizor_produse')
                    .select('produs_id')
                    .eq('furnizor_id', fId);

                // B. Produse alocate prin AGENȚII furnizorului
                const { data: prinAgenti } = await supabase
                    .from('agent_produse')
                    .select('produs_id, agenti!inner(furnizor_id)')
                    .eq('agenti.furnizor_id', fId);

                idsToFilter = Array.from(new Set([
                    ...(directe?.map(i => i.produs_id) || []),
                    ...(prinAgenti?.map(i => i.produs_id) || [])
                ]));
            }

            if (idsToFilter.length === 0) {
                setProduse([]);
                return;
            }

            // Interogăm stocurile pentru produsele identificate
            const { data: stocuri, error } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
                .in('id', idsToFilter);

            if (error) throw error;

            // Filtrare: doar cele sub pragul de siguranță
            const necesar = (stocuri || [])
                .map(p => ({
                    id: p.id,
                    nume: p.nume,
                    cod_bare: p.cod_bare,
                    stoc_actual: (p.stoc_depozit || 0) + (p.stoc_magazin || 0),
                    stoc_minim: SAFETY_THRESHOLD,
                    metoda: 'Direct' as const // Etichetă generică
                }))
                .filter(p => p.stoc_actual < p.stoc_minim);

            setProduse(necesar);
        } catch (err: any) {
            toast.error("Eroare la generarea listei: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedFurnizorId]);

    useEffect(() => {
        fetchNecesare();
    }, [fetchNecesare]);

    // --- 3. FUNCȚIE PRINTARE ---
    const handlePrint = () => {
        if (produse.length === 0) return toast.error("Lista este goală.");
        window.print();
    };

    return (
        <div className="p-8 max-w-5xl mx-auto min-h-screen bg-white md:bg-gray-50/30 pb-20">

            {/* Secțiune Filtre (Ascunsă la Print) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-orange-600 p-2 rounded-xl text-white shadow-lg">
                            <ShoppingCart size={28} />
                        </span>
                        Listă Cumpărături
                    </h1>
                    <p className="text-gray-500 mt-2">Filtrați necesarul în funcție de locația furnizorului.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-200 w-full md:w-auto">
                    <Filter size={18} className="text-gray-400 ml-2" />
                    <select
                        className="bg-transparent outline-none font-bold text-gray-700 cursor-pointer w-full"
                        value={selectedFurnizorId}
                        onChange={(e) => setSelectedFurnizorId(e.target.value)}
                    >
                        <option value="all">Toate Produsele (Achiziții Locale)</option>
                        {furnizori.map(f => (
                            <option key={f.id} value={f.id}>{f.nume} - {f.adresa}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Document Printabil */}
            <div id="print-area" className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Necesar Aprovizionare</h2>
                        <div className="flex items-center gap-2 text-orange-600 font-bold mt-1">
                            <Truck size={16} />
                            <span>Furnizor: {selectedFurnizorId === 'all' ? 'Toate sursele' : furnizori.find(f => f.id.toString() === selectedFurnizorId)?.nume}</span>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="no-print bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg"
                    >
                        <Printer size={18} /> Printează Lista
                    </button>
                </div>

                <div className="p-0">
                    {loading ? (
                        <div className="p-20 text-center text-gray-400 italic">Se analizează baza de date...</div>
                    ) : produse.length === 0 ? (
                        <div className="p-20 text-center">
                            <CheckCircle size={48} className="mx-auto text-green-500 mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-gray-800">Stoc Optim!</h3>
                            <p className="text-gray-500">Nu există produse sub pragul critic pentru selecția curentă.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">
                            <tr>
                                <th className="px-8 py-5">Produs</th>
                                <th className="px-8 py-5 text-center">Stoc</th>
                                <th className="px-8 py-5 text-center">Prag</th>
                                <th className="px-8 py-5 text-right">Necesar Recomandat</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {produse.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-gray-800">{p.nume}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{p.cod_bare}</p>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-red-600 font-black">{p.stoc_actual}</span>
                                    </td>
                                    <td className="px-8 py-5 text-center text-gray-400 font-medium">
                                        {p.stoc_minim}
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-indigo-600">
                                        + {Math.max(20, p.stoc_minim * 3 - p.stoc_actual)} buc
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Mesaj de subsol pentru print */}
            <div className="only-print mt-10 text-center text-gray-400 text-[10px] uppercase tracking-widest border-t pt-5">
                Raport generat de MagazinPro - {new Date().toLocaleString('ro-RO')}
            </div>

            {/* CSS pentru formatare print */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .only-print { display: block !important; }
                    body { background: white !important; padding: 0 !important; }
                    #print-area { border: none !important; box-shadow: none !important; width: 100% !important; }
                    table { width: 100% !important; }
                    th, td { border-bottom: 1px solid #eee !important; }
                }
                .only-print { display: none; }
            `}</style>
        </div>
    );
}