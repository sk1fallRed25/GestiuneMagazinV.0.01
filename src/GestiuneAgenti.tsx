import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { User, Package, Search, CheckCircle, Briefcase, ChevronRight, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

// --- TIPURI ---
interface Agent {
    id: number;
    nume: string;
    email: string;
    furnizor?: {
        nume: string;
    } | null;
}

interface Produs {
    id: number;
    nume: string;
    cod_bare: string;
    stoc_depozit: number;
}

export default function GestiuneAgenti() {
    const [loading, setLoading] = useState(true);
    const [loadingProduse, setLoadingProduse] = useState(false);

    const [agenti, setAgenti] = useState<Agent[]>([]);
    const [produse, setProduse] = useState<Produs[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

    const [produseAlocate, setProduseAlocate] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    // --- 1. ÎNCĂRCARE DATE INIȚIALE (Agenți și Produse) ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // Modificat: Includem și furnizorul folosind relația creată în SQL (relatie_unica_agent_furnizor)
            const { data: dataAgenti, error: errA } = await supabase
                .from('agenti')
                .select('*, furnizor:furnizori!relatie_unica_agent_furnizor(nume)')
                .order('nume');

            if (errA) throw errA;
            setAgenti(dataAgenti || []);

            const { data: dataProduse, error: errP } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, stoc_depozit')
                .order('nume');

            if (errP) throw errP;
            setProduse(dataProduse || []);

            if (dataAgenti && dataAgenti.length > 0 && !selectedAgentId) {
                setSelectedAgentId(dataAgenti[0].id);
            }
        } catch (error: any) {
            toast.error('Eroare la sincronizarea cu baza de date.');
            console.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- 2. ÎNCĂRCARE PRODUSELE UNUI AGENT ---
    useEffect(() => {
        const fetchAgentProducts = async () => {
            if (!selectedAgentId) return;
            setLoadingProduse(true);

            try {
                const { data } = await supabase
                    .from('agent_produse')
                    .select('produs_id')
                    .eq('agent_id', selectedAgentId);

                const ids = new Set(data?.map((item: any) => item.produs_id));
                setProduseAlocate(ids);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingProduse(false);
            }
        };

        fetchAgentProducts();
    }, [selectedAgentId]);

    // --- 3. TOGGLE ALOCARE (INSERT/DELETE) ---
    const toggleAlocare = async (produsId: number) => {
        if (!selectedAgentId) return;

        const isAlocated = produseAlocate.has(produsId);
        const newSet = new Set(produseAlocate);

        if (isAlocated) newSet.delete(produsId);
        else newSet.add(produsId);

        setProduseAlocate(newSet);

        try {
            if (isAlocated) {
                const { error } = await supabase
                    .from('agent_produse')
                    .delete()
                    .eq('agent_id', selectedAgentId)
                    .eq('produs_id', produsId);
                if (error) throw error;
                toast.success('Produs retras.', { id: 'toggle-toast', duration: 1000, icon: '🔒' });
            } else {
                const { error } = await supabase
                    .from('agent_produse')
                    .insert({ agent_id: selectedAgentId, produs_id: produsId });
                if (error) throw error;
                toast.success('Produs alocat.', { id: 'toggle-toast', duration: 1000, icon: '✅' });
            }
        } catch (error: any) {
            fetchData(); // Reîncărcăm datele în caz de eroare pentru a asigura sincronizarea
            toast.error('Eroare: ' + error.message);
        }
    };

    const produseFiltrate = produse.filter(p =>
        p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cod_bare && p.cod_bare.includes(searchTerm))
    );

    if (loading) return (
        <div className="h-screen flex items-center justify-center text-gray-500 gap-3">
            <RefreshCw className="animate-spin text-indigo-600" size={24} />
            <p className="font-medium">Se încarcă catalogul și agenții...</p>
        </div>
    );

    return (
        <div className="p-8 h-[calc(100vh-20px)] flex flex-col bg-gray-50/50">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-200"><Briefcase size={24} /></span>
                        Gestiune Atribuții Agenți
                    </h1>
                    <p className="text-gray-500 mt-1 ml-12">Selectează un agent pentru a-i configura catalogul de produse.</p>
                </div>
                <button onClick={fetchData} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* --- LISTA AGENȚI --- */}
                <div className="w-1/3 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2 uppercase text-xs tracking-wider">
                            <User size={16} className="text-indigo-600"/> Agenți Disponibili ({agenti.length})
                        </h3>
                    </div>
                    <div className="overflow-y-auto flex-1 p-3 space-y-2">
                        {agenti.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <AlertCircle className="mx-auto mb-2 opacity-20" size={32} />
                                <p className="text-sm">Nu s-au găsit agenți.</p>
                            </div>
                        ) : agenti.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => setSelectedAgentId(agent.id)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center justify-between group relative overflow-hidden ${
                                    selectedAgentId === agent.id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'bg-white hover:bg-indigo-50 text-gray-700 border border-gray-100 hover:border-indigo-200'
                                }`}
                            >
                                <div className="z-10">
                                    <p className="font-bold text-sm">{agent.nume}</p>
                                    <div className={`flex items-center gap-1.5 text-xs mt-1 ${selectedAgentId === agent.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        <Building2 size={12} />
                                        <span>{agent.furnizor?.nume || 'Fără Furnizor'}</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className={`transition-transform duration-300 ${selectedAgentId === agent.id ? 'text-white translate-x-1' : 'text-gray-300'}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- LISTA PRODUSE --- */}
                <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2 uppercase text-xs tracking-wider">
                            <Package size={16} className="text-indigo-600" />
                            Produse Alocabile
                            {loadingProduse && <RefreshCw className="animate-spin h-3 w-3 text-indigo-600 ml-2" />}
                        </h3>

                        <div className="relative w-full max-w-md group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Caută după nume sau cod bare..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                        {!selectedAgentId ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                                    <User size={32} className="text-indigo-200" />
                                </div>
                                <p className="font-medium text-gray-500">Niciun agent selectat</p>
                                <p className="text-sm">Selectează un agent din stânga pentru a-i atribui produse.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {produseFiltrate.map(produs => {
                                    const isAlocated = produseAlocate.has(produs.id);
                                    return (
                                        <div
                                            key={produs.id}
                                            onClick={() => toggleAlocare(produs.id)}
                                            className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 select-none relative overflow-hidden ${
                                                isAlocated
                                                    ? 'bg-white border-green-500 ring-1 ring-green-500 shadow-md shadow-green-100'
                                                    : 'bg-white border-gray-100 hover:border-indigo-300 hover:shadow-md'
                                            }`}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                                                isAlocated ? 'bg-green-500 border-green-500 text-white scale-110' : 'border-gray-300 bg-gray-50'
                                            }`}>
                                                {isAlocated && <CheckCircle size={14} className="animate-in zoom-in duration-200" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm truncate ${isAlocated ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {produs.nume}
                                                </p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{produs.cod_bare || 'FĂRĂ COD'}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAlocated ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                                        Stoc: {produs.stoc_depozit}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selectedAgentId && (
                        <div className="p-3 bg-white border-t border-gray-100 text-[10px] text-center text-gray-400 flex justify-center items-center gap-2">
                            <AlertCircle size={10} />
                            Configurația se salvează automat în timp real pentru agentul selectat.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}