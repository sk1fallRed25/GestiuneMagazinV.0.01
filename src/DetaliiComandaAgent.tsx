import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Calendar, Package, MessageSquare, Check, X, Truck, Building2 } from 'lucide-react';

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
    } | null;
    furnizor: {
        nume: string; // Am standardizat la 'nume'. Verifică dacă în DB e 'nume' sau 'nume_firma'
    } | null;
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
            // RELAȚII: Asigură-te că foreign keys în 'comenzi_catre_furnizor' sunt 'produs_id' și 'furnizor_id'
            const { data, error } = await supabase
                .from('comenzi_catre_furnizor')
                .select(`
                    *,
                    produs:produse(nume, cod_bare),
                    furnizor:furnizori(nume) 
                `)
                .eq('id', comandaId)
                .single();

            if (error) throw error;
            setComanda(data);
        } catch (err: any) {
            console.error(err);
            toast.error("Nu s-a putut încărca comanda.");
            navigate(-1);
        } finally {
            setLoading(false);
        }
    }, [comandaId, navigate]);

    useEffect(() => {
        fetchDetalii();
    }, [fetchDetalii]);

    const handleUpdateStatus = async (status: 'accepted' | 'rejected') => {
        if (!comandaId) return;

        const statusText = status === 'accepted' ? 'acceptată' : 'refuzată';

        const promise = (async () => {
            const { error } = await supabase
                .from('comenzi_catre_furnizor')
                .update({ status })
                .eq('id', comandaId);

            if (error) throw error;
            return `Comandă ${statusText} cu succes!`;
        })();

        toast.promise(promise, {
            loading: 'Se actualizează statusul...',
            success: (msg) => {
                setTimeout(() => navigate(-1), 1000); // Întoarcere automată după 1 secundă
                return msg;
            },
            error: (err) => `Eroare: ${err.message}`
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
                Se încarcă detaliile...
            </div>
        );
    }

    if (!comanda) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 font-medium"
                >
                    <ArrowLeft size={20} className="mr-2" /> Înapoi la Panou
                </button>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Titlu Card */}
                    <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <Truck className="text-blue-600" />
                                    Comanda #{comanda.id}
                                </h1>
                                <p className="text-gray-500 mt-2 flex items-center gap-2">
                                    <Building2 size={16} />
                                    De la Administrator către: <span className="font-semibold text-gray-800">{comanda.furnizor?.nume || 'Furnizor Necunoscut'}</span>
                                </p>
                            </div>
                            <div className="px-4 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 uppercase tracking-wider">
                                {comanda.status}
                            </div>
                        </div>
                    </div>

                    {/* Conținut */}
                    <div className="p-8 space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Produs */}
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Package size={14} /> Produs Solicitat
                                </p>
                                <p className="font-bold text-xl text-gray-800">{comanda.produs?.nume || 'Produs Șters'}</p>
                                <p className="text-sm text-gray-500 font-mono mt-1">{comanda.produs?.cod_bare}</p>
                            </div>

                            {/* Cantitate */}
                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Cantitate</p>
                                <p className="font-bold text-3xl text-blue-700">{comanda.cantitate} <span className="text-lg font-normal">buc</span></p>
                            </div>
                        </div>

                        {/* Detalii Livrare */}
                        <div className="flex flex-col gap-4">
                            {comanda.data_livrare_estimata && (
                                <div className="flex items-center gap-3 text-gray-700 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Calendar size={20} /></div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Termen Limită</p>
                                        <p className="font-medium">{new Date(comanda.data_livrare_estimata).toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                </div>
                            )}

                            {comanda.observatii && (
                                <div className="flex gap-3 text-gray-700 bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                                    <div className="mt-1"><MessageSquare size={20} className="text-yellow-600" /></div>
                                    <div>
                                        <p className="text-xs text-yellow-700 font-bold uppercase mb-1">Notă de la Admin</p>
                                        <p className="text-sm text-gray-800 italic">"{comanda.observatii}"</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Acțiuni (Doar dacă e pending) */}
                    {comanda.status === 'pending' && (
                        <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-4">
                            <button
                                onClick={() => handleUpdateStatus('rejected')}
                                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-all shadow-sm hover:shadow-md active:scale-95"
                            >
                                <X size={18} /> Refuză Comanda
                            </button>
                            <button
                                onClick={() => handleUpdateStatus('accepted')}
                                className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                            >
                                <Check size={18} /> Acceptă & Confirmă
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}