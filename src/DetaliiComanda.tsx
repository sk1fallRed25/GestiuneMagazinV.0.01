import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';

interface ComandaDetalii {
    id: number;
    produs_id: number;
    cantitate: number;
    pret_unitar: number;
    cantitate_aprobata: number | null;
    produs: {
        nume: string;
        stoc_depozit: number;
    };
}

export default function DetaliiComanda() {
    const { id: comandaId } = useParams();
    const navigate = useNavigate();
    const [detalii, setDetalii] = useState<ComandaDetalii[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDetalii = useCallback(async () => {
        if (!comandaId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('comenzi_agenti_detalii')
                .select('*, produs:produse(nume, stoc_depozit)')
                .eq('comanda_id', comandaId);
            
            if (error) throw error;
            
            // Inițializăm cantitatea aprobată cu cea cerută, dacă nu există deja
            const initialData = data.map(d => ({ ...d, cantitate_aprobata: d.cantitate_aprobata ?? d.cantitate }));
            setDetalii(initialData);

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [comandaId]);

    useEffect(() => {
        fetchDetalii();
    }, [fetchDetalii]);

    const handleQuantityChange = (index: number, value: string) => {
        const newDetalii = [...detalii];
        newDetalii[index].cantitate_aprobata = parseInt(value) || 0;
        setDetalii(newDetalii);
    };

    const handleApprove = async () => {
        const promise = new Promise(async (resolve, reject) => {
            try {
                for (const linie of detalii) {
                    const { error } = await supabase
                        .from('comenzi_agenti_detalii')
                        .update({ cantitate_aprobata: linie.cantitate_aprobata })
                        .eq('id', linie.id);
                    if (error) throw error;
                }
                
                // Actualizăm statusul comenzii principale
                const { error: updateError } = await supabase
                    .from('comenzi_agenti')
                    .update({ status: 'pending_agent' }) // Noul status
                    .eq('id', comandaId);

                if (updateError) throw updateError;

                resolve('Comanda a fost actualizată și trimisă spre confirmare agentului.');
            } catch (error) {
                reject(error);
            }
        });

        toast.promise(promise, {
            loading: 'Se salvează modificările...',
            success: (msg) => {
                navigate('/'); // Ne întoarcem la dashboard
                return `${msg}`;
            },
            error: (err: any) => `Eroare: ${err.message}`
        });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Revizuire Comandă #{comandaId}</h1>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                            <tr>
                                <th className="py-3 px-4">Produs</th>
                                <th className="py-3 px-4 text-center">Stoc Curent</th>
                                <th className="py-3 px-4 text-center">Cant. Cerută</th>
                                <th className="py-3 px-4 text-center">Cant. Aprobată</th>
                                <th className="py-3 px-4 text-right">Preț Unitar</th>
                                <th className="py-3 px-4 text-right">Total Aprobat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Se încarcă detaliile...</td></tr>
                            ) : detalii.map((linie, index) => (
                                <tr key={linie.id} className="border-t">
                                    <td className="py-3 px-4 font-bold">{linie.produs.nume}</td>
                                    <td className="py-3 px-4 text-center">{linie.produs.stoc_depozit}</td>
                                    <td className="py-3 px-4 text-center text-gray-500">{linie.cantitate}</td>
                                    <td className="py-2 px-4 text-center">
                                        <input
                                            type="number"
                                            value={linie.cantitate_aprobata || ''}
                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                            className="w-20 border rounded-md p-1 text-center font-bold"
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-right">{linie.pret_unitar.toFixed(2)}</td>
                                    <td className="py-3 px-4 text-right font-bold">
                                        {((linie.cantitate_aprobata || 0) * linie.pret_unitar).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr className="border-t">
                                <td colSpan={5} className="py-3 px-4 text-right">Total Final Aprobat:</td>
                                <td className="py-3 px-4 text-right text-lg">
                                    {detalii.reduce((acc, l) => acc + ((l.cantitate_aprobata || 0) * l.pret_unitar), 0).toFixed(2)} RON
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handleApprove}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 shadow-md"
                    >
                        Trimite Răspuns Agentului
                    </button>
                </div>
            </div>
        </div>
    );
}