import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';

interface Produs {
    id: number;
    nume: string;
    cod_bare: string;
    stoc_depozit: number;
    stoc_magazin: number;
}

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function TransferMarfa() {
    const [search, setSearch] = useState('');
    const [rezultateCautare, setRezultateCautare] = useState<Produs[]>([]);
    const [produsSelectat, setProdusSelectat] = useState<Produs | null>(null);
    const [cantitate, setCantitate] = useState<number>(1);
    const [loading, setLoading] = useState(false);

    const query = useQuery();

    useEffect(() => {
        const produsIdFromUrl = query.get('produs_id');
        if (produsIdFromUrl) {
            const fetchProdusInitial = async () => {
                setLoading(true);
                const { data: produs, error } = await supabase
                    .from('produse')
                    .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
                    .eq('id', produsIdFromUrl)
                    .single();
                
                if (produs) {
                    handleSelectProdus(produs);
                } else if (error) {
                    toast.error(`Nu am găsit produsul: ${error.message}`);
                }
                setLoading(false);
            };
            fetchProdusInitial();
        }
    }, []);

    useEffect(() => {
        if (produsSelectat) return;
        const delayDebounce = setTimeout(async () => {
            if (search.length < 2) {
                setRezultateCautare([]);
                return;
            }
            const { data } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
                .or(`nume.ilike.%${search}%,cod_bare.eq.${search}`)
                .limit(5);
            if (data) setRezultateCautare(data as Produs[]);
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [search, produsSelectat]);

    const handleSelectProdus = (p: Produs) => {
        setProdusSelectat(p);
        setSearch(p.nume);
        setRezultateCautare([]);
        setCantitate(1);
    };

    const handleTransfer = async () => {
        if (!produsSelectat) return toast.error('Selectează un produs!');
        if (cantitate <= 0) return toast.error('Cantitatea trebuie să fie pozitivă.');
        if (cantitate > produsSelectat.stoc_depozit) {
            return toast.error(`Stoc insuficient în depozit (${produsSelectat.stoc_depozit} buc).`);
        }

        const promise = supabase.rpc('transfer_la_magazin', {
            p_produs_id: produsSelectat.id,
            p_cantitate: cantitate,
        }).then();

        // @ts-ignore
        toast.promise(promise, {
            loading: 'Se transferă marfa...',
            success: () => {
                setProdusSelectat(null);
                setSearch('');
                setCantitate(1);
                return `Transfer realizat cu succes!`;
            },
            error: (err) => `Eroare la transfer: ${err.message}`
        });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">🔄 Transfer Marfă (Depozit → Magazin)</h1>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    {!produsSelectat && (
                        <div className="relative mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">1. Caută Produsul</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 font-bold text-lg"
                                placeholder="Nume sau Cod Bare..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoComplete="off"
                            />
                            {rezultateCautare.length > 0 && (
                                <div className="absolute z-10 w-full bg-white shadow-xl border rounded-lg mt-1 max-h-60 overflow-y-auto">
                                    {rezultateCautare.map(p => (
                                        <div key={p.id} className="p-3 hover:bg-blue-50 cursor-pointer border-b" onClick={() => handleSelectProdus(p)}>
                                            <div className="font-bold text-gray-800">{p.nume}</div>
                                            <div className="text-xs text-gray-500">Depozit: {p.stoc_depozit} | Magazin: {p.stoc_magazin}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {loading && !produsSelectat && <p className="text-center text-gray-500">Se încarcă produsul...</p>}

                    {produsSelectat && (
                        <div className="animate-fade-in-down">
                             <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">Produs selectat:</p>
                                <h2 className="text-xl font-bold text-blue-900">{produsSelectat.nume}</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 uppercase">Stoc Depozit</div>
                                    <div className="text-2xl font-bold text-yellow-800">{produsSelectat.stoc_depozit}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 uppercase">Stoc Magazin</div>
                                    <div className="text-2xl font-bold text-green-700">{produsSelectat.stoc_magazin}</div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cantitate de transferat</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 text-center text-lg font-bold"
                                    value={cantitate}
                                    onChange={e => setCantitate(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1"
                                    max={produsSelectat.stoc_depozit}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleTransfer}
                                disabled={loading || (produsSelectat && cantitate > produsSelectat.stoc_depozit)}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-md hover:bg-blue-700 font-bold transition disabled:bg-gray-400"
                            >
                                {loading ? 'Se transferă...' : 'Confirmă Transferul'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}