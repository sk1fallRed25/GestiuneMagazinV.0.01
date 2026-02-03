import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { User, Package, Search, CheckCircle, XCircle, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GestiuneAgenti() {
    const [loading, setLoading] = useState(true);
    const [agenti, setAgenti] = useState<any[]>([]);
    const [produse, setProduse] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

    // Set de ID-uri produse alocate agentului selectat (pentru verificare rapidă)
    const [produseAlocate, setProduseAlocate] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    // --- 1. ÎNCĂRCARE DATE INIȚIALE ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Luăm toți agenții
                const { data: dataAgenti } = await supabase.from('agenti').select('*').order('nume');
                setAgenti(dataAgenti || []);

                // Luăm toate produsele
                const { data: dataProduse } = await supabase.from('produse').select('*').order('nume');
                setProduse(dataProduse || []);

                // Selectăm automat primul agent dacă există
                if (dataAgenti && dataAgenti.length > 0) {
                    handleSelectAgent(dataAgenti[0].id);
                }
            } catch (error: any) {
                toast.error('Eroare încărcare: ' + error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- 2. ÎNCĂRCARE PRODUSELE UNUI AGENT ---
    const handleSelectAgent = async (agentId: number) => {
        setSelectedAgentId(agentId);
        // Luăm doar ID-urile produselor alocate acestui agent
        const { data } = await supabase
            .from('agent_produse')
            .select('produs_id')
            .eq('agent_id', agentId);

        const ids = new Set(data?.map((item: any) => item.produs_id));
        setProduseAlocate(ids);
    };

    // --- 3. TOGGLE ALOCARE (ADĂUGARE / ȘTERGERE) ---
    const toggleAlocare = async (produsId: number) => {
        if (!selectedAgentId) return;

        const isAlocated = produseAlocate.has(produsId);
        const newSet = new Set(produseAlocate);

        try {
            if (isAlocated) {
                // ȘTERGEM ALOCAREA
                const { error } = await supabase
                    .from('agent_produse')
                    .delete()
                    .eq('agent_id', selectedAgentId)
                    .eq('produs_id', produsId);

                if (error) throw error;
                newSet.delete(produsId);
                toast('Produs retras de la agent', { icon: '❌', style: { borderRadius: '10px', background: '#333', color: '#fff' } });

            } else {
                // ADĂUGĂM ALOCAREA
                const { error } = await supabase
                    .from('agent_produse')
                    .insert({ agent_id: selectedAgentId, produs_id: produsId });

                if (error) throw error;
                newSet.add(produsId);
                toast.success('Produs alocat cu succes!');
            }

            // Actualizăm starea locală instant
            setProduseAlocate(newSet);

        } catch (error: any) {
            toast.error('Eroare: ' + error.message);
        }
    };

    // Filtrare produse
    const produseFiltrate = produse.filter(p =>
        p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cod_bare && p.cod_bare.includes(searchTerm))
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Se încarcă datele...</div>;

    return (
        <div className="p-8 h-[calc(100vh-80px)] flex flex-col">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Briefcase size={24} /></span>
                    Alocare Produse pe Agent
                </h1>
                <p className="text-gray-500 mt-1 ml-12">Selectează un agent din stânga și bifează produsele pe care are voie să le vândă.</p>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">

                {/* --- COLOANA STÂNGA: LISTA AGENȚI --- */}
                <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            <User size={18} /> Lista Agenți ({agenti.length})
                        </h3>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {agenti.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => handleSelectAgent(agent.id)}
                                className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group ${
                                    selectedAgentId === agent.id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'hover:bg-gray-50 text-gray-700 border border-transparent hover:border-gray-200'
                                }`}
                            >
                                <div>
                                    <p className="font-bold">{agent.nume}</p>
                                    <p className={`text-xs ${selectedAgentId === agent.id ? 'text-indigo-200' : 'text-gray-400'}`}>{agent.email}</p>
                                </div>
                                {selectedAgentId === agent.id && <CheckCircle size={18} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- COLOANA DREAPTA: LISTA PRODUSE --- */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    {/* Toolbar Produse */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2 whitespace-nowrap">
                            <Package size={18} /> Produse Disponibile
                        </h3>

                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Caută produs..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Grid Produse */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                        {selectedAgentId ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {produseFiltrate.map(produs => {
                                    const isAlocated = produseAlocate.has(produs.id);
                                    return (
                                        <div
                                            key={produs.id}
                                            onClick={() => toggleAlocare(produs.id)}
                                            className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 select-none ${
                                                isAlocated
                                                    ? 'bg-green-50 border-green-200 shadow-sm'
                                                    : 'bg-white border-gray-100 hover:border-gray-300 opacity-70 hover:opacity-100'
                                            }`}
                                        >
                                            <div className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                                isAlocated ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'
                                            }`}>
                                                {isAlocated && <CheckCircle size={14} />}
                                            </div>

                                            <div className="flex-1">
                                                <p className={`font-semibold text-sm ${isAlocated ? 'text-green-800' : 'text-gray-700'}`}>
                                                    {produs.nume}
                                                </p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-xs text-gray-500 font-mono">{produs.cod_bare || '-'}</span>
                                                    <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-gray-100 text-gray-600">
                                                        Stoc: {produs.stoc_depozit}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <User size={48} className="mb-4 text-gray-300" />
                                <p>Selectează un agent din stânga pentru a începe.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}