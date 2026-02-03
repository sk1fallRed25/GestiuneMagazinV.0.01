import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ClipboardList, CheckCircle, Clock, Archive } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Comenzi() {
    const [loading, setLoading] = useState(true);
    const [comenzi, setComenzi] = useState<any[]>([]);

    const fetchComenzi = async () => {
        setLoading(true);
        // Facem join cu tabelele furnizori și produse ca să avem numele
        const { data, error } = await supabase
            .from('comenzi_furnizor')
            .select(`
                *,
                furnizori (nume_firma),
                produse (nume)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Eroare la încărcare comenzi");
            console.error(error);
        } else {
            setComenzi(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchComenzi();
    }, []);

    const markAsCompleted = async (id: number) => {
        if(!confirm("Marchezi comanda ca recepționată?")) return;

        const { error } = await supabase
            .from('comenzi_furnizor')
            .update({ status: 'completed' })
            .eq('id', id);

        if (error) toast.error("Eroare la actualizare");
        else {
            toast.success("Comandă finalizată!");
            fetchComenzi();
        }
    };

    // Separăm comenzile
    const active = comenzi.filter(c => c.status === 'pending');
    const istoric = comenzi.filter(c => c.status !== 'pending');

    const TableRow = ({ comanda, isActive }: any) => (
        <tr className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
            <td className="p-4 font-bold text-gray-700">#{comanda.id}</td>
            <td className="p-4 text-blue-600 font-medium">{comanda.furnizori?.nume_firma || 'Furnizor Șters'}</td>
            <td className="p-4 text-gray-800">{comanda.produse?.nume || 'Produs Șters'}</td>
            <td className="p-4 font-bold">{comanda.cantitate} buc</td>
            <td className="p-4 text-sm text-gray-500">{new Date(comanda.created_at).toLocaleDateString('ro-RO')}</td>
            <td className="p-4">
                {isActive ? (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1">
                        <Clock size={12} /> În Așteptare
                    </span>
                ) : (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1">
                        <CheckCircle size={12} /> Finalizat
                    </span>
                )}
            </td>
            <td className="p-4 text-right">
                {isActive && (
                    <button
                        onClick={() => markAsCompleted(comanda.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold transition"
                    >
                        Recepție OK
                    </button>
                )}
            </td>
        </tr>
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Se încarcă comenzile...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto pb-20">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
                <span className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><ClipboardList size={28} /></span>
                Situație Comenzi
            </h1>

            {/* TABEL COMENZI ACTIVE */}
            <div className="mb-10">
                <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Clock className="text-yellow-500" /> Comenzi Active (În curs)
                </h2>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Furnizor</th>
                            <th className="p-4">Produs</th>
                            <th className="p-4">Cantitate</th>
                            <th className="p-4">Data Emiterii</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Acțiuni</th>
                        </tr>
                        </thead>
                        <tbody>
                        {active.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-400">Nu ai nicio comandă în așteptare.</td></tr>
                        ) : active.map(c => <TableRow key={c.id} comanda={c} isActive={true} />)}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABEL ISTORIC */}
            <div>
                <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Archive className="text-gray-400" /> Istoric Comenzi Finalizate
                </h2>
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Furnizor</th>
                            <th className="p-4">Produs</th>
                            <th className="p-4">Cantitate</th>
                            <th className="p-4">Data Emiterii</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Acțiuni</th>
                        </tr>
                        </thead>
                        <tbody>
                        {istoric.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-400">Istoricul este gol.</td></tr>
                        ) : istoric.map(c => <TableRow key={c.id} comanda={c} isActive={false} />)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}