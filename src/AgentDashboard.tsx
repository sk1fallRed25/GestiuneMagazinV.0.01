import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { History, LogOut, Send, CheckCircle, Inbox, AlertCircle } from 'lucide-react';
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
    produs: { nume: string } | null; // Poate fi null dacă produsul e șters
    observatii: string;
}

interface AgentInfo {
    nume: string;
    furnizor_id: number | null;
}

// --- COMPONENTA RÂND PRODUS (TABEL STÂNGA) ---
const ProductRow = ({ produs, onPlaceOrder }: {
    produs: ProdusAgent,
    onPlaceOrder: (produsId: number, cantitate: number, pretFaraTVA: number) => Promise<void>
}) => {
    const [cantitate, setCantitate] = useState<string>('');
    const [pretFinal, setPretFinal] = useState<string>('');

    const handleOrderClick = () => {
        const numCantitate = parseFloat(cantitate);
        const numPretFinal = parseFloat(pretFinal);

        if (numCantitate > 0 && numPretFinal > 0) {
            // Calculăm prețul fără TVA: Preț Final / (1 + TVA%)
            // Ex: 119 RON cu TVA 19% => 100 RON bază
            const tvaDecimal = produs.tva_procent ? produs.tva_procent / 100 : 0.19;
            const pretFaraTVA = numPretFinal / (1 + tvaDecimal);

            onPlaceOrder(produs.id, numCantitate, pretFaraTVA);

            // Resetăm câmpurile după trimitere
            setCantitate('');
            setPretFinal('');
        } else {
            toast.error("Introduceți o cantitate și un preț (cu TVA) valide.");
        }
    };

    return (
        <tr className="hover:bg-gray-50 border-t transition-colors">
            <td className="py-3 px-4 text-gray-800">
                <div className="font-bold">{produs.nume}</div>
                <div className="text-xs text-gray-500">TVA: {produs.tva_procent}%</div>
            </td>
            <td className="py-3 px-4 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${produs.stoc_depozit > produs.stoc_minim_depozit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {produs.stoc_depozit} {produs.unitate_masura}
                </span>
            </td>
            <td className="py-3 px-4 text-center">
                <span className="text-blue-600 font-bold text-sm">{produs.prag_optim}</span>
            </td>
            <td className="py-2 px-2">
                <input
                    type="number"
                    min="1"
                    placeholder="Cant."
                    value={cantitate}
                    onChange={(e) => setCantitate(e.target.value)}
                    className="w-20 border border-gray-300 rounded-md p-2 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                />
            </td>
            <td className="py-2 px-2">
                <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="RON (cu TVA)"
                    value={pretFinal}
                    onChange={(e) => setPretFinal(e.target.value)}
                    className="w-32 border border-gray-300 rounded-md p-2 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                />
            </td>
            <td className="py-2 px-2 text-right">
                <button
                    onClick={handleOrderClick}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition shadow-sm active:transform active:scale-95"
                    title="Trimite Ofertă"
                >
                    <Send size={18} />
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
    const [agentInfo, setAgentInfo] = useState<AgentInfo>({ nume: '', furnizor_id: null });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!agentId) return;
        setLoading(true);
        try {
            // 1. Info Agent
            const { data: agent, error: errAgent } = await supabase
                .from('agenti')
                .select('nume, furnizor_id')
                .eq('id', agentId)
                .single();

            if (errAgent) throw errAgent;
            if (agent) setAgentInfo(agent);

            // 2. Produse alocate agentului (prin tabela de legătură sau direct produse)
            // Presupunem tabela 'agent_produse' care leagă agentul de produsele pe care le poate vinde/aproviziona
            const { data: relatii } = await supabase
                .from('agent_produse')
                .select('produs_id')
                .eq('agent_id', agentId);

            if (relatii && relatii.length > 0) {
                const ids = relatii.map(r => r.produs_id);
                const { data: produseData } = await supabase
                    .from('produse')
                    .select('id, nume, unitate_masura, stoc_depozit, stoc_minim_depozit, prag_optim, tva_procent')
                    .in('id', ids)
                    .order('nume');

                if (produseData) setProduse(produseData);
            } else {
                setProduse([]); // Niciun produs alocat
            }

            // 3. Istoric comenzi plasate de agent (Către Admin)
            const { data: istoricData } = await supabase
                .from('comenzi_agenti')
                .select('id, created_at, status, total_valoare')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (istoricData) setIstoric(istoricData);

            // 4. Comenzi primite (De la Admin -> Către Furnizor prin acest Agent)
            // Aici verificăm tabela 'comenzi_catre_furnizor' unde agentul este intermediar
            const { data: primiteData } = await supabase
                .from('comenzi_catre_furnizor')
                .select('*, produs:produse(nume)')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (primiteData) setComenziPrimite(primiteData);

        } catch (err: any) {
            console.error(err);
            toast.error("Nu s-au putut încărca datele.");
        } finally {
            setLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- ACȚIUNE: PLASARE COMANDĂ NOUĂ ---
    const handlePlaceSingleOrder = async (produsId: number, cantitate: number, pretFaraTVA: number) => {
        if (!agentInfo.furnizor_id) {
            toast.error("Eroare critică: Nu aveți un Furnizor asociat contului.");
            return;
        }

        const promise = (async () => {
            // 1. Creare Antet Comandă
            const { data: comandaAntet, error: errAntet } = await supabase
                .from('comenzi_agenti')
                .insert({
                    agent_id: agentId,
                    furnizor_id: agentInfo.furnizor_id,
                    total_valoare: cantitate * pretFaraTVA, // Valoare estimată
                    status: 'pending_admin' // Așteaptă aprobarea adminului
                })
                .select()
                .single();

            if (errAntet) throw errAntet;

            // 2. Creare Detaliu (Produsul)
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
            loading: 'Se trimite oferta...',
            success: 'Ofertă trimisă către administrator!',
            error: (err) => `Eroare: ${err.message}`
        });

        // Reîmprospătare date
        fetchData();
    };

    // --- ACȚIUNE: CONFIRMARE COMANDĂ (FINALIZARE) ---
    const handleFinalizeOrder = async (comandaId: number) => {
        // Se presupune că există o funcție RPC în baza de date pentru logică complexă
        const promise = supabase
            .rpc('finalizeaza_comanda_agent', { p_comanda_id: comandaId })
            .then(({ error }) => {
                if (error) throw error;
            });

        await toast.promise(promise, {
            loading: 'Se procesează...',
            success: 'Comandă marcată ca finalizată!',
            error: (err) => `Eroare: ${err.message}`
        });

        fetchData();
    };

    // Helper pentru culori status
    const getStatusChip = (status: string) => {
        const styles: { [key: string]: string } = {
            'approved': 'bg-green-100 text-green-700 border-green-200',
            'accepted': 'bg-green-100 text-green-700 border-green-200',
            'completed': 'bg-blue-100 text-blue-700 border-blue-200',
            'rejected': 'bg-red-100 text-red-700 border-red-200',
            'pending_admin': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'pending': 'bg-orange-100 text-orange-800 border-orange-200',
        };
        return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            {/* --- NAVBAR --- */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Portal Partener</h1>
                    <p className="text-sm text-gray-500 font-medium">Conectat ca: <span className="text-blue-600">{agentInfo.nume || 'Agent'}</span></p>
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 text-red-600 font-semibold text-sm border border-red-100 bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 hover:border-red-200 transition-all"
                >
                    <LogOut size={16} /> Deconectare
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- COLOANA STÂNGA: PRODUSE ȘI PLASARE COMENZI --- */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Send size={24} className="text-blue-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Ofertare Rapidă</h2>
                        </div>
                        <p className="text-gray-500 text-sm">Trimite oferte de preț și cantitate către administrator pentru produsele alocate.</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b border-gray-200">
                                <tr>
                                    <th className="py-4 px-4 font-semibold">Produs</th>
                                    <th className="py-4 px-4 text-center font-semibold">Stoc Actual</th>
                                    <th className="py-4 px-4 text-center font-semibold">Stoc Ideal</th>
                                    <th className="py-4 px-4 font-semibold w-24">Cantitate</th>
                                    <th className="py-4 px-4 font-semibold w-36">Preț (cu TVA)</th>
                                    <th className="py-4 px-4 font-semibold w-16"></th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Se încarcă produsele...</td></tr>
                                ) : produse.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <AlertCircle size={32} />
                                                <span className="font-medium">Niciun produs alocat acestui cont.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    produse.map(p => (
                                        <ProductRow key={p.id} produs={p} onPlaceOrder={handlePlaceSingleOrder} />
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- COLOANA DREAPTA: TABELURI DE STATUS --- */}
                <div className="space-y-8">

                    {/* TABEL 1: COMENZI PRIMITE (Cereri de aprovizionare) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Inbox size={18} className="text-purple-600" />
                            <h3 className="font-bold text-gray-800 text-lg">Cereri Aprovizionare</h3>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-96">
                            <div className="overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold">Produs</th>
                                        <th className="py-3 px-4 text-center font-semibold">Cant.</th>
                                        <th className="py-3 px-4 text-right font-semibold">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-6 text-center text-gray-400 text-xs">...</td></tr>
                                    ) : !comenziPrimite.length ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-400 text-xs">Nu aveți cereri noi.</td></tr>
                                    ) : (
                                        comenziPrimite.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 font-medium text-gray-700">
                                                    {c.produs?.nume || <span className="text-red-400 italic">Produs șters</span>}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-gray-900">{c.cantitate}</td>
                                                <td className="py-3 px-4 text-right">
                                                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wide font-bold border rounded-md ${getStatusChip(c.status)}`}>
                                                            {c.status}
                                                        </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* TABEL 2: ISTORIC OFERTE TRIMISE */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <History size={18} className="text-gray-600" />
                            <h3 className="font-bold text-gray-800 text-lg">Istoric Oferte</h3>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-96">
                            <div className="overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold">Dată</th>
                                        <th className="py-3 px-4 font-semibold">Status</th>
                                        <th className="py-3 px-4 text-right font-semibold">Acțiune</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-6 text-center text-gray-400 text-xs">...</td></tr>
                                    ) : !istoric.length ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-400 text-xs">Nu ați trimis nicio ofertă.</td></tr>
                                    ) : (
                                        istoric.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 text-gray-500 text-xs">
                                                    {new Date(c.created_at).toLocaleDateString('ro-RO')}
                                                </td>
                                                <td className="py-3 px-4">
                                                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wide font-bold border rounded-md ${getStatusChip(c.status)}`}>
                                                            {c.status.replace('pending_admin', 'În Analiză').replace('approved', 'Aprobat')}
                                                        </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {c.status === 'pending_agent' && (
                                                        <button
                                                            onClick={() => handleFinalizeOrder(c.id)}
                                                            className="ml-auto flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-bold transition-colors shadow-sm"
                                                        >
                                                            <CheckCircle size={12} /> Confirmă
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
            </div>
        </div>
    );
}