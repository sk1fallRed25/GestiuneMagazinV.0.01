import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { FileText, Calendar, User, CreditCard, ChevronDown, ChevronUp, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IstoricVanzari() {
    const [loading, setLoading] = useState(true);
    const [vanzari, setVanzari] = useState<any[]>([]);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [filterData, setFilterData] = useState('');

    useEffect(() => {
        fetchVanzari();
    }, []);

    const fetchVanzari = async () => {
        setLoading(true);
        try {
            // Luăm vânzările + cine le-a făcut (user) + produsele (detalii)
            const { data, error } = await supabase
                .from('vanzari')
                .select(`
                    *,
                    utilizatori (nume, email),
                    detalii_vanzare (
                        cantitate,
                        pret_vanzare,
                        produse (nume, cod_bare)
                    )
                `)
                .order('data_vanzare', { ascending: false });

            if (error) throw error;
            setVanzari(data || []);
        } catch (error: any) {
            toast.error("Eroare la încărcare istoric: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id: number) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    // Filtrare după dată (YYYY-MM-DD)
    const vanzariFiltrate = filterData
        ? vanzari.filter(v => v.data_vanzare.startsWith(filterData))
        : vanzari;

    if (loading) return <div className="p-8 text-center text-gray-500">Se încarcă istoricul...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-green-100 p-2 rounded-xl text-green-600"><FileText size={28} /></span>
                        Istoric Vânzări (Bonuri)
                    </h1>
                    <p className="text-gray-500 mt-2 ml-14">Lista completă a vânzărilor înregistrate în baza de date.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <Calendar size={18} className="text-gray-400 ml-2" />
                    <input
                        type="date"
                        className="outline-none text-gray-700 font-medium"
                        value={filterData}
                        onChange={(e) => setFilterData(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-100">
                    <tr>
                        <th className="p-4">ID Bon</th>
                        <th className="p-4">Data & Ora</th>
                        <th className="p-4">Casier</th>
                        <th className="p-4">Metoda Plată</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4 text-center">Detalii</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {vanzariFiltrate.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nu s-au găsit vânzări.</td></tr>
                    ) : vanzariFiltrate.map((v) => (
                        <React.Fragment key={v.id}>
                            {/* RÂNDUL PRINCIPAL (BONUL) */}
                            <tr className="hover:bg-gray-50/80 transition cursor-pointer" onClick={() => toggleRow(v.id)}>
                                <td className="p-4 font-mono text-gray-500">#{v.id}</td>
                                <td className="p-4 font-medium text-gray-700">
                                    {new Date(v.data_vanzare).toLocaleString('ro-RO')}
                                </td>
                                <td className="p-4 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                        <User size={12} />
                                    </div>
                                    <span className="text-sm">{v.utilizatori?.nume || 'Necunoscut'}</span>
                                </td>
                                <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${
                                            v.metoda_plata === 'card'
                                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                : 'bg-green-50 text-green-600 border border-green-100'
                                        }`}>
                                            {v.metoda_plata === 'card' ? <CreditCard size={12}/> : <span className="text-[10px]">💵</span>}
                                            {v.metoda_plata.toUpperCase()}
                                        </span>
                                </td>
                                <td className="p-4 text-right font-bold text-gray-800">
                                    {v.total} RON
                                </td>
                                <td className="p-4 text-center text-gray-400">
                                    {expandedRow === v.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </td>
                            </tr>

                            {/* RÂNDUL SECUNDAR (PRODUSELE DE PE BON) */}
                            {expandedRow === v.id && (
                                <tr className="bg-slate-50 border-b border-gray-100">
                                    <td colSpan={6} className="p-4 pl-12">
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
                                                <tr>
                                                    <th className="p-2 pl-4">Produs</th>
                                                    <th className="p-2 text-center">Cantitate</th>
                                                    <th className="p-2 text-right pr-4">Preț Unitar</th>
                                                    <th className="p-2 text-right pr-4">Subtotal</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {v.detalii_vanzare.map((d: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-gray-50 last:border-0">
                                                        <td className="p-2 pl-4 font-medium text-gray-700">
                                                            {d.produse?.nume || 'Produs Șters'}
                                                            <span className="text-xs text-gray-400 block font-mono">{d.produse?.cod_bare}</span>
                                                        </td>
                                                        <td className="p-2 text-center">x{d.cantitate}</td>
                                                        <td className="p-2 text-right pr-4">{d.pret_vanzare}</td>
                                                        <td className="p-2 text-right pr-4 font-bold">
                                                            {(d.cantitate * d.pret_vanzare).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}