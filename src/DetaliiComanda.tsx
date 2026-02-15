import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { ArrowLeft, CheckCircle, Package, AlertTriangle, Save } from 'lucide-react';

interface DetaliuComanda {
    id: number;
    produs_id: number;
    cantitate: number;         // Cantitatea cerută de agent
    cantitate_aprobata: number; // Cantitatea aprobată de admin (inițial = cerută)
    pret_unitar: number;
    produs: {
        nume: string;
        stoc_depozit: number;
    };
}

export default function DetaliiComanda() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [detalii, setDetalii] = useState<DetaliuComanda[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchDetalii = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Luăm detaliile comenzii + info produs
            const { data, error } = await supabase
                .from('comenzi_agenti_detalii')
                .select(`
                    id,
                    produs_id,
                    cantitate,
                    cantitate_aprobata,
                    pret_unitar,
                    produs:produse(nume, stoc_depozit)
                `)
                .eq('comanda_id', id);

            if (error) throw error;

            // Dacă cantitate_aprobata este null (prima oară), o setăm egală cu cantitatea cerută
            const processedData = (data as any[]).map(item => ({
                ...item,
                cantitate_aprobata: item.cantitate_aprobata ?? item.cantitate,
                produs: item.produs // Asigurăm structura corectă
            }));

            setDetalii(processedData);

        } catch (err: any) {
            console.error(err);
            toast.error("Eroare la încărcarea detaliilor.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetalii();
    }, [fetchDetalii]);

    const handleQuantityChange = (index: number, value: string) => {
        const val = parseInt(value) || 0;
        const newDetalii = [...detalii];
        newDetalii[index].cantitate_aprobata = val;
        setDetalii(newDetalii);
    };

    const handleApprove = async () => {
        if (!id) return;
        setSaving(true);

        const promise = (async () => {
            // 1. Salvăm cantitățile aprobate pentru fiecare linie
            for (const linie of detalii) {
                const { error } = await supabase
                    .from('comenzi_agenti_detalii')
                    .update({ cantitate_aprobata: linie.cantitate_aprobata })
                    .eq('id', linie.id);

                if (error) throw error;
            }

            // 2. Actualizăm statusul comenzii principale -> 'pending_agent' (Așteaptă confirmarea agentului)
            // Calculăm și noul total aprobat
            const totalNou = detalii.reduce((acc, item) => acc + (item.cantitate_aprobata * item.pret_unitar), 0);

            const { error: errHeader } = await supabase
                .from('comenzi_agenti')
                .update({
                    status: 'pending_agent',
                    total_valoare: totalNou
                })
                .eq('id', id);

            if (errHeader) throw errHeader;

            return "Comandă actualizată și trimisă la agent!";
        })();

        toast.promise(promise, {
            loading: 'Se procesează...',
            success: (msg) => {
                setTimeout(() => navigate('/comenzi'), 1500);
                return msg;
            },
            error: 'Eroare la salvare.'
        });

        try {
            await promise;
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-gray-500">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mr-3"></div>
            Se încarcă detaliile...
        </div>
    );

    const totalCerut = detalii.reduce((acc, item) => acc + (item.cantitate * item.pret_unitar), 0);
    const totalAprobat = detalii.reduce((acc, item) => acc + (item.cantitate_aprobata * item.pret_unitar), 0);

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans animate-in fade-in duration-300">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors mb-2">
                            <ArrowLeft size={18} className="mr-1" /> Înapoi la listă
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">Revizuire Comandă <span className="text-indigo-600">#{id}</span></h1>
                        <p className="text-gray-500 mt-1">Verifică stocurile și aprobă cantitățile finale pentru agent.</p>
                    </div>
                    <div className="text-right bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Aprobat</p>
                        <p className="text-2xl font-bold text-green-600">{totalAprobat.toFixed(2)} RON</p>
                        <p className="text-xs text-gray-400 line-through">Cerut: {totalCerut.toFixed(2)} RON</p>
                    </div>
                </div>

                {/* Tabel Detalii */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                            <tr>
                                <th className="py-4 px-6 w-1/3">Produs</th>
                                <th className="py-4 px-6 text-center w-24">Stoc<br/>Depozit</th>
                                <th className="py-4 px-6 text-center w-24 bg-red-50/50">Cant.<br/>Cerută</th>
                                <th className="py-4 px-6 text-center w-32 bg-green-50/50">Cant.<br/>Aprobată</th>
                                <th className="py-4 px-6 text-right w-32">Preț<br/>Unitar</th>
                                <th className="py-4 px-6 text-right w-32">Total<br/>Linie</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {detalii.map((linie, index) => {
                                const stocCritic = linie.produs.stoc_depozit < linie.cantitate;
                                const modificat = linie.cantitate !== linie.cantitate_aprobata;

                                return (
                                    <tr key={linie.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                                <Package size={16} className="text-gray-400" />
                                                {linie.produs.nume}
                                            </div>
                                            {stocCritic && (
                                                <div className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
                                                    <AlertTriangle size={12} /> Stoc insuficient!
                                                </div>
                                            )}
                                        </td>

                                        <td className={`py-4 px-6 text-center font-mono text-sm font-bold ${stocCritic ? 'text-red-600' : 'text-gray-600'}`}>
                                            {linie.produs.stoc_depozit}
                                        </td>

                                        <td className="py-4 px-6 text-center font-bold text-gray-500 bg-red-50/30">
                                            {linie.cantitate}
                                        </td>

                                        <td className="py-4 px-6 bg-green-50/30">
                                            <div className="flex justify-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={linie.cantitate_aprobata}
                                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                    className={`w-20 text-center font-bold border-2 rounded-lg py-1 px-2 outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                                                        modificat ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                />
                                            </div>
                                        </td>

                                        <td className="py-4 px-6 text-right text-gray-600 text-sm font-mono">
                                            {linie.pret_unitar.toFixed(2)}
                                        </td>

                                        <td className="py-4 px-6 text-right font-bold text-gray-800 font-mono">
                                            {(linie.cantitate_aprobata * linie.pret_unitar).toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            * Modificarea cantităților va actualiza automat totalul comenzii.
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={saving}
                                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${
                                    saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                }`}
                            >
                                {saving ? 'Se trimite...' : <><Save size={20} /> Aprobă & Trimite la Agent</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}