import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { History, LogOut, Send, Inbox, PackageOpen, CheckCircle, Loader2 } from 'lucide-react';

// --- DEFINIȚII INTERFEȚE ---
interface ProdusAgent {
    id: number;
    nume: string;
    stoc_depozit: number;
    stoc_minim_depozit: number;
    prag_optim: number;
    unitate_masura: string;
    tva_procent: number;
}

interface ComandaIstoric {
    id: number;
    created_at: string;
    status: string;
    total_valoare: number;
}

interface DetaliuComandaPrimita {
    cantitate: number;
    pret_unitar: number;
    produs: { nume: string; unitate_masura: string } | null;
}

interface ComandaPrimita {
    id: number;
    created_at: string;
    status: string;
    total_valoare: number;
    detalii: DetaliuComandaPrimita[];
}

interface AgentInfo {
    nume: string;
    furnizor_id: number | null;
}

// --- COMPONENTĂ RÂND TABELAR ---
const ProductRow = ({ produs, onPlaceOrder }: {
    produs: ProdusAgent,
    onPlaceOrder: (produsId: number, cantitate: number, pretFaraTVA: number, cotaTVA: number) => Promise<void>
}) => {
    const [cantitate, setCantitate] = useState<string>('');
    const [pretFaraTVA, setPretFaraTVA] = useState<string>('');
    const [cotaTVA, setCotaTVA] = useState<number>(21);

    const handleOrderClick = async () => {
        const numCantitate = parseFloat(cantitate);
        const numPretFaraTVA = parseFloat(pretFaraTVA);

        if (numCantitate > 0 && numPretFaraTVA > 0) {
            await onPlaceOrder(produs.id, numCantitate, numPretFaraTVA, cotaTVA);
            setCantitate('');
            setPretFaraTVA('');
        } else {
            toast.error("Parametri introduși nu sunt valizi.");
        }
    };

    return (
        <tr className="hover:bg-gray-50 border-t transition-colors">
            <td className="py-3 px-4 text-gray-800">
                <div className="font-bold">{produs.nume}</div>
                <div className="text-xs text-gray-500 uppercase font-black">UM: {produs.unitate_masura}</div>
            </td>
            <td className="py-3 px-4 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${produs.stoc_depozit > produs.stoc_minim_depozit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {produs.stoc_depozit}
                </span>
            </td>
            <td className="py-3 px-4 text-center">
                <span className="text-blue-600 font-bold text-sm">{produs.prag_optim}</span>
            </td>
            <td className="py-2 px-2">
                <input
                    type="number" min="1" placeholder="0"
                    value={cantitate} onChange={(e) => setCantitate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </td>
            <td className="py-2 px-2">
                <input
                    type="number" min="0.01" step="0.01" placeholder="0.00"
                    value={pretFaraTVA} onChange={(e) => setPretFaraTVA(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </td>
            <td className="py-2 px-2">
                <select
                    value={cotaTVA}
                    onChange={(e) => setCotaTVA(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md p-2 text-center bg-white outline-none"
                >
                    <option value={9}>9%</option>
                    <option value={19}>19%</option>
                    <option value={21}>21%</option>
                </select>
            </td>
            <td className="py-2 px-4 text-right">
                <button
                    onClick={handleOrderClick}
                    className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95"
                >
                    <Send size={18} />
                </button>
            </td>
        </tr>
    );
};

// --- MODUL PRINCIPAL ---
export default function AgentDashboard({ agentId, onLogout }: { agentId: number, onLogout: () => void }) {
    const [produse, setProduse] = useState<ProdusAgent[]>([]);
    const [istoric, setIstoric] = useState<ComandaIstoric[]>([]);
    const [comenziPrimite, setComenziPrimite] = useState<ComandaPrimita[]>([]);
    const [agentInfo, setAgentInfo] = useState<AgentInfo>({ nume: '', furnizor_id: null });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!agentId) return;
        setLoading(true);
        try {
            const { data: agent } = await supabase.from('agenti').select('nume, furnizor_id').eq('id', agentId).single();
            if (agent) setAgentInfo(agent);

            const { data: relatii } = await supabase.from('agent_produse').select('produs_id').eq('agent_id', agentId);

            if (relatii && relatii.length > 0) {
                const ids = relatii.map(r => r.produs_id);
                const { data: pData } = await supabase.from('produse').select('*').in('id', ids).order('nume');
                if (pData) setProduse(pData);
            }

            const { data: istoricData } = await supabase.from('comenzi_agenti').select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
            if (istoricData) setIstoric(istoricData);

            const { data: primiteData } = await supabase.from('comenzi_catre_furnizor').select(`
                    id, created_at, status, total_valoare,
                    detalii:comenzi_aprovizionare_detalii(cantitate, pret_unitar, produs:produse(nume, unitate_masura))
                `).eq('agent_id', agentId).order('created_at', { ascending: false });

            if (primiteData) setComenziPrimite(primiteData as any);
        } catch (err: any) {
            toast.error("Eroare sincronizare date.");
        } finally {
            setLoading(false);
        }
    }, [agentId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePlaceSingleOrder = async (produsId: number, cantitate: number, pretFaraTVA: number, cotaTVA: number) => {
        if (!agentInfo.furnizor_id) return toast.error("Furnizor neidentificat.");

        const valoareTotalaCuTva = cantitate * pretFaraTVA * (1 + (cotaTVA / 100));

        const promise = (async () => {
            const { data: antet, error: errA } = await supabase.from('comenzi_agenti').insert({
                agent_id: agentId, furnizor_id: agentInfo.furnizor_id, total_valoare: valoareTotalaCuTva, status: 'pending_admin'
            }).select().single();
            if (errA) throw errA;

            const { error: errD } = await supabase.from('comenzi_agenti_detalii').insert({
                comanda_id: antet.id, produs_id: produsId, cantitate, pret_unitar: pretFaraTVA, cota_tva: cotaTVA
            });
            if (errD) throw errD;
        })();

        await toast.promise(promise, { loading: 'Procesare...', success: 'Ofertă transmisă.', error: 'Eroare la trimitere.' });
        fetchData();
    };

    const handleConfirmareComandaPrimita = async (comandaId: number) => {
        const { error } = await supabase.from('comenzi_catre_furnizor').update({ status: 'confirmed' }).eq('id', comandaId);
        if (!error) { toast.success("Comandă confirmată."); fetchData(); }
    };

    const getStatusChip = (status: string) => {
        const styles: { [key: string]: string } = {
            'approved': 'bg-green-100 text-green-700 border-green-200',
            'pending_admin': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'rejected': 'bg-red-100 text-red-700 border-red-200',
            'pending': 'bg-blue-100 text-blue-700 border-blue-200',
            'confirmed': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        };
        return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            <nav className="bg-white border-b px-8 py-5 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Portal Parteneri</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Sesiune: {agentInfo.nume}</p>
                </div>
                <button onClick={onLogout} className="flex items-center gap-2 text-red-600 font-black text-[10px] uppercase border-2 border-red-100 bg-red-50 px-5 py-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                    <LogOut size={16} /> Deconectare
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* SECȚIUNE COMENZI PRIMITE */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b bg-slate-50/50 flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Inbox size={24}/></div>
                            <h2 className="text-xl font-black text-slate-800 uppercase">Comenzi Recepționate</h2>
                        </div>
                        <div className="p-8">
                            {loading ? (
                                <div className="flex justify-center p-10 text-slate-300 animate-pulse"><Loader2 className="animate-spin" size={32}/></div>
                            ) : comenziPrimite.length === 0 ? (
                                <p className="text-center text-slate-400 font-bold italic">Nicio comandă înregistrată.</p>
                            ) : (
                                <div className="space-y-6">
                                    {comenziPrimite.map((comanda) => (
                                        <div key={comanda.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                                            <div className="p-4 flex justify-between items-center bg-white border-b">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(comanda.created_at).toLocaleString('ro-RO')}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-1 text-[10px] uppercase font-black border rounded-lg ${getStatusChip(comanda.status)}`}>
                                                        {comanda.status}
                                                    </span>
                                                    {comanda.status === 'pending' && (
                                                        <button onClick={() => handleConfirmareComandaPrimita(comanda.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all">Confirmă</button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                {comanda.detalii?.map((d, i) => (
                                                    <div key={i} className="flex justify-between py-2 border-b border-dashed last:border-0">
                                                        <span className="font-bold text-slate-700">{d.produs?.nume}</span>
                                                        <span className="font-black text-indigo-600">{d.cantitate} {d.produs?.unitate_masura}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECȚIUNE EMISIE OFERTĂ */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b bg-slate-50/50 flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100"><Send size={24}/></div>
                            <h2 className="text-xl font-black text-slate-800 uppercase">Emisie Ofertă</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                                <tr>
                                    <th className="p-5">Articol</th>
                                    <th className="p-5 text-center">Stoc</th>
                                    <th className="p-5 text-center">Optim</th>
                                    <th className="p-5 w-24">Volum</th>
                                    <th className="p-5 w-32">Preț Net</th>
                                    <th className="p-5 w-24">TVA</th>
                                    <th className="p-5 w-16"></th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={7} className="p-10 text-center animate-pulse">...</td></tr>
                                ) : produse.map((p) => (
                                    <ProductRow
                                        key={p.id}
                                        produs={p}
                                        onPlaceOrder={async (id, q, pr, t) => { await handlePlaceSingleOrder(id, q, pr, t); }}
                                    />
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ISTORIC LATERAL */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 px-2">
                        <History size={20} className="text-slate-400" />
                        <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Jurnal Oferte</h3>
                    </div>
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b sticky top-0">
                                <tr>
                                    <th className="p-4">Dată</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">RON</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                {istoric.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-[10px] font-bold text-slate-500">{new Date(c.created_at).toLocaleDateString('ro-RO')}</td>
                                        <td className="p-4"><span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border ${getStatusChip(c.status)}`}>{c.status}</span></td>
                                        <td className="p-4 text-right font-black text-slate-800 text-xs">{c.total_valoare?.toFixed(2)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}