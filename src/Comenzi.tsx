import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import {
    ShoppingCart, Plus, Trash2, Search,
    User, Send, Calculator, Inbox, CheckCircle, XCircle, ChevronDown, ChevronUp, PackageOpen
} from 'lucide-react';

// --- DEFINIȚII INTERFEȚE ---
interface Furnizor { id: number; nume: string; cui: string }
interface Produs { id: number; nume: string; cod_bare: string; pret_vanzare: number }
interface LinieComanda { id: number; produs: Produs; cantitate: number; pret_unitar: number; }

interface DetaliuOferta {
    cantitate: number;
    pret_unitar: number;
    cota_tva: number;
    produs: { nume: string; unitate_masura: string } | null;
}

interface OfertaAgent {
    id: number;
    created_at: string;
    total_valoare: number;
    status: string;
    agent: { nume: string } | null;
    furnizor: { nume: string } | null;
}

export default function Comenzi() {
    const [activeTab, setActiveTab] = useState<'creare' | 'oferte'>('creare');
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [produse, setProduse] = useState<Produs[]>([]);
    const [selFurnizorId, setSelFurnizorId] = useState<string>('');
    const [liniiComanda, setLiniiComanda] = useState<LinieComanda[]>([]);
    const [searchProdus, setSearchProdus] = useState('');
    const [produsSelectat, setProdusSelectat] = useState<Produs | null>(null);
    const [cantitateInput, setCantitateInput] = useState<number>(1);
    const [pretInput, setPretInput] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const [oferteAgenti, setOferteAgenti] = useState<OfertaAgent[]>([]);
    const [loadingOferte, setLoadingOferte] = useState(false);

    const [expandedOfertaId, setExpandedOfertaId] = useState<number | null>(null);
    const [detaliiOferte, setDetaliiOferte] = useState<Record<number, DetaliuOferta[]>>({});
    const [loadingDetalii, setLoadingDetalii] = useState(false);

    // --- LOGICĂ FILTRARE PRODUSE (Rezolvă TS2304) ---
    const produseFiltrate = useMemo(() => {
        if (!searchProdus) return [];
        return produse.filter(p =>
            p.nume.toLowerCase().includes(searchProdus.toLowerCase()) ||
            p.cod_bare?.includes(searchProdus)
        );
    }, [searchProdus, produse]);

    useEffect(() => {
        const fetchDateBase = async () => {
            const { data: f } = await supabase.from('furnizori').select('id, nume, cui').order('nume');
            const { data: p } = await supabase.from('produse').select('id, nume, cod_bare, pret_vanzare').order('nume');
            if (f) setFurnizori(f);
            if (p) setProduse(p);
        };
        fetchDateBase();
    }, []);

    const fetchOferteAgenti = async () => {
        setLoadingOferte(true);
        try {
            const { data, error } = await supabase
                .from('comenzi_agenti')
                .select('id, created_at, total_valoare, status, agent:agenti(nume), furnizor:furnizori(nume)')
                .eq('status', 'pending_admin')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // --- DECLARARE MAPPEDDATA (Rezolvă TS2304) ---
            const mappedData: OfertaAgent[] = (data || []).map((item: any) => ({
                ...item,
                agent: Array.isArray(item.agent) ? item.agent[0] : item.agent,
                furnizor: Array.isArray(item.furnizor) ? item.furnizor[0] : item.furnizor
            }));

            setOferteAgenti(mappedData);
        } catch (error: any) {
            toast.error("Eroare de sistem: " + error.message);
        } finally {
            setLoadingOferte(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'oferte') fetchOferteAgenti();
    }, [activeTab]);

    const extrageDetaliiOferta = async (ofertaId: number) => {
        if (detaliiOferte[ofertaId]) return;

        setLoadingDetalii(true);
        try {
            const { data, error } = await supabase
                .from('comenzi_agenti_detalii')
                .select(`
                    cantitate,
                    pret_unitar,
                    cota_tva,
                    produs:produse(nume, unitate_masura)
                `)
                .eq('comanda_id', ofertaId);

            if (error) throw error;

            // --- DECLARARE MAPPEDDETAILS (Rezolvă TS2304) ---
            const mappedDetails: DetaliuOferta[] = (data || []).map((d: any) => ({
                ...d,
                produs: Array.isArray(d.produs) ? d.produs[0] : d.produs
            }));

            setDetaliiOferte(prev => ({ ...prev, [ofertaId]: mappedDetails }));
        } catch (error: any) {
            toast.error("Integritate structurală compromisă: " + error.message);
        } finally {
            setLoadingDetalii(false);
        }
    };

    const handleExpandToggle = (ofertaId: number) => {
        if (expandedOfertaId === ofertaId) setExpandedOfertaId(null);
        else { setExpandedOfertaId(ofertaId); extrageDetaliiOferta(ofertaId); }
    };

    const adaugaLinie = () => {
        if (!produsSelectat || cantitateInput <= 0) return toast.error("Parametri invalidi.");
        const linieNoua: LinieComanda = { id: Date.now(), produs: produsSelectat, cantitate: cantitateInput, pret_unitar: pretInput };
        setLiniiComanda([...liniiComanda, linieNoua]);
        setProdusSelectat(null); setSearchProdus(''); setPretInput(0); setCantitateInput(1);
    };

    const stergeLinie = (id: number) => setLiniiComanda(liniiComanda.filter(l => l.id !== id));
    const totalComanda = liniiComanda.reduce((acc, l) => acc + (l.cantitate * l.pret_unitar), 0);

    const salveazaComanda = async () => {
        if (!selFurnizorId) return toast.error("Entitate furnizoare neselectată.");
        if (liniiComanda.length === 0) return toast.error("Matrice nulă.");

        setLoading(true);
        try {
            const { data: comanda, error: errC } = await supabase
                .from('comenzi_catre_furnizor')
                .insert([{ furnizor_id: parseInt(selFurnizorId), total_valoare: totalComanda, status: 'pending' }])
                .select().single();
            if (errC) throw errC;

            const detalii = liniiComanda.map(l => ({
                comanda_id: comanda.id, produs_id: l.produs.id, cantitate: l.cantitate, pret_unitar: l.pret_unitar
            }));
            const { error: errD } = await supabase.from('comenzi_aprovizionare_detalii').insert(detalii);
            if (errD) throw errD;

            toast.success("Procedură finalizată.");
            setLiniiComanda([]); setSelFurnizorId('');
        } catch (err: any) {
            toast.error("Eroare de emisie: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleActualizareStatusOferta = async (ofertaId: number, noulStatus: 'approved' | 'rejected') => {
        const promise = (async () => {
            const { error } = await supabase.from('comenzi_agenti').update({ status: noulStatus }).eq('id', ofertaId);
            if (error) throw error;
            fetchOferteAgenti();
        })();
        toast.promise(promise, {
            loading: 'Procesare...',
            success: noulStatus === 'approved' ? 'Validată.' : 'Respinsă.',
            error: (err) => `Eroare: ${err.message}`
        });
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto bg-gray-50/30 min-h-screen pb-20">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <span className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-100">
                            {activeTab === 'creare' ? <ShoppingCart size={28} /> : <Inbox size={28} />}
                        </span>
                        Gestiune Comenzi
                    </h1>
                    <p className="text-slate-500 font-bold mt-2 ml-1">Centralizare operațiuni și analiză oferte terți.</p>
                </div>
                <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5">
                    <button onClick={() => setActiveTab('creare')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'creare' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Emitere</button>
                    <button onClick={() => setActiveTab('oferte')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'oferte' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                        Oferte {oferteAgenti.length > 0 && <span className="w-2 h-2 rounded-full bg-red-400"></span>}
                    </button>
                </div>
            </div>

            {activeTab === 'creare' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-500">
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-100 border border-slate-100">
                            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 flex items-center gap-2"><User className="text-blue-500" size={18} /> Entitate Furnizoare</h3>
                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700" value={selFurnizorId} onChange={(e) => setSelFurnizorId(e.target.value)}>
                                <option value="">-- SELECTARE INDEX --</option>
                                {furnizori.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                            </select>
                        </div>
                        <div className="bg-slate-900 text-white p-10 rounded-[32px] shadow-2xl relative overflow-hidden group">
                            <Calculator className="absolute right-[-20px] top-[-20px] text-white/5 group-hover:rotate-12 transition-transform duration-700" size={180} />
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Previzionat</p>
                            <h2 className="text-5xl font-black mb-10">{totalComanda.toFixed(2)} <span className="text-xs opacity-40 font-bold tracking-normal">RON</span></h2>
                            <button onClick={salveazaComanda} disabled={loading || liniiComanda.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-20 shadow-xl shadow-blue-500/20">
                                {loading ? "Procesare..." : <><Send size={18} /> Finalizează</>}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-100 border border-slate-100">
                            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">Configurare Nomenclator</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input type="text" placeholder="Caută reper..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={searchProdus} onChange={(e) => setSearchProdus(e.target.value)} />
                                    {searchProdus && produseFiltrate.length > 0 && (
                                        <div className="absolute z-50 w-full bg-white border border-slate-100 shadow-2xl rounded-2xl mt-3 overflow-hidden">
                                            {produseFiltrate.map((p: any) => (
                                                <div key={p.id} className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0" onClick={() => { setProdusSelectat(p); setSearchProdus(p.nume); }}>
                                                    <p className="font-black text-xs text-slate-800 uppercase tracking-tight">{p.nume}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{p.cod_bare}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <input type="number" placeholder="RON Net" className="w-1/2 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-700" value={pretInput || ''} onChange={(e) => setPretInput(parseFloat(e.target.value))} />
                                    <input type="number" placeholder="Buc" className="w-1/4 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-black" value={cantitateInput} onChange={(e) => setCantitateInput(parseInt(e.target.value))} />
                                    <button onClick={adaugaLinie} className="w-1/4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg"><Plus size={28} /></button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b">
                                <tr>
                                    <th className="px-8 py-5">Articol</th>
                                    <th className="px-8 py-5 text-center">Volum</th>
                                    <th className="px-8 py-5 text-right">Net</th>
                                    <th className="px-8 py-5 text-right">Subtotal</th>
                                    <th className="px-8 py-5 text-center"></th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                {liniiComanda.length === 0 ? (
                                    <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-bold italic uppercase text-xs tracking-widest">Registru gol.</td></tr>
                                ) : (
                                    liniiComanda.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-8 py-5"><p className="font-black text-xs text-slate-800 uppercase tracking-tight">{l.produs.nume}</p></td>
                                            <td className="px-8 py-5 text-center font-black text-blue-600 text-xs">{l.cantitate}</td>
                                            <td className="px-8 py-5 text-right font-bold text-slate-500 text-xs">{l.pret_unitar.toFixed(2)}</td>
                                            <td className="px-8 py-5 text-right font-black text-slate-900 text-xs">{(l.cantitate * l.pret_unitar).toFixed(2)}</td>
                                            <td className="px-8 py-5 text-center"><button onClick={() => stergeLinie(l.id)} className="text-slate-200 hover:text-red-500 transition-all"><Trash2 size={18} /></button></td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'oferte' && (
                <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden animate-in fade-in duration-500">
                    <div className="p-8 border-b bg-slate-50/50">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Audit Propuneri Comerciale</h2>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Validare analitică a fluxurilor de la parteneri.</p>
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b">
                        <tr>
                            <th className="px-8 py-5 w-12 text-center"></th>
                            <th className="px-8 py-5">Timestamp</th>
                            <th className="px-8 py-5">Agent</th>
                            <th className="px-8 py-5">Furnizor</th>
                            <th className="px-8 py-5 text-right">Total Brut (RON)</th>
                            <th className="px-8 py-5 text-center">Validare</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {loadingOferte ? (
                            <tr><td colSpan={6} className="px-8 py-20 text-center animate-pulse"><Loader2 className="animate-spin inline mr-3"/>Sincronizare...</td></tr>
                        ) : oferteAgenti.length === 0 ? (
                            <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-black uppercase text-xs">Nicio propunere activă.</td></tr>
                        ) : (
                            oferteAgenti.map(oferta => (
                                <React.Fragment key={oferta.id}>
                                    <tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedOfertaId === oferta.id ? 'bg-slate-50' : ''}`} onClick={() => handleExpandToggle(oferta.id)}>
                                        <td className="px-8 py-5 text-center text-slate-300">{expandedOfertaId === oferta.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</td>
                                        <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(oferta.created_at).toLocaleString('ro-RO')}</td>
                                        <td className="px-8 py-5 font-black text-xs text-slate-800 uppercase tracking-tight">{oferta.agent?.nume}</td>
                                        <td className="px-8 py-5"><span className="py-1 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">{oferta.furnizor?.nume}</span></td>
                                        <td className="px-8 py-5 text-right font-black text-indigo-600 text-lg">{oferta.total_valoare?.toFixed(2)}</td>
                                        <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => handleActualizareStatusOferta(oferta.id, 'approved')} className="bg-green-100 text-green-700 p-2.5 rounded-xl hover:bg-green-200 transition-all shadow-sm shadow-green-100"><CheckCircle size={18} /></button>
                                                <button onClick={() => handleActualizareStatusOferta(oferta.id, 'rejected')} className="bg-red-100 text-red-700 p-2.5 rounded-xl hover:bg-red-200 transition-all shadow-sm shadow-red-100"><XCircle size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>

                                    {expandedOfertaId === oferta.id && (
                                        <tr>
                                            <td colSpan={6} className="bg-slate-50 p-0 border-b">
                                                <div className="px-12 py-10 animate-in slide-in-from-top-4 duration-300">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                                        <PackageOpen size={16} /> Matrice Detaliată Articole
                                                    </h4>
                                                    <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
                                                        <table className="w-full text-xs text-left">
                                                            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b">
                                                            <tr>
                                                                <th className="py-4 px-6">Specificație</th>
                                                                <th className="py-4 px-6 text-center">Volum</th>
                                                                <th className="py-4 px-6 text-right">Net</th>
                                                                <th className="py-4 px-6 text-center">TVA</th>
                                                                <th className="py-4 px-6 text-right">Subtotal Brut</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                            {detaliiOferte[oferta.id]?.map((detaliu, index) => {
                                                                const cota = detaliu.cota_tva || 21;
                                                                const pretCuTva = detaliu.pret_unitar * (1 + (cota / 100));
                                                                return (
                                                                    <tr key={index} className="hover:bg-slate-50/50">
                                                                        <td className="py-4 px-6 font-bold text-slate-700 uppercase">{detaliu.produs?.nume}</td>
                                                                        <td className="py-4 px-6 text-center font-black text-indigo-600">{detaliu.cantitate}</td>
                                                                        <td className="py-4 px-6 text-right font-bold text-slate-400">{detaliu.pret_unitar.toFixed(2)}</td>
                                                                        <td className="py-4 px-6 text-center"><span className="px-2 py-0.5 bg-slate-100 rounded-lg font-black text-[9px]">{cota}%</span></td>
                                                                        <td className="py-4 px-6 text-right font-black text-slate-900">{(pretCuTva * detaliu.cantitate).toFixed(2)}</td>
                                                                    </tr>
                                                                )})}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Indicator util pentru loading
const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
    <svg className={`animate-spin ${className}`} width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);