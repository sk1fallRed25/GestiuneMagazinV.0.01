import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { FileText, Calendar, User, CreditCard, ChevronDown, ChevronUp, RefreshCw, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IstoricVanzari() {
    const [loading, setLoading] = useState(true);
    const [vanzari, setVanzari] = useState<any[]>([]);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    // Default: data de azi
    const today = new Date().toISOString().split('T')[0];
    const [filterData, setFilterData] = useState(today);

    const fetchVanzari = useCallback(async () => {
        setLoading(true);
        try {
            // Calculăm intervalul de timp pentru ziua selectată (00:00:00 - 23:59:59)
            // Dacă filterData e gol, aducem ultimele 50
            let query = supabase
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

            if (filterData) {
                const startDate = `${filterData}T00:00:00`;
                const endDate = `${filterData}T23:59:59.999`;
                query = query.gte('data_vanzare', startDate).lte('data_vanzare', endDate);
            } else {
                query = query.limit(50);
            }

            const { data, error } = await query;

            if (error) throw error;
            setVanzari(data || []);
        } catch (error: any) {
            toast.error("Eroare la încărcare istoric: " + error.message);
        } finally {
            setLoading(false);
        }
    }, [filterData]);

    useEffect(() => {
        fetchVanzari();
    }, [fetchVanzari]);

    const toggleRow = (id: number) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const handlePrintBon = (vanzare: any) => {
        // În viitor: Integrare cu API imprimantă termică
        alert(`Retipărire bon #${vanzare.id}\nTotal: ${vanzare.total} RON`);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200"><FileText size={24} /></span>
                        Registru Vânzări
                    </h1>
                    <p className="text-gray-500 mt-2 ml-1">Vizualizează bonurile fiscale emise și detaliile tranzacțiilor.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 pl-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <Calendar size={18} className="text-indigo-500" />
                    <input
                        type="date"
                        className="outline-none text-gray-700 font-bold bg-transparent text-sm cursor-pointer"
                        value={filterData}
                        onChange={(e) => setFilterData(e.target.value)}
                    />
                    <button
                        onClick={() => fetchVanzari()}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors ml-2"
                        title="Reîncarcă"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Tabel */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-100">
                        <tr>
                            <th className="p-5 w-20">ID</th>
                            <th className="p-5">Data & Ora</th>
                            <th className="p-5">Casier</th>
                            <th className="p-5 text-center">Metoda</th>
                            <th className="p-5 text-right">Total</th>
                            <th className="p-5 text-center w-24">Acțiuni</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={6} className="p-12 text-center text-gray-400">Se încarcă tranzacțiile...</td></tr>
                        ) : vanzari.length === 0 ? (
                            <tr><td colSpan={6} className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                                <FileText size={32} className="opacity-20" />
                                Nu există vânzări pentru data selectată.
                            </td></tr>
                        ) : vanzari.map((v) => (
                            <React.Fragment key={v.id}>
                                {/* RÂNDUL PRINCIPAL */}
                                <tr
                                    className={`transition-colors cursor-pointer group ${expandedRow === v.id ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}
                                    onClick={() => toggleRow(v.id)}
                                >
                                    <td className="p-5 font-mono text-sm text-gray-400 group-hover:text-indigo-500 transition-colors">#{v.id}</td>
                                    <td className="p-5 font-medium text-gray-700">
                                        {new Date(v.data_vanzare).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                        <span className="text-gray-400 text-xs ml-2 font-normal">
                                            {new Date(v.data_vanzare).toLocaleDateString('ro-RO')}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold border border-gray-200">
                                                <User size={14} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-600">{v.utilizatori?.nume || 'Sistem'}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                            v.metoda_plata === 'card'
                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                            {v.metoda_plata === 'card' ? <CreditCard size={12}/> : <span>💵</span>}
                                            {v.metoda_plata}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right">
                                        <span className="font-bold text-gray-900 text-lg">{parseFloat(v.total).toFixed(2)} <span className="text-xs text-gray-400 font-normal">RON</span></span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <button
                                            className={`p-2 rounded-full transition-all ${expandedRow === v.id ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'text-gray-400 hover:bg-gray-100'}`}
                                        >
                                            <ChevronDown size={18} />
                                        </button>
                                    </td>
                                </tr>

                                {/* RÂNDUL SECUNDAR (DETALII) */}
                                {expandedRow === v.id && (
                                    <tr className="bg-indigo-50/30">
                                        <td colSpan={6} className="p-0">
                                            <div className="p-6 pl-20 animate-in slide-in-from-top-2 duration-200">
                                                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                                                    <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50/50">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">Produse pe bon</h4>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handlePrintBon(v); }}
                                                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            <Printer size={14} /> Retipărește Bon
                                                        </button>
                                                    </div>
                                                    <table className="w-full text-sm">
                                                        <thead className="text-gray-400 text-[10px] uppercase font-semibold bg-white border-b border-gray-50">
                                                        <tr>
                                                            <th className="p-3 pl-5 text-left">Denumire Produs</th>
                                                            <th className="p-3 text-center">Cant.</th>
                                                            <th className="p-3 text-right">Preț</th>
                                                            <th className="p-3 text-right pr-5">Total Linie</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                        {v.detalii_vanzare.map((d: any, idx: number) => (
                                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                                <td className="p-3 pl-5">
                                                                    <div className="font-medium text-gray-700">{d.produse?.nume || 'Produs Șters'}</div>
                                                                    <div className="text-[10px] text-gray-400 font-mono">{d.produse?.cod_bare}</div>
                                                                </td>
                                                                <td className="p-3 text-center text-gray-600 font-medium">x{d.cantitate}</td>
                                                                <td className="p-3 text-right text-gray-500">{d.pret_vanzare.toFixed(2)}</td>
                                                                <td className="p-3 text-right pr-5 font-bold text-gray-800">
                                                                    {(d.cantitate * d.pret_vanzare).toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                        <tfoot className="bg-gray-50/50 font-bold text-gray-800 border-t border-gray-100">
                                                        <tr>
                                                            <td colSpan={3} className="p-3 text-right text-xs text-gray-500 uppercase">Total Bon:</td>
                                                            <td className="p-3 text-right pr-5">{parseFloat(v.total).toFixed(2)} RON</td>
                                                        </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
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
        </div>
    );
}