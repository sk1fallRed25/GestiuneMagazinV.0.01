import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { History, LogOut, Send, CheckCircle, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- TIPURI DE DATE ---
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

interface ComandaPrimita {
    id: number;
    created_at: string;
    status: string;
    cantitate: number;
    produs: { nume: string };
    observatii: string;
}

// --- COMPONENTA RÂND PRODUS ---
const ProductRow = ({ produs, onPlaceOrder }: {
    produs: ProdusAgent,
    onPlaceOrder: (produsId: number, cantitate: number, pretFaraTVA: number) => Promise<void>
}) => {
    const [cantitate, setCantitate] = useState<number | string>('');
    const [pretFinal, setPretFinal] = useState<number | string>('');

    const handleOrderClick = () => {
        const numCantitate = Number(cantitate);
        const numPretFinal = Number(pretFinal);

        if (numCantitate > 0 && numPretFinal > 0) {
            // Calculăm prețul fără TVA (Preț Final / 1.TVA)
            const pretFaraTVA = numPretFinal / (1 + produs.tva_procent / 100);

            onPlaceOrder(produs.id, numCantitate, pretFaraTVA);

            // Resetăm câmpurile
            setCantitate('');
            setPretFinal('');
        } else {
            toast.error("Introduceți o cantitate și un preț valide.");
        }
    };

    return (
        <tr className="hover:bg-gray-50 border-t">
            <td className="py-3 px-4 font-bold text-gray-800">{produs.nume}</td>
            <td className="py-3 px-4 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${produs.stoc_depozit > produs.stoc_minim_depozit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {produs.stoc_depozit}
                </span>
            </td>
            <td className="py-3 px-4 text-center">
                <span className="text-blue-600 font-bold">{produs.prag_optim}</span>
            </td>
            <td className="py-2 px-2">
                <input
                    type="number"
                    placeholder="Cant."
                    value={cantitate}
                    onChange={(e) => setCantitate(e.target.value)}
                    className="w-20 border rounded-md p-1 text-center focus:border-blue-500 outline-none"
                />
            </td>
            <td className="py-2 px-2">
                <input
                    type="number"
                    step="0.01"
                    placeholder="Preț Final (cu TVA)"
                    value={pretFinal}
                    onChange={(e) => setPretFinal(e.target.value)}
                    className="w-32 border rounded-md p-1 text-center focus:border-blue-500 outline-none"
                />
            </td>
            <td className="py-2 px-2 text-right">
                <button
                    onClick={handleOrderClick}
                    className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition"
                >
                    <Send size={16} />
                </button>
            </td>
        </tr>
    );
};

// --- COMPONENTA PRINCIPALĂ ---
export default function AgentDashboard({ agentId, onLogout }: { agentId: number, onLogout: () => void }) {
    const [produse, setProduse] = useState<ProdusAgent[]>([]);
    const [istoric, setIstoric] = useState<ComandaIstoric[]>([]);
    const [comenziPrimite, setComenziPrimite] = useState<ComandaPrimita[]>([]);
    const [agentInfo, setAgentInfo] = useState<{ nume: string, furnizor_id: number | null }>({ nume: '', furnizor_id: null });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Info Agent
            const { data: agent } = await supabase.from('agenti').select('nume, furnizor_id').eq('id', agentId).single();
            if (agent) {
                setAgentInfo(agent);

                // 2. Produse alocate agentului
                const { data: relatii } = await supabase.from('agent_produse').select('produs_id').eq('agent_id', agentId);
                if (relatii && relatii.length > 0) {
                    const ids = relatii.map(r => r.produs_id);
                    const { data: produseData } = await supabase
                        .from('produse')
                        .select('id, nume, unitate_masura, stoc_depozit, stoc_minim_depozit, prag_optim, tva_procent')
                        .in('id', ids)
                        .order('nume');
                    if (produseData) setProduse(produseData);
                }

                // 3. Istoric comenzi plasate de agent
                const { data: istoricData } = await supabase
                    .from('comenzi_agenti')
                    .select('id, created_at, status, total_valoare')
                    .eq('agent_id', agentId)
                    .order('created_at', { ascending: false });
                if (istoricData) setIstoric(istoricData);

                // 4. Comenzi primite de la Admin
                const { data: primiteData } = await supabase
                    .from('comenzi_catre_furnizor')
                    .select('*, produs:produse(nume)')
                    .eq('agent_id', agentId)
                    .order('created_at', { ascending: false });
                if (primiteData) setComenziPrimite(primiteData);
            }
        } catch (err: any) {
            toast.error(`Eroare la încărcarea datelor: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [agentId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePlaceSingleOrder = async (produsId: number, cantitate: number, pretFaraTVA: number) => {
        if (!agentInfo.furnizor_id) {
            toast.error("Eroare: Furnizorul nu a putut fi identificat.");
            return;
        }

        // Creăm o promisiune standard pentru a fi gestionată de Toast
        const promise = (async () => {
            // Pas 1: Antet Comandă
            const { data: comandaAntet, error: errAntet } = await supabase
                .from('comenzi_agenti')
                .insert({
                    agent_id: agentId,
                    furnizor_id: agentInfo.furnizor_id,
                    total_valoare: cantitate * pretFaraTVA,
                    status: 'pending_admin'
                })
                .select()
                .single();

            if (errAntet) throw errAntet;

            // Pas 2: Detaliu Comandă
            const { error: errDetaliu } = await supabase
                .from('comenzi_agenti_detalii')
                .insert({
                    comanda_id: comandaAntet.id,
                    produs_id: produsId,
                    cantitate: cantitate,
                    pret_unitar: pretFaraTVA
                });

            if (errDetaliu) throw errDetaliu;

            return comandaAntet;
        })();

        await toast.promise(promise, {
            loading: 'Se trimite comanda...',
            success: 'Comanda a fost trimisă!',
            error: (err) => `Eroare: ${err.message}`
        });

        fetchData();
    };

    const handleFinalizeOrder = async (comandaId: number) => {
        const promise = supabase
            .rpc('finalizeaza_comanda_agent', { p_comanda_id: comandaId })
            .then(({ error }) => {
                if (error) throw error;
            });

        // @ts-ignore
        await toast.promise(promise, {
            loading: 'Se finalizează comanda...',
            success: 'Comandă finalizată cu succes!',
            error: (err) => `Eroare: ${err.message}`
        });

        fetchData();
    };

    const getStatusChip = (status: string) => {
        const statusMap: { [key: string]: string } = {
            'approved': 'bg-green-100 text-green-700',
            'accepted': 'bg-green-100 text-green-700',
            'rejected': 'bg-red-100 text-red-700',
            'pending_admin': 'bg-yellow-100 text-yellow-800',
            'pending_agent': 'bg-blue-100 text-blue-800',
            'pending': 'bg-yellow-100 text-yellow-800'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Portal Partener</h1>
                    <p className="text-sm text-gray-500">Salut, {agentInfo.nume}!</p>
                </div>
                <button onClick={onLogout} className="flex items-center gap-2 text-red-500 font-medium text-sm border border-red-100 px-4 py-2 rounded-lg hover:bg-red-50 transition">
                    <LogOut size={16} /> Ieșire
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* STÂNGA: Plasare Comenzi */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">Plasează o Comandă Rapidă</h2>
                        <p className="text-sm text-gray-500">Adaugă cantitatea și prețul (cu TVA) pentru a trimite o ofertă către administrator.</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                            <tr>
                                <th className="py-3 px-4">Produs</th>
                                <th className="py-3 px-4 text-center">Stoc Curent</th>
                                <th className="py-3 px-4 text-center">Stoc Ideal</th>
                                <th className="py-3 px-4">Cantitate</th>
                                <th className="py-3 px-4">Preț Final (RON)</th>
                                <th className="py-3 px-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Se încarcă produsele...</td></tr>
                            ) : produse.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center"><h3 className="text-lg font-bold text-gray-400">Niciun produs alocat.</h3></td></tr>
                            ) : (
                                produse.map(p => (
                                    <ProductRow key={p.id} produs={p} onPlaceOrder={handlePlaceSingleOrder} />
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* DREAPTA: Istoric și Comenzi Primite */}
                <div className="space-y-6">

                    {/* SECȚIUNEA 1: Comenzi Primite */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Inbox size={20} className="text-blue-600"/> Comenzi Primite
                        </h2>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-h-80 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                            <tr>
                                <th className="py-3 px-4">Produs</th>
                                <th className="py-3 px-4 text-center">Cant.</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400">...</td></tr>
                            ) : !comenziPrimite.length ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm">Nicio comandă primită de la admin.</td></tr>
                            ) : (
                                comenziPrimite.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 border-t">
                                        <td className="py-3 px-4 font-bold text-gray-700">{c.produs?.nume || 'Produs Șters'}</td>
                                        <td className="py-3 px-4 text-center font-bold">{c.cantitate}</td>
                                        <td className="py-3 px-4">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusChip(c.status)}`}>
                                                    {c.status}
                                                </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {c.status === 'pending' && (
                                                <Link to={`/comanda-primita/${c.id}`} className="text-blue-600 font-bold text-xs hover:underline">
                                                    Vezi Detalii
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* SECȚIUNEA 2: Istoric Comenzi Plasate */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <History size={20} className="text-purple-600"/> Istoric Oferte
                        </h2>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-h-80 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                            <tr>
                                <th className="py-3 px-4">Dată</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Acțiune</th>
                            </tr>
                            </thead>
                            <tbody>
                            {loading ? (
                                <tr><td colSpan={3} className="p-8 text-center text-gray-400">...</td></tr>
                            ) : !istoric.length ? (
                                <tr><td colSpan={3} className="p-8 text-center text-gray-500 text-sm">Nu ai plasat nicio ofertă.</td></tr>
                            ) : (
                                istoric.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 border-t">
                                        <td className="py-3 px-4 text-gray-600">{new Date(c.created_at).toLocaleDateString()}</td>
                                        <td className="py-3 px-4">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusChip(c.status)}`}>
                                                    {c.status.replace(/_/g, ' ')}
                                                </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {c.status === 'pending_agent' && (
                                                <button
                                                    onClick={() => handleFinalizeOrder(c.id)}
                                                    className="bg-green-500 text-white px-2 py-1 rounded-md text-xs font-bold hover:bg-green-600 flex items-center gap-1 ml-auto"
                                                >
                                                    <CheckCircle size={14} /> Confirmă
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
}