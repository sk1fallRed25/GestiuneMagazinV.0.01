import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Send, Truck, User, Calendar, FileText, Package } from 'lucide-react';
import toast from 'react-hot-toast';

// --- DEFINIȚII INTERFEȚE STRUCTURALE ---
interface Furnizor {
    id: number;
    nume: string;
    cui?: string;
}

interface Produs {
    id: number;
    nume: string;
    stoc_depozit: number;
    cod_bare?: string;
}

export default function ComandaFurnizor() {
    const [loading, setLoading] = useState(false);
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [produse, setProduse] = useState<Produs[]>([]);

    // Stări Parametri Interfață
    const [selectedFurnizor, setSelectedFurnizor] = useState('');
    const [selectedProdus, setSelectedProdus] = useState('');
    const [cantitate, setCantitate] = useState('');
    const [dataLivrare, setDataLivrare] = useState('');
    const [observatii, setObservatii] = useState('');

    useEffect(() => {
        const fetchNomenclatoare = async () => {
            try {
                const { data: dataF, error: errF } = await supabase
                    .from('furnizori')
                    .select('*')
                    .order('nume');

                if (errF) throw errF;
                if (dataF) setFurnizori(dataF);

                const { data: dataP, error: errP } = await supabase
                    .from('produse')
                    .select('id, nume, stoc_depozit, cod_bare')
                    .order('nume');

                if (errP) throw errP;
                if (dataP) setProduse(dataP);

            } catch (error: any) {
                toast.error("Eroare la sincronizarea nomenclatoarelor: " + error.message);
            }
        };
        fetchNomenclatoare();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFurnizor || !selectedProdus || !cantitate) {
            return toast.error("Parametrii obligatorii (Furnizor, Produs, Cantitate) necesită validare.");
        }

        const numCantitate = parseInt(cantitate);
        if (isNaN(numCantitate) || numCantitate <= 0) {
            return toast.error("Valoarea volumului cantitativ este invalidă.");
        }

        const idFurnizor = parseInt(selectedFurnizor);
        const idProdus = parseInt(selectedProdus);

        setLoading(true);

        const executaFluxAlocare = async () => {
            // 1. Identificare agenți asociați furnizorului curent
            const { data: agentiFurnizor, error: errA } = await supabase
                .from('agenti')
                .select('id')
                .eq('furnizor_id', idFurnizor);

            if (errA) throw errA;
            const agentIds = agentiFurnizor?.map(a => a.id) || [];

            let agentAlocatId: number | null = null;

            // 2. Evaluare mapare produs-agent
            if (agentIds.length > 0) {
                const { data: mapareAgent, error: errMapare } = await supabase
                    .from('agent_produse')
                    .select('agent_id')
                    .eq('produs_id', idProdus)
                    .in('agent_id', agentIds)
                    .maybeSingle();

                if (errMapare) throw errMapare;
                if (mapareAgent) agentAlocatId = mapareAgent.agent_id;
            }

            // 3. Ramificare operațională
            if (agentAlocatId) {
                // FLUX A: Agent identificat -> Trimitere comandă alocată
                const { data: comandaAntet, error: errAntet } = await supabase
                    .from('comenzi_catre_furnizor')
                    .insert([{
                        furnizor_id: idFurnizor,
                        agent_id: agentAlocatId, // Inserare cheie externă agent
                        status: 'pending',
                        total_valoare: 0
                    }])
                    .select()
                    .single();

                if (errAntet) throw errAntet;

                const { error: errDetaliu } = await supabase
                    .from('comenzi_aprovizionare_detalii')
                    .insert([{
                        comanda_id: comandaAntet.id,
                        produs_id: idProdus,
                        cantitate: numCantitate,
                        pret_unitar: 0
                    }]);

                if (errDetaliu) throw errDetaliu;
                return { tip: 'comandă_agent' };

            } else {
                // FLUX B: Agent neidentificat -> Transfer în Lista de Cumpărături
                const { error: errLista } = await supabase
                    .from('lista_cumparaturi')
                    .insert([{
                        produs_id: idProdus,
                        furnizor_id: idFurnizor,
                        cantitate: numCantitate,
                        stare: 'in_asteptare'
                    }]);

                if (errLista) throw errLista;
                return { tip: 'listă_cumpărături' };
            }
        };

        toast.promise(executaFluxAlocare(), {
            loading: 'Evaluare reguli de rutare...',
            success: (rezultat) => rezultat.tip === 'comandă_agent'
                ? 'Operațiune validată: Comanda a fost alocată agentului.'
                : 'Operațiune deviată: Articol transferat în Lista de Cumpărături.',
            error: (err) => `Eroare tranzacțională: ${err.message}`
        }).then(() => {
            // Resetare variabile de stare post-execuție
            setCantitate('');
            setObservatii('');
            setSelectedProdus('');
        }).finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8 border-b border-gray-200 pb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200">
                        <Truck size={32} />
                    </div>
                    Procedură Aprovizionare
                </h1>
                <p className="text-gray-500 mt-2 text-lg">Mecanism automatizat pentru alocarea și rutarea necesarului de stoc.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <User size={18} className="text-blue-600" />
                                Entitate Furnizor
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700 appearance-none"
                                    value={selectedFurnizor}
                                    onChange={e => setSelectedFurnizor(e.target.value)}
                                    required
                                >
                                    <option value="">-- Selectare Obligatorie --</option>
                                    {furnizori.map(f => (
                                        <option key={f.id} value={f.id}>{f.nume} {f.cui ? `(CUI: ${f.cui})` : ''}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-600" />
                                Parametru Timp (Opțional)
                            </label>
                            <input
                                type="date"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
                                value={dataLivrare}
                                onChange={e => setDataLivrare(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Package size={18} className="text-blue-600" />
                                Index Nomenclator
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700 appearance-none"
                                    value={selectedProdus}
                                    onChange={e => setSelectedProdus(e.target.value)}
                                    required
                                >
                                    <option value="">-- Selectare Obligatorie --</option>
                                    {produse.map(p => (
                                        <option key={p.id} value={p.id}>{p.nume} {p.stoc_depozit !== undefined ? `(Stoc curent: ${p.stoc_depozit})` : ''}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 mb-2">Volum Cantitativ</label>
                            <input
                                type="number" min="1" placeholder="Index numeric"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-gray-800"
                                value={cantitate} onChange={e => setCantitate(e.target.value)} required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" />
                            Specificații Suplimentare (Opțional)
                        </label>
                        <textarea
                            rows={3} placeholder="Informații auxiliare..."
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-gray-700"
                            value={observatii} onChange={e => setObservatii(e.target.value)}
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit" disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
                        >
                            {loading ? 'Execuție rutine de validare...' : <><Send size={24} /> Validare Tranzacție</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}