import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { ArrowRightLeft, Store, Warehouse, ChevronRight, CheckCircle, AlertCircle, Loader, Package } from 'lucide-react';

interface ProdusTransfer {
    id: number;
    nume: string;
    stoc_depozit: number;
    stoc_magazin: number;
    cod_bare: string;
}

export default function TransferMarfa() {
    const [produse, setProduse] = useState<ProdusTransfer[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedProdusId, setSelectedProdusId] = useState<string>('');
    const [cantitate, setCantitate] = useState<string>('');
    const [directie, setDirectie] = useState<'depozit_spre_magazin' | 'magazin_spre_depozit'>('depozit_spre_magazin');
    const [submitting, setSubmitting] = useState(false);

    const fetchProduse = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('id, nume, stoc_depozit, stoc_magazin, cod_bare')
                .order('nume');

            if (error) throw error;
            setProduse(data || []);
        } catch (error: any) {
            toast.error('Eroare la încărcare: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProduse();
    }, []);

    const selectedProdus = produse.find(p => p.id.toString() === selectedProdusId);

    const handleTransfer = async () => {
        if (!selectedProdus) {
            toast.error("Selectează un produs!");
            return;
        }

        const cant = parseInt(cantitate);
        if (isNaN(cant) || cant <= 0) {
            toast.error("Cantitatea trebuie să fie un număr pozitiv.");
            return;
        }

        setSubmitting(true);

        try {
            // 1. RE-VERIFICARE STOC (Critic pentru concurență)
            const { data: currentData, error: fetchError } = await supabase
                .from('produse')
                .select('stoc_depozit, stoc_magazin')
                .eq('id', selectedProdus.id)
                .single();

            if (fetchError || !currentData) throw new Error("Nu s-a putut verifica stocul actual.");

            // 2. Validare Stoc Real
            if (directie === 'depozit_spre_magazin' && currentData.stoc_depozit < cant) {
                throw new Error(`Stoc insuficient în Depozit! Disponibil: ${currentData.stoc_depozit}`);
            }
            if (directie === 'magazin_spre_depozit' && currentData.stoc_magazin < cant) {
                throw new Error(`Stoc insuficient în Magazin! Disponibil: ${currentData.stoc_magazin}`);
            }

            // 3. Calcul Valori Noi
            let nouStocDepozit = currentData.stoc_depozit;
            let nouStocMagazin = currentData.stoc_magazin;

            if (directie === 'depozit_spre_magazin') {
                nouStocDepozit -= cant;
                nouStocMagazin += cant;
            } else {
                nouStocMagazin -= cant;
                nouStocDepozit += cant;
            }

            // 4. Executare Update
            const { error: updateError } = await supabase
                .from('produse')
                .update({
                    stoc_depozit: nouStocDepozit,
                    stoc_magazin: nouStocMagazin
                })
                .eq('id', selectedProdus.id);

            if (updateError) throw updateError;

            toast.success("Transfer realizat cu succes!");
            setCantitate('');
            fetchProduse(); // Refresh UI

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-gray-500 gap-2">
            <Loader className="animate-spin" /> Se încarcă stocurile...
        </div>
    );

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <ArrowRightLeft size={24} />
                    </span>
                    Transfer Intern de Marfă
                </h1>
                <p className="text-gray-500 mt-2 ml-14 max-w-2xl">
                    Gestionează fluxul de produse între depozitul central și rafturile magazinului.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- INPUT CARD (LEFT) --- */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 h-fit">

                    {/* 1. Selectare Produs */}
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Produsul de transferat</label>
                        <div className="relative group">
                            <select
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-gray-700 transition-all cursor-pointer hover:bg-gray-100"
                                value={selectedProdusId}
                                onChange={(e) => setSelectedProdusId(e.target.value)}
                            >
                                <option value="">-- Selectează din listă --</option>
                                {produse.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nume}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={20} />
                        </div>
                    </div>

                    {/* 2. Direcție */}
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Direcție Transfer</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setDirectie('depozit_spre_magazin')}
                                className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                                    directie === 'depozit_spre_magazin'
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-500'
                                        : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Warehouse size={20} /> <ArrowRightLeft size={14} className="opacity-50" /> <Store size={20} />
                                </div>
                                <span className="font-bold text-sm">Depozit ➔ Magazin</span>
                            </button>

                            <button
                                onClick={() => setDirectie('magazin_spre_depozit')}
                                className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                                    directie === 'magazin_spre_depozit'
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-500'
                                        : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Store size={20} /> <ArrowRightLeft size={14} className="opacity-50" /> <Warehouse size={20} />
                                </div>
                                <span className="font-bold text-sm">Magazin ➔ Depozit</span>
                            </button>
                        </div>
                    </div>

                    {/* 3. Cantitate & Confirmare */}
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="w-full sm:w-1/2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Cantitate</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="ex: 50"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xl text-gray-800 transition-all"
                                value={cantitate}
                                onChange={(e) => setCantitate(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleTransfer}
                            disabled={submitting || !selectedProdus}
                            className={`w-full sm:w-1/2 p-4 rounded-xl font-bold text-white shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 text-lg ${
                                submitting || !selectedProdus
                                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                            }`}
                        >
                            {submitting ? <Loader className="animate-spin" /> : <><CheckCircle size={24} /> Confirmă</>}
                        </button>
                    </div>
                </div>

                {/* --- INFO CARD (RIGHT) --- */}
                <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden h-[450px]">

                    {/* Background Effects */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 rounded-full blur-[60px] opacity-10 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                            <AlertCircle size={16} /> Status Stoc
                        </h3>

                        {selectedProdus ? (
                            <div className="space-y-4">
                                <div className={`p-5 rounded-2xl border transition-all ${directie === 'depozit_spre_magazin' ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                                    <div className="flex items-center gap-3 text-slate-400 mb-1 text-xs font-bold uppercase tracking-wide">
                                        <Warehouse size={14} /> Depozit
                                    </div>
                                    <div className="text-4xl font-black text-white tracking-tight">
                                        {selectedProdus.stoc_depozit}
                                        <span className="text-sm font-medium text-slate-500 ml-2 align-middle">buc</span>
                                    </div>
                                </div>

                                <div className="flex justify-center -my-2 opacity-50">
                                    <ArrowRightLeft className="text-slate-400 rotate-90" size={24} />
                                </div>

                                <div className={`p-5 rounded-2xl border transition-all ${directie === 'magazin_spre_depozit' ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                                    <div className="flex items-center gap-3 text-slate-400 mb-1 text-xs font-bold uppercase tracking-wide">
                                        <Store size={14} /> Magazin
                                    </div>
                                    <div className="text-4xl font-black text-white tracking-tight">
                                        {selectedProdus.stoc_magazin}
                                        <span className="text-sm font-medium text-slate-500 ml-2 align-middle">buc</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-600 text-center space-y-4 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-800/20">
                                <Package size={48} className="opacity-20" />
                                <p className="text-sm px-4">Selectează un produs pentru a vedea distribuția stocului.</p>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 pt-6 border-t border-slate-800/50 text-[10px] text-slate-500 text-center font-mono">
                        SYNC: REAL-TIME • DATABASE: CONNECTED
                    </div>
                </div>
            </div>
        </div>
    );
}