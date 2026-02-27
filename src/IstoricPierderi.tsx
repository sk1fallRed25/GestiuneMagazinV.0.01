import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ClipboardList, User, Calendar, AlertTriangle, Package, Loader2 } from 'lucide-react';

export default function IstoricPierderi() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            // S-a actualizat criteriul de sortare la 'data_pierdere'
            const { data, error } = await supabase
                .from('view_audit_angajati_pierderi')
                .select('*')
                .order('data_pierdere', { ascending: false });

            if (error) throw error;
            if (data) setLogs(data);
        } catch (error: any) {
            console.error("Eroare la preluarea jurnalului:", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto font-sans">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                    <ClipboardList className="text-indigo-600" size={32} /> Audit Pierderi & Casări
                </h1>
                <p className="text-slate-500 font-medium">
                    Monitorizarea nominală a activității personalului privind declasarea produselor neconforme.
                </p>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400">Data & Ora</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400">Angajat Responsabil</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400">Produs Vizat</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center">Cantitate</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400">Motiv & Sursă</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {loading ? (
                        <tr>
                            <td colSpan={5} className="p-20 text-center">
                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                    <Loader2 className="animate-spin" size={32} />
                                    <span className="font-bold">Sincronizare date audit...</span>
                                </div>
                            </td>
                        </tr>
                    ) : logs.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-20 text-center text-slate-400 font-bold italic">
                                Nu există înregistrări în jurnalul de pierderi.
                            </td>
                        </tr>
                    ) : logs.map((log) => (
                        <tr key={log.pierdere_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-6 text-sm text-slate-500 font-medium">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-indigo-400" />
                                    {/* S-a înlocuit log.data_ora cu log.data_pierdere */}
                                    {new Date(log.data_pierdere).toLocaleString('ro-RO')}
                                </div>
                            </td>
                            <td className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black shadow-sm">
                                        {log.nume_angajat?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm leading-tight">{log.nume_angajat}</p>
                                        <p className="text-[10px] font-black uppercase text-indigo-500 tracking-tighter">{log.rol_angajat}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-6 font-bold text-slate-700 text-sm">
                                <div className="flex items-center gap-2">
                                    <Package size={16} className="text-slate-300" />
                                    {log.nume_produs}
                                </div>
                            </td>
                            <td className="p-6 text-center">
                                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg font-black text-xs border border-red-100">
                                    -{log.cantitate}
                                </span>
                            </td>
                            <td className="p-6">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                                        <AlertTriangle size={14} className="text-orange-500" />
                                        {log.motiv}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase">
                                        Gestiune: {log.sursa_stoc || "Nespecificat"}
                                    </p>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}