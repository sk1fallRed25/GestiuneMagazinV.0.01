import React, { useState } from 'react';
import { useProduse, Produs } from './core/hooks/useProduse';
import { Edit, Trash2, Plus, Search, Package, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Produse({ userRole }: { userRole: string }) {
    const { produse, loading, stergeProdus } = useProduse();
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrare produse după nume sau cod de bare
    const produseFiltrate = produse.filter(p =>
        p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cod_bare && p.cod_bare.includes(searchTerm))
    );

    const handleDelete = async (id: number) => {
        if (confirm('Sigur dorești să ștergi acest produs?')) {
            const { error } = await stergeProdus(id);
            if (error) {
                toast.error('Eroare la ștergere: ' + error.message);
            } else {
                toast.success('Produs șters cu succes!');
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Se încarcă produsele...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* --- HEADER PAGINĂ --- */}
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
                            <th className="px-6 py-4 text-center bg-gray-100/50">Stoc Total</th> {/* Evidențiat ușor */}
                            <th className="px-6 py-4 text-center text-blue-600">Depozit</th> {/* Culoare distinctă */}
                            <th className="px-6 py-4 text-center text-purple-600">Magazin</th> {/* Culoare distinctă */}
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
                                // Calculăm stocul total (dacă nu vine deja calculat din bază)
                                // Presupunem că produsul are câmpurile stoc_depozit și stoc_magazin (sau stoc_curent pt magazin)
                                // Ajustează numele câmpurilor dacă în baza ta sunt diferite (ex: stoc_curent vs stoc_magazin)
                                const stocDepozit = produs.stoc_depozit || 0;
                                const stocMagazin = produs.stoc_magazin || produs.stoc_curent || 0;
                                const stocTotal = stocDepozit + stocMagazin;

                                return (
                                    <tr key={produs.id} className="hover:bg-gray-50/80 transition-colors group">
                                        {/* NUME PRODUS */}
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                    <Package size={16} />
                                                </div>
                                                <div>
                                                    <p>{produs.nume}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{produs.cod_bare}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PREȚ */}
                                        <td className="px-6 py-4 text-center font-bold text-gray-800">
                                            {produs.pret_vanzare?.toFixed(2)} <span className="text-xs font-normal text-gray-400">RON</span>
                                        </td>

                                        {/* STOC TOTAL */}
                                        <td className="px-6 py-4 text-center bg-gray-50/50">
                                                <span className={`font-bold text-base ${stocTotal === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                                    {stocTotal}
                                                </span>
                                        </td>

                                        {/* STOC DEPOZIT */}
                                        <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${stocDepozit > 0 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-300'}`}>
                                                    {stocDepozit}
                                                </span>
                                        </td>

                                        {/* STOC MAGAZIN */}
                                        <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${stocMagazin > 0 ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-red-50 text-red-600 border border-red-100 flex items-center justify-center gap-1 w-fit mx-auto'}`}>
                                                    {stocMagazin === 0 && <AlertCircle size={10} />}
                                                    {stocMagazin}
                                                </span>
                                        </td>

                                        {/* UNITATE DE MĂSURĂ */}
                                        <td className="px-6 py-4 text-center text-gray-500 capitalize">
                                            {produs.unitate_masura || 'buc'}
                                        </td>

                                        {/* ACȚIUNI */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
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