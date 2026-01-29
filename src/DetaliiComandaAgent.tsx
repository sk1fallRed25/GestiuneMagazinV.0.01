import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';

interface ComandaPrimitaDetalii {
    id: number;
    created_at: string;
    status: string;
    cantitate: number;
    observatii: string;
    data_livrare_estimata: string;
    produs: {
        nume: string;
        cod_bare: string;
    };
    furnizor: {
        nume_firma: string;
    };
}

export default function DetaliiComandaAgent() {
    const { id: comandaId } = useParams();
    const navigate = useNavigate();
    const [comanda, setComanda] = useState<ComandaPrimitaDetalii | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDetalii = useCallback(async () => {
        if (!comandaId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('comenzi_catre_furnizor')
                .select('*, produs:produse(nume, cod_bare), furnizor:furnizori(nume_firma)')
                .eq('id', comandaId)
                .single();
            
            if (error) throw error;
            setComanda(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [comandaId]);

    useEffect(() => {
        fetchDetalii();
    }, [fetchDetalii]);

    const handleUpdateStatus = async (status: 'accepted' | 'rejected') => {
        const promise = supabase.from('comenzi_catre_furnizor').update({ status }).eq('id', comandaId).then();
        // @ts-ignore
        toast.promise(promise, {
            loading: 'Se actualizează statusul...',
            success: () => {
                navigate(-1); // Go back to the previous page (AgentDashboard)
                return `Comandă ${status === 'accepted' ? 'acceptată' : 'refuzată'}!`;
            },
            error: (err) => `Eroare: ${err.message}`
        });
    };

    if (loading) {
        return <div className="p-8 text-center">Se încarcă detaliile comenzii...</div>;
    }

    if (!comanda) {
        return <div className="p-8 text-center text-red-500">Comanda nu a fost găsită.</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline mb-4">← Înapoi la Panou</button>
                <div className="bg-white p-8 rounded-xl shadow-md border">
                    <div className="border-b pb-4 mb-4">
                        <h1 className="text-2xl font-bold text-gray-800">Detalii Comandă #{comanda.id}</h1>
                        <p className="text-sm text-gray-500">De la: {comanda.furnizor.nume_firma}</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Produs</p>
                            <p className="font-bold text-lg">{comanda.produs.nume}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Cantitate Cerută</p>
                            <p className="font-bold text-lg">{comanda.cantitate} buc.</p>
                        </div>
                        {comanda.data_livrare_estimata && <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Dată de livrare estimată</p>
                            <p className="font-bold text-lg">{new Date(comanda.data_livrare_estimata).toLocaleDateString()}</p>
                        </div>}
                        {comanda.observatii && <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm font-bold text-yellow-800">Observații de la Admin</p>
                            <p className="mt-1">{comanda.observatii}</p>
                        </div>}
                    </div>

                    {comanda.status === 'pending' && (
                        <div className="mt-6 pt-6 border-t flex justify-end gap-4">
                            <button onClick={() => handleUpdateStatus('rejected')} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700">
                                Refuză Comanda
                            </button>
                            <button onClick={() => handleUpdateStatus('accepted')} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">
                                Acceptă și Confirmă Livrarea
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}