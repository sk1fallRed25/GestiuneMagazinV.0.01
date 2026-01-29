import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

interface ProdusDeCumparat {
    id: number;
    nume: string;
    stoc_total: number;
    stoc_minim_depozit: number;
}

export default function ListaCumparaturi() {
    const [lista, setLista] = useState<ProdusDeCumparat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLista = async () => {
            setLoading(true);
            
            // Folosim un view sau o interogare mai complexă pentru a obține direct datele
            // Aici, vom face post-procesare în client pentru simplitate
            const { data, error } = await supabase
                .from('produse')
                .select('id, nume, stoc_depozit, stoc_magazin, stoc_minim_depozit')
                .is('furnizor_id', null); // Doar produsele fără furnizor asociat

            if (error) {
                console.error("Eroare la încărcarea listei:", error);
                setLista([]);
            } else if (data) {
                const produseNecesare = data
                    .map(p => ({
                        ...p,
                        stoc_total: p.stoc_depozit + p.stoc_magazin
                    }))
                    .filter(p => p.stoc_total < p.stoc_minim_depozit);

                setLista(produseNecesare);
            }
            setLoading(false);
        };

        fetchLista();
    }, []);

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">📝 Listă de Cumpărături</h1>
                        <p className="text-sm text-gray-500">Produse cu stoc total sub pragul de alertă, care se achiziționează manual.</p>
                    </div>
                    <button 
                        onClick={() => window.print()}
                        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg shadow-sm font-medium transition flex items-center gap-2"
                    >
                        🖨️ Printează
                    </button>
                </div>

                {loading ? (
                    <p className="text-center text-gray-500">Se generează lista...</p>
                ) : lista.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-lg font-medium text-green-600">🎉 Totul este în regulă!</p>
                        <p className="text-gray-500">Niciun produs care se cumpără manual nu are nevoie de aprovizionare.</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {lista.map(produs => (
                            <li key={produs.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50">
                                <div>
                                    <p className="font-bold text-lg text-gray-800">{produs.nume}</p>
                                    <p className="text-sm text-red-600 font-medium">
                                        Stoc total: {produs.stoc_total} (Prag: {produs.stoc_minim_depozit})
                                    </p>
                                </div>
                                <div className="w-24 h-12 border-2 border-gray-300 rounded-md"></div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}