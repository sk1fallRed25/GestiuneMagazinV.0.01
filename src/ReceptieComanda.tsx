import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';

interface ComandaAprobata {
    id: number;
    created_at: string;
    total_valoare: number;
    furnizor_id: number;
    furnizor: {
        nume_firma: string;
    };
    detalii: {
        id: number;
        produs_id: number;
        cantitate_aprobata: number;
        pret_unitar: number;
        produs: {
            nume: string;
        };
    }[];
}

export default function ReceptieComanda() {
    const [comenzi, setComenzi] = useState<ComandaAprobata[]>([]);
    const [selectedComanda, setSelectedComanda] = useState<ComandaAprobata | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchComenziAprobate = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('comenzi_agenti')
                .select('*, furnizor_id, furnizor:furnizori(nume_firma), detalii:comenzi_agenti_detalii(*, produs:produse(nume))')
                .eq('status', 'approved');
            
            if (error) throw error;
            setComenzi(data || []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchComenziAprobate();
    }, [fetchComenziAprobate]);

    const handleFinalizeReceptie = async () => {
        if (!selectedComanda) return;

        const promise = new Promise(async (resolve, reject) => {
            try {
                const { data: receptie, error: errReceptie } = await supabase.from('receptii').insert({
                    furnizor_id: selectedComanda.furnizor_id,
                    numar_factura: `Comanda-${selectedComanda.id}`,
                    data_factura: new Date().toISOString(),
                    total_valoare: selectedComanda.total_valoare
                }).select().single();
                if (errReceptie) throw errReceptie;

                for (const linie of selectedComanda.detalii) {
                    const cantitateDeAdaugat = linie.cantitate_aprobata;
                    
                    await supabase.from('receptii_detalii').insert({
                        receptie_id: receptie.id,
                        produs_id: linie.produs_id,
                        cantitate_totala: cantitateDeAdaugat,
                        pret_achizitie_unitar: linie.pret_unitar
                    });

                    const { error: rpcError } = await supabase.rpc('adauga_stoc_depozit', {
                        p_produs_id: linie.produs_id,
                        p_cantitate: cantitateDeAdaugat,
                        p_pret_achizitie: linie.pret_unitar,
                        p_pret_vanzare: 0
                    });
                    if (rpcError) throw rpcError;
                }

                await supabase.from('comenzi_agenti').update({ status: 'delivered' }).eq('id', selectedComanda.id);

                resolve('Recepția a fost finalizată și stocul actualizat!');
            } catch (error) {
                reject(error);
            }
        });

        toast.promise(promise, {
            loading: 'Se procesează recepția...',
            success: (msg) => {
                setSelectedComanda(null);
                fetchComenziAprobate();
                return `${msg}`;
            },
            error: (err: any) => `Eroare: ${err.message}`
        });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Recepție Comenzi Aprobate</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border">
                        <h2 className="font-bold text-lg mb-2">Comenzi de Recepționat</h2>
                        <div className="space-y-2">
                            {loading ? <p>Se încarcă...</p> : comenzi.map(c => (
                                <button key={c.id} onClick={() => setSelectedComanda(c)} className={`w-full text-left p-3 rounded-lg ${selectedComanda?.id === c.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
                                    <p className="font-bold">Comanda #{c.id}</p>
                                    <p className="text-sm">{c.furnizor.nume_firma}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
                        {selectedComanda ? (
                            <div>
                                <h2 className="text-xl font-bold mb-4">Detalii Comanda #{selectedComanda.id}</h2>
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50"><tr>
                                        <th className="py-2 px-3">Produs</th>
                                        <th className="py-2 px-3 text-center">Cant. Aprobată</th>
                                        <th className="py-2 px-3 text-right">Preț</th>
                                        <th className="py-2 px-3 text-right">Total</th>
                                    </tr></thead>
                                    <tbody>
                                        {selectedComanda.detalii.map(d => (
                                            <tr key={d.id} className="border-b">
                                                <td className="py-2 px-3 font-medium">{d.produs.nume}</td>
                                                <td className="py-2 px-3 text-center font-bold">{d.cantitate_aprobata}</td>
                                                <td className="py-2 px-3 text-right">{d.pret_unitar.toFixed(2)}</td>
                                                <td className="py-2 px-3 text-right font-mono">{(d.cantitate_aprobata * d.pret_unitar).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-6 flex justify-end">
                                    <button onClick={handleFinalizeReceptie} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700">
                                        Finalizează Recepția
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500">
                                <p>Selectează o comandă din stânga pentru a o recepționa.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}