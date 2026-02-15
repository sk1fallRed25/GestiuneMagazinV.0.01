import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { Truck, CheckCircle, Package, Calendar, ArrowRight, ClipboardList, AlertCircle, FileText } from 'lucide-react';

// --- TIPURI ---
interface DetaliuComanda {
    id: number;
    produs_id: number;
    cantitate_aprobata: number;
    pret_unitar: number;
    produs: {
        nume: string;
        cod_bare: string;
    } | null; // Poate fi null dacă produsul e șters
}

interface ComandaAprobata {
    id: number;
    created_at: string;
    total_valoare: number;
    furnizor_id: number;
    furnizor: {
        nume_firma: string; // Verifică dacă e 'nume' sau 'nume_firma' în DB
    } | null;
    detalii: DetaliuComanda[];
}

export default function ReceptieComanda() {
    const [comenzi, setComenzi] = useState<ComandaAprobata[]>([]);
    const [selectedComanda, setSelectedComanda] = useState<ComandaAprobata | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchComenziAprobate = useCallback(async () => {
        setLoading(true);
        try {
            // Selectăm doar comenzile care sunt 'approved' (aprobate de agent) și gata de recepție
            const { data, error } = await supabase
                .from('comenzi_agenti')
                .select(`
                    *,
                    furnizor:furnizori(nume_firma),
                    detalii:comenzi_agenti_detalii(
                        *,
                        produs:produse(nume, cod_bare)
                    )
                `)
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComenzi(data || []);

            // Dacă comanda selectată nu mai există în listă (a fost procesată), o deselectăm
            if (selectedComanda && !data?.find(c => c.id === selectedComanda.id)) {
                setSelectedComanda(null);
            }

        } catch (err: any) {
            console.error(err);
            toast.error("Eroare la încărcare comenzi.");
        } finally {
            setLoading(false);
        }
    }, [selectedComanda]);

    useEffect(() => {
        fetchComenziAprobate();
    }, [fetchComenziAprobate]);

    const handleFinalizeReceptie = async () => {
        if (!selectedComanda) return;
        setProcessing(true);

        const promise = (async () => {
            // 1. Creare Intrare în Recepții (NIR)
            // Folosim un număr de factură generat automat bazat pe ID-ul comenzii
            const nrFactura = `CMD-INT-${selectedComanda.id}`;

            const { data: receptie, error: errReceptie } = await supabase.from('receptii').insert({
                furnizor_id: selectedComanda.furnizor_id,
                numar_factura: nrFactura,
                data_factura: new Date().toISOString(),
                total_valoare: selectedComanda.total_valoare
            }).select().single();

            if (errReceptie) throw errReceptie;

            // 2. Procesare linii și actualizare stoc
            for (const linie of selectedComanda.detalii) {
                const cantitate = linie.cantitate_aprobata;

                // Salvăm detaliile recepției
                await supabase.from('receptii_detalii').insert({
                    receptie_id: receptie.id,
                    produs_id: linie.produs_id,
                    cantitate_totala: cantitate,
                    pret_achizitie_unitar: linie.pret_unitar,
                    // Opțional: Putem aduce și prețul vechi de vânzare dacă e nevoie
                });

                // Actualizăm stocul fizic (RPC)
                // Notă: p_pret_vanzare 0 înseamnă că păstrăm prețul actual
                const { error: rpcError } = await supabase.rpc('adauga_stoc_depozit', {
                    p_produs_id: linie.produs_id,
                    p_cantitate: cantitate,
                    p_pret_achizitie: linie.pret_unitar,
                    p_pret_vanzare: 0
                });

                if (rpcError) throw rpcError;
            }

            // 3. Marcare comandă ca 'delivered' (finalizată)
            const { error: updateError } = await supabase
                .from('comenzi_agenti')
                .update({ status: 'delivered' })
                .eq('id', selectedComanda.id);

            if (updateError) throw updateError;

            return 'Recepție finalizată cu succes!';
        })();

        toast.promise(promise, {
            loading: 'Se actualizează stocurile...',
            success: (msg) => {
                setProcessing(false);
                setSelectedComanda(null);
                fetchComenziAprobate();
                return msg;
            },
            error: (err: any) => {
                setProcessing(false);
                return `Eroare: ${err.message}`;
            }
        });
    };

    return (
        <div className="p-8 bg-gray-50/50 min-h-screen pb-20">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-green-600 p-2 rounded-xl text-white shadow-lg shadow-green-200"><CheckCircle size={28} /></span>
                        Recepție Comenzi Agenți
                    </h1>
                    <p className="text-gray-500 mt-2 ml-14">Transformă comenzile aprobate în intrări de marfă (NIR) și actualizează stocul.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-200px)]">

                    {/* --- LISTA COMENZI (STÂNGA) --- */}
                    <div className="lg:w-1/3 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                <Truck size={18} className="text-blue-500"/> Comenzi Așteptare ({comenzi.length})
                            </h2>
                        </div>

                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {loading ? (
                                <div className="p-4 text-center text-gray-400 text-sm">Se încarcă...</div>
                            ) : comenzi.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                    <ClipboardList size={48} className="mb-2 opacity-20" />
                                    <p>Nu există comenzi de recepționat.</p>
                                </div>
                            ) : (
                                comenzi.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedComanda(c)}
                                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 border flex justify-between items-center group ${
                                            selectedComanda?.id === c.id
                                                ? 'bg-blue-600 text-white shadow-md border-blue-600'
                                                : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-700'
                                        }`}
                                    >
                                        <div>
                                            <p className="font-bold text-sm flex items-center gap-2">
                                                Comanda #{c.id}
                                            </p>
                                            <p className={`text-xs mt-1 ${selectedComanda?.id === c.id ? 'text-blue-200' : 'text-gray-500'}`}>
                                                {c.furnizor?.nume_firma || 'Furnizor Necunoscut'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-mono block ${selectedComanda?.id === c.id ? 'text-white' : 'text-gray-900 font-bold'}`}>
                                                {new Date(c.created_at).toLocaleDateString('ro-RO')}
                                            </span>
                                            <ArrowRight size={16} className={`ml-auto mt-1 transition-transform ${selectedComanda?.id === c.id ? 'text-white translate-x-1' : 'text-gray-300'}`} />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* --- DETALII COMANDĂ (DREAPTA) --- */}
                    <div className="lg:w-2/3 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden relative">
                        {selectedComanda ? (
                            <>
                                {/* Detalii Header */}
                                <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                            <FileText className="text-indigo-500" />
                                            Detalii Recepție #{selectedComanda.id}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                            <Calendar size={14} /> Data emiterii: {new Date(selectedComanda.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase font-bold">Total Valoare</p>
                                        <p className="text-2xl font-bold text-green-600">{selectedComanda.total_valoare} RON</p>
                                    </div>
                                </div>

                                {/* Tabel Produse */}
                                <div className="flex-1 overflow-y-auto p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                                        <tr>
                                            <th className="py-3 px-6">Produs</th>
                                            <th className="py-3 px-6 text-center">Cantitate</th>
                                            <th className="py-3 px-6 text-right">Preț Achiziție</th>
                                            <th className="py-3 px-6 text-right">Subtotal</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                        {selectedComanda.detalii.map(d => (
                                            <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-6">
                                                    <div className="font-bold text-gray-800">{d.produs?.nume || 'Produs Șters'}</div>
                                                    <div className="text-xs text-gray-400 font-mono">{d.produs?.cod_bare}</div>
                                                </td>
                                                <td className="py-3 px-6 text-center">
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">{d.cantitate_aprobata}</span>
                                                </td>
                                                <td className="py-3 px-6 text-right font-mono text-gray-600">{d.pret_unitar.toFixed(2)}</td>
                                                <td className="py-3 px-6 text-right font-bold text-gray-800">{(d.cantitate_aprobata * d.pret_unitar).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        La finalizare, stocul se va actualiza automat în depozit.
                                    </div>
                                    <button
                                        onClick={handleFinalizeReceptie}
                                        disabled={processing}
                                        className="bg-green-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {processing ? 'Se procesează...' : <><CheckCircle size={20} /> Confirmă Recepția</>}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <Package size={64} className="mb-4 text-gray-200" />
                                <p className="text-lg font-medium">Nicio comandă selectată</p>
                                <p className="text-sm">Alege o comandă din lista din stânga pentru a începe recepția.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}