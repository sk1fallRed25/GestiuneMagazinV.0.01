import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Edit, Trash2, Plus, Search, Package, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Produse({ userRole }: { userRole: string }) {
    const [produse, setProduse] = useState<any[]>([]);
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

    // --- 2. ACTIVARE REAL-TIME (PARTEA MAGICĂ) ---
    useEffect(() => {
        fetchProduse(); // Încărcare inițială

        // Ne abonăm la orice modificare în tabelul 'produse'
        const channel = supabase
            .channel('produse-live-table')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'produse' }, (payload) => {

                // Cazul 1: Produs nou adăugat -> Îl punem primul în listă
                if (payload.eventType === 'INSERT') {
                    setProduse((prev) => [payload.new, ...prev]);
                    // Opțional: toast.success(`Produs nou: ${payload.new.nume}`);
                }

                // Cazul 2: Produs modificat (ex: schimbare stoc) -> Îl actualizăm în listă
                else if (payload.eventType === 'UPDATE') {
                    setProduse((prev) => prev.map((item) =>
                        item.id === payload.new.id ? payload.new : item
                    ));
                }

                // Cazul 3: Produs șters -> Îl scoatem din listă
                else if (payload.eventType === 'DELETE') {
                    setProduse((prev) => prev.filter((item) => item.id !== payload.old.id));
                }
            })
            .subscribe();

        // Curățenie la ieșirea din pagină
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // --- 3. FUNCȚIA DE ȘTERGERE ---
    const handleDelete = async (id: number) => {
        if (confirm('Sigur dorești să ștergi acest produs?')) {
            const { error } = await supabase.from('produse').delete().eq('id', id);
            if (error) {
                toast.error('Eroare la ștergere: ' + error.message);
            } else {
                toast.success('Produs șters!');
                // Nu e nevoie să reîncărcăm lista manual, se ocupă Realtime-ul de mai sus!
            }
        }
    };

    // Filtrare produse după search
    const produseFiltrate = produse.filter(p =>
        p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cod_bare && p.cod_bare.includes(searchTerm))
    );

    if (loading) return (
        <div className="flex items-center justify-center h-full text-gray-500 gap-2">
            <RefreshCw className="animate-spin" /> Se încarcă inventarul...
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Produse & Stoc</h1>
                    <p className="text-gray-500 mt-1">Gestionează inventarul din Depozit și Magazin</p>
                </div>

                <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-500/30 font-medium">
                    <Plus size={20} />
                    Produs Nou
                </button>
            </div>

            {/* --- SEARCH BAR --- */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-3">
                <Search className="text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Caută după nume sau cod de bare..."
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* --- TABEL PRODUSE --- */}
            <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                            <th className="px-6 py-4">Produs</th>
                            <th className="px-6 py-4 text-center">Preț Final</th>
                            <th className="px-6 py-4 text-center text-gray-500">Stoc Total</th>
                            <th className="px-6 py-4 text-center text-blue-600">Depozit</th>
                            <th className="px-6 py-4 text-center text-purple-600">Magazin</th>
                            <th className="px-6 py-4 text-center">Unitate</th>
                            <th className="px-6 py-4 text-right">Acțiuni</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                        {produseFiltrate.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                    Nu s-au găsit produse.
                                </td>
                            </tr>
                        ) : (
                            produseFiltrate.map((produs) => {
                                // Calculăm stocul total (Asigură-te că numele coloanelor sunt corecte cu baza ta)
                                const stocDepozit = produs.stoc_depozit || 0;
                                const stocMagazin = produs.stoc_magazin || 0;
                                const stocTotal = stocDepozit + stocMagazin;

                                return (
                                    <tr key={produs.id} className="hover:bg-gray-50/80 transition-colors group">
                                        {/* NUME PRODUS */}
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{produs.nume}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{produs.cod_bare}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PREȚ */}
                                        <td className="px-6 py-4 text-center font-bold text-gray-800">
                                            {produs.pret_vanzare?.toFixed(2)} <span className="text-xs font-normal text-gray-400">RON</span>
                                        </td>

                                        {/* STOC TOTAL */}
                                        <td className="px-6 py-4 text-center">
                                                <span className={`font-bold text-base ${stocTotal === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                                    {stocTotal}
                                                </span>
                                        </td>

                                        {/* STOC DEPOZIT (ALBASTRU) */}
                                        <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${stocDepozit > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-gray-300 bg-gray-50'}`}>
                                                    {stocDepozit}
                                                </span>
                                        </td>

                                        {/* STOC MAGAZIN (MOV / ROȘU DACĂ E GOL) */}
                                        <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto ${stocMagazin > 0 ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                    {stocMagazin === 0 && <AlertCircle size={10} />}
                                                    {stocMagazin}
                                                </span>
                                        </td>

                                        {/* UNITATE */}
                                        <td className="px-6 py-4 text-center text-gray-500 capitalize">
                                            {produs.unitate_masura || 'buc'}
                                        </td>

                                        {/* ACȚIUNI */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(produs.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
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