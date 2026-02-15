import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Edit, Trash2, Plus, Search, Package, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Definim tipul Produs
interface Produs {
    id: number;
    nume: string;
    cod_bare: string;
    pret_vanzare: number;
    stoc_depozit: number;
    stoc_magazin: number;
    unitate_masura: string;
}

export default function Produse({ userRole }: { userRole: string }) {
    const [produse, setProduse] = useState<Produs[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- 1. FUNCȚIA DE ÎNCĂRCARE DATE ---
    const fetchProduse = async () => {
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('*')
                .order('nume', { ascending: true });

            if (error) throw error;
            setProduse(data || []);
        } catch (error: any) {
            toast.error('Eroare la încărcare: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. ACTIVARE REAL-TIME ---
    useEffect(() => {
        fetchProduse();

        const channel = supabase
            .channel('produse-live-table')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'produse' }, (payload) => {

                if (payload.eventType === 'INSERT') {
                    // Adăugăm produsul nou și resortăm (sau îl punem sus)
                    setProduse((prev) => [payload.new as Produs, ...prev]);
                    toast.success("Produs nou detectat!", { id: 'new-prod', duration: 2000, icon: '📦' });
                }
                else if (payload.eventType === 'UPDATE') {
                    setProduse((prev) => prev.map((item) =>
                        item.id === payload.new.id ? (payload.new as Produs) : item
                    ));
                }
                else if (payload.eventType === 'DELETE') {
                    setProduse((prev) => prev.filter((item) => item.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // --- 3. FUNCȚIA DE ȘTERGERE ---
    const handleDelete = async (id: number) => {
        if (userRole !== 'admin') {
            toast.error("Doar administratorul poate șterge produse.");
            return;
        }

        if (confirm('Sigur dorești să ștergi acest produs?')) {
            const { error } = await supabase.from('produse').delete().eq('id', id);
            if (error) {
                toast.error('Eroare la ștergere: ' + error.message);
            } else {
                toast.success('Produs șters!');
            }
        }
    };

    // Filtrare produse
    const produseFiltrate = produse.filter(p =>
        p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cod_bare && p.cod_bare.includes(searchTerm))
    );

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-gray-500 gap-2">
            <RefreshCw className="animate-spin text-indigo-600" /> Se încarcă inventarul...
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/30 pb-20">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Inventar General</h1>
                    <p className="text-gray-500 mt-1">Monitorizare stocuri în timp real (Depozit vs Magazin)</p>
                </div>

                {userRole === 'admin' && (
                    <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 font-bold active:scale-95">
                        <Plus size={20} />
                        Produs Nou
                    </button>
                )}
            </div>

            {/* --- SEARCH BAR --- */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 flex items-center gap-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <Search className="text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Caută rapid după nume sau cod de bare..."
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">
                        {produseFiltrate.length} rezultate
                    </span>
                )}
            </div>

            {/* --- TABEL PRODUSE --- */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                            <th className="px-6 py-5">Denumire Produs</th>
                            <th className="px-6 py-5 text-center">Preț Vânzare</th>
                            <th className="px-6 py-5 text-center text-gray-400">Total</th>
                            <th className="px-6 py-5 text-center text-blue-600">Stoc Depozit</th>
                            <th className="px-6 py-5 text-center text-purple-600">Stoc Magazin</th>
                            <th className="px-6 py-5 text-center">UM</th>
                            <th className="px-6 py-5 text-right">Acțiuni</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                        {produseFiltrate.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                                    <Package size={40} className="opacity-20" />
                                    Nu s-au găsit produse conform criteriilor.
                                </td>
                            </tr>
                        ) : (
                            produseFiltrate.map((produs) => {
                                const stocDepozit = produs.stoc_depozit || 0;
                                const stocMagazin = produs.stoc_magazin || 0;
                                const stocTotal = stocDepozit + stocMagazin;

                                return (
                                    <tr key={produs.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        {/* NUME PRODUS */}
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 group-hover:border-indigo-200 group-hover:bg-white transition-all">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-base leading-tight">{produs.nume}</p>
                                                    <p className="text-xs text-gray-400 font-mono mt-0.5 bg-gray-50 px-1.5 py-0.5 rounded w-fit">{produs.cod_bare || 'FĂRĂ COD'}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PREȚ */}
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-gray-900 text-lg">
                                                {produs.pret_vanzare?.toFixed(2)}
                                                <span className="text-xs font-normal text-gray-400 ml-1">LEI</span>
                                            </span>
                                        </td>

                                        {/* STOC TOTAL */}
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-bold text-base ${stocTotal === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                                                {stocTotal}
                                            </span>
                                        </td>

                                        {/* STOC DEPOZIT */}
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${stocDepozit > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'text-gray-300 bg-gray-50 border-gray-100'}`}>
                                                {stocDepozit}
                                            </span>
                                        </td>

                                        {/* STOC MAGAZIN */}
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${stocMagazin > 0 ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                {stocMagazin === 0 && <AlertCircle size={10} className="animate-pulse" />}
                                                {stocMagazin}
                                            </span>
                                        </td>

                                        {/* UNITATE */}
                                        <td className="px-6 py-4 text-center text-gray-400 uppercase font-bold text-xs tracking-wider">
                                            {produs.unitate_masura || 'buc'}
                                        </td>

                                        {/* ACȚIUNI */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Editează"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                {userRole === 'admin' && (
                                                    <button
                                                        onClick={() => handleDelete(produs.id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Șterge"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}