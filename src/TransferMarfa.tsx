import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { ArrowRightLeft, Package, Store, Warehouse, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

// Definim tipul pentru produs
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

    // State-uri pentru formular
    const [selectedProdusId, setSelectedProdusId] = useState<string>('');
    const [cantitate, setCantitate] = useState<string>('');
    const [directie, setDirectie] = useState<'depozit_spre_magazin' | 'magazin_spre_depozit'>('depozit_spre_magazin');
    const [submitting, setSubmitting] = useState(false);

    // Încărcăm produsele
    const fetchProduse = async () => {
        setLoading(true);
        // Selectăm explicit coloanele necesare
        const { data, error } = await supabase
            .from('produse')
            .select('id, nume, stoc_depozit, stoc_magazin, cod_bare')
            .order('nume');

        if (error) {
            toast.error('Eroare la încărcare produse: ' + error.message);
        } else {
            setProduse(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProduse();
    }, []);

    // Găsim produsul selectat complet
    const selectedProdus = produse.find(p => p.id.toString() === selectedProdusId);

    const handleTransfer = async () => {
        if (!selectedProdus) return toast.error("Selectează un produs!");
        const cant = parseInt(cantitate);
        if (isNaN(cant) || cant <= 0) return toast.error("Introdu o cantitate validă!");

        // 1. Verificăm dacă avem stoc suficient
        if (directie === 'depozit_spre_magazin' && selectedProdus.stoc_depozit < cant) {
            return toast.error(`Stoc insuficient în Depozit! Ai doar ${selectedProdus.stoc_depozit}.`);
        }
        if (directie === 'magazin_spre_depozit' && selectedProdus.stoc_magazin < cant) {
            return toast.error(`Stoc insuficient în Magazin! Ai doar ${selectedProdus.stoc_magazin}.`);
        }

        setSubmitting(true);

        // 2. Calculăm noile valori
        let nouStocDepozit = selectedProdus.stoc_depozit;
        let nouStocMagazin = selectedProdus.stoc_magazin;

        if (directie === 'depozit_spre_magazin') {
            nouStocDepozit -= cant;
            nouStocMagazin += cant;
        } else {
            nouStocMagazin -= cant;
            nouStocDepozit += cant;
        }

        // 3. Trimitem Update-ul către Supabase
        try {
            const { error } = await supabase
                .from('produse')
                .update({
                    stoc_depozit: nouStocDepozit,
                    stoc_magazin: nouStocMagazin // ASIGURĂ-TE CĂ ACEASTA E COLOANA CORECTĂ ÎN BAZĂ
                })
                .eq('id', selectedProdus.id);

            if (error) throw error;

            toast.success("Transfer realizat cu succes!");

            // Resetăm form-ul și reîncărcăm datele
            setCantitate('');
            await fetchProduse(); // Refresh ca să vedem noile stocuri

        } catch (err: any) {
            toast.error("Eroare la transfer: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                        <ArrowRightLeft size={28} />
                    </div>
                    Transfer Marfă
                </h1>
                <p className="text-gray-500 mt-2 ml-14">Mută produse între Depozit și Magazin (Raft).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* --- CARDUL DE INPUT (STANGA) --- */}
                <div className="md:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-8">

                    {/* Selectare Produs */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Alege Produsul</label>
                        <div className="relative">
                            <select
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium text-gray-700"
                                value={selectedProdusId}
                                onChange={(e) => setSelectedProdusId(e.target.value)}
                            >
                                <option value="">-- Selectează un produs --</option>
                                {produse.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nume} (Depozit: {p.stoc_depozit} | Magazin: {p.stoc_magazin})
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={20} />
                        </div>
                    </div>

                    {/* Direcție Transfer */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-3">Direcție Transfer</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setDirectie('depozit_spre_magazin')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                                    directie === 'depozit_spre_magazin'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                        : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-2 font-bold">
                                    <Warehouse size={20} /> <ArrowRightLeft size={16} /> <Store size={20} />
                                </div>
                                <span className="text-xs font-semibold">Depozit {'->'} Magazin</span>
                            </button>

                            <button
                                onClick={() => setDirectie('magazin_spre_depozit')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                                    directie === 'magazin_spre_depozit'
                                        ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                                        : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-2 font-bold">
                                    <Store size={20} /> <ArrowRightLeft size={16} /> <Warehouse size={20} />
                                </div>
                                <span className="text-xs font-semibold">Magazin {'->'} Depozit</span>
                            </button>
                        </div>
                    </div>

                    {/* Cantitate și Buton */}
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Cantitate de transferat</label>
                            <input
                                type="number"
                                placeholder="ex: 10"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                                value={cantitate}
                                onChange={(e) => setCantitate(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleTransfer}
                            disabled={submitting || !selectedProdus}
                            className={`px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center gap-2 ${
                                submitting || !selectedProdus ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                            }`}
                        >
                            {submitting ? 'Se procesează...' : (
                                <>Transferă <CheckCircle size={20} /></>
                            )}
                        </button>
                    </div>

                </div>

                {/* --- CARD INFO VIZUAL (DREAPTA) --- */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>

                    <div>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><AlertCircle size={18} className="text-blue-400"/> Status Curent</h3>

                        {selectedProdus ? (
                            <div className="space-y-6">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-3 text-slate-400 mb-1 text-sm">
                                        <Warehouse size={16} /> Stoc Depozit
                                    </div>
                                    <div className="text-3xl font-bold text-white tracking-tight">{selectedProdus.stoc_depozit} <span className="text-sm font-normal text-slate-500">buc</span></div>
                                </div>

                                <div className="flex justify-center -my-3 z-10 relative">
                                    <div className="bg-slate-700 rounded-full p-2 border-4 border-slate-900">
                                        <ArrowRightLeft size={20} className="text-slate-300" />
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-3 text-slate-400 mb-1 text-sm">
                                        <Store size={16} /> Stoc Magazin
                                    </div>
                                    <div className="text-3xl font-bold text-white tracking-tight">{selectedProdus.stoc_magazin} <span className="text-sm font-normal text-slate-500">buc</span></div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-slate-500 text-sm text-center italic">
                                Selectează un produs din stânga pentru a vedea detaliile.
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 text-center">
                        Modificările se aplică instant în baza de date.
                    </div>
                </div>
            </div>
        </div>
    );
}