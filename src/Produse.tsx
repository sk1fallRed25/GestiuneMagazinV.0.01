import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
    Search, Edit3, Trash2, Package, Save, X,
    RefreshCw, AlertTriangle, Info, Database
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- DEFINIȚIE INTERFAȚĂ TEHNICĂ ---
interface Produs {
    id: number;
    nume: string;
    cod_bare: string;
    pret_vanzare: number;
    stoc_depozit: number;
    stoc_magazin: number;
    um: string;
}

// FIX: Definim props-urile acceptate de componentă
export default function Produse({ userRole }: { userRole?: string }) {
    const [produse, setProduse] = useState<Produs[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // State-uri pentru Modala de Editare
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Produs | null>(null);

    // --- 1. PROCEDURĂ FETCH DATE ---
    const fetchProduse = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('*')
                .order('nume', { ascending: true });

            if (error) throw error;
            setProduse(data || []);
        } catch (error: any) {
            toast.error("Eroare la sincronizarea stocului: " + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProduse();
    }, [fetchProduse]);

    // --- 2. LOGICĂ ACTUALIZARE (EDITARE) ---
    const handleUpdateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;

        const promise = (async () => {
            const { error } = await supabase
                .from('produse')
                .update({
                    nume: editingProduct.nume,
                    cod_bare: editingProduct.cod_bare,
                    pret_vanzare: editingProduct.pret_vanzare,
                    stoc_depozit: editingProduct.stoc_depozit,
                    stoc_magazin: editingProduct.stoc_magazin,
                    um: editingProduct.um
                })
                .eq('id', editingProduct.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            fetchProduse();
        })();

        toast.promise(promise, {
            loading: 'Se procesează actualizarea...',
            success: 'Datele produsului au fost modificate.',
            error: (err) => `Eroare SQL: ${err.message}`
        });
    };

    // --- 3. LOGICĂ ȘTERGERE ---
    const handleDeleteProduct = async (id: number) => {
        if (!window.confirm("Sunteți sigur că doriți eliminarea definitivă a acestui reper din baza de date?")) return;

        try {
            const { error } = await supabase.from('produse').delete().eq('id', id);
            if (error) throw error;
            toast.success("Produs eliminat cu succes.");
            fetchProduse();
        } catch (error: any) {
            toast.error("Eroare la ștergere: " + error.message);
        }
    };

    // --- FILTRARE DINAMICĂ ---
    const filteredProduse = produse.filter(p =>
        p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cod_bare && p.cod_bare.includes(searchTerm))
    );

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-gray-500 font-medium">
            <RefreshCw className="animate-spin mr-3 text-indigo-600" />
            Se accesează serverul de baze de date...
        </div>
    );

    return (
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-slate-50/30">

            {/* Header Secțiune */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <Database size={28} />
                        </span>
                        Monitorizare Stocuri & Produse
                    </h1>
                    <p className="text-gray-500 mt-2 ml-1 text-sm italic">
                        Sincronizare în timp real. Rol curent: <span className="font-bold text-indigo-600 uppercase">{userRole || 'Nedefinit'}</span>
                    </p>
                </div>
            </div>

            {/* Bara de Căutare */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-3 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <Search className="text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Căutare rapidă după denumire produs sau cod de bare..."
                    className="w-full outline-none text-gray-700 font-medium bg-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Tabel Central */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-5">Denumire Produs</th>
                        <th className="px-6 py-5">Preț Vânzare</th>
                        <th className="px-6 py-5 text-center">Stoc Depozit</th>
                        <th className="px-6 py-5 text-center">Stoc Magazin</th>
                        <th className="px-6 py-5">U.M.</th>
                        <th className="px-6 py-5 text-center">Acțiuni</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                    {filteredProduse.map((produs) => (
                        <tr key={produs.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-400 group-hover:text-indigo-600 transition-colors">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 leading-tight">{produs.nume}</p>
                                        <p className="text-[10px] font-mono text-gray-400 mt-1">{produs.cod_bare}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-700">
                                {produs.pret_vanzare.toFixed(2)} <span className="text-[10px] text-gray-400">LEI</span>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-indigo-600 bg-indigo-50/30">
                                {produs.stoc_depozit}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-purple-600">
                                {produs.stoc_magazin}
                            </td>
                            <td className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                {produs.um}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => { setEditingProduct(produs); setIsEditModalOpen(true); }}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                    {/* Ascundem butonul de ștergere dacă nu e admin (Opțional, momentan lăsăm activ) */}
                                    <button
                                        onClick={() => handleDeleteProduct(produs.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL EDITARE --- */}
            {isEditModalOpen && editingProduct && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Parametri Produs</h2>
                                <p className="text-slate-400 text-xs mt-1">ID Unic: {editingProduct.id}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProduct} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Denumire Nomenclator</label>
                                <input
                                    className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                                    value={editingProduct.nume}
                                    onChange={e => setEditingProduct({...editingProduct, nume: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Preț Unitar</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold"
                                        value={editingProduct.pret_vanzare}
                                        onChange={e => setEditingProduct({...editingProduct, pret_vanzare: parseFloat(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">U.M.</label>
                                    <input
                                        className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-center"
                                        value={editingProduct.um}
                                        onChange={e => setEditingProduct({...editingProduct, um: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl grid grid-cols-2 gap-6 border border-slate-100">
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Stoc Depozit</label>
                                    <input
                                        type="number"
                                        className="w-full border border-indigo-100 p-4 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-indigo-600 shadow-sm"
                                        value={editingProduct.stoc_depozit}
                                        onChange={e => setEditingProduct({...editingProduct, stoc_depozit: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Stoc Magazin</label>
                                    <input
                                        type="number"
                                        className="w-full border border-purple-100 p-4 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/10 font-bold text-purple-600 shadow-sm"
                                        value={editingProduct.stoc_magazin}
                                        onChange={e => setEditingProduct({...editingProduct, stoc_magazin: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl mt-4 hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex justify-center items-center gap-3 text-sm uppercase tracking-widest">
                                <Save size={20} /> Validare Modificări
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}