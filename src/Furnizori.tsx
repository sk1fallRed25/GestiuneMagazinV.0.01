import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { ChevronDown, PlusCircle, Trash2, Building2, MapPin, Hash, User, Mail, Shield, X, Save } from 'lucide-react';

interface Agent {
    id: number;
    nume: string;
    email: string;
}

interface Furnizor {
    id: number;
    nume: string;
    cui: string;
    adresa: string;
    agenti: Agent[];
}

const initialFurnizorData = { nume: '', cui: '', adresa: '' };
const initialAgentData = { nume: '', email: '', parola: '', furnizor_id: 0 };

export default function Furnizori() {
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedFurnizor, setExpandedFurnizor] = useState<number | null>(null);

    // Modals
    const [isFurnizorModalOpen, setIsFurnizorModalOpen] = useState(false);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

    // Forms
    const [furnizorFormData, setFurnizorFormData] = useState(initialFurnizorData);
    const [agentFormData, setAgentFormData] = useState(initialAgentData);

    const fetchFurnizori = async () => {
        setLoading(true);
        try {
            // Utilizăm alias-ul și semnul '!' pentru a specifica relația exactă
            const { data, error } = await supabase
                .from('furnizori')
                .select(`
                    *,
                    agenti:agenti!relatie_definitiva_agent_furnizor (*)
                `)
                .order('nume');

            if (error) throw error;
            setFurnizori(data || []);
        } catch (error: any) {
            console.error("Detaliu eroare:", error);
            toast.error("Eroare la încărcare: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFurnizori();
    }, []);

    // --- SALVARE FURNIZOR ---
    const handleSaveFurnizor = async (e: React.FormEvent) => {
        e.preventDefault();
        const promise = (async () => {
            const { error } = await supabase.from('furnizori').insert([furnizorFormData]);
            if (error) throw error;
            setIsFurnizorModalOpen(false);
            fetchFurnizori();
        })();

        // FIX: Cast la Promise<any>
        toast.promise(promise as unknown as Promise<any>, {
            loading: 'Se salvează furnizorul...',
            success: 'Furnizor adăugat cu succes!',
            error: (err) => `Eroare: ${err.message}`
        });
    };

    // --- SALVARE AGENT ---
    const handleSaveAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        const promise = (async () => {
            const { error } = await supabase.from('agenti').insert([agentFormData]);
            if (error) throw error;
            setIsAgentModalOpen(false);
            fetchFurnizori();
        })();

        // FIX: Cast la Promise<any>
        toast.promise(promise as unknown as Promise<any>, {
            loading: 'Se creează contul agentului...',
            success: 'Agent adăugat cu succes!',
            error: (err) => `Eroare: ${err.message}`
        });
    };

    // --- DELETE HANDLERS ---
    const handleDeleteFurnizor = (furnizorId: number) => {
        toast((t) => (
            <div className="flex flex-col gap-2">
                <p className="font-bold text-gray-800">Ștergi acest furnizor?</p>
                <p className="text-xs text-red-600">Se vor șterge și agenții asociați!</p>
                <div className="flex gap-2 mt-2">
                    <button
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        onClick={async () => {
                            toast.dismiss(t.id);
                            const { error } = await supabase.from('furnizori').delete().eq('id', furnizorId);
                            if (error) toast.error(error.message);
                            else {
                                toast.success("Furnizor șters.");
                                fetchFurnizori();
                            }
                        }}
                    >
                        Confirmă
                    </button>
                    <button
                        className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300"
                        onClick={() => toast.dismiss(t.id)}
                    >
                        Anulează
                    </button>
                </div>
            </div>
        ), { duration: 5000 });
    };

    const handleDeleteAgent = (agentId: number) => {
        if(!confirm("Sigur dorești să ștergi acest agent?")) return;
        const promise = supabase.from('agenti').delete().eq('id', agentId);

        // FIX: Cast la Promise<any>
        toast.promise(promise as unknown as  Promise<any>, {
            loading: 'Se șterge...',
            success: () => { fetchFurnizori(); return 'Agent șters.'; },
            error: 'Eroare la ștergere.'
        });
    };

    if (loading) return <div className="p-8 text-center text-gray-500 italic">Se analizează baza de date parteneri...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-blue-100 p-2 rounded-xl text-blue-600"><Building2 size={28} /></span>
                        Management Furnizori
                    </h1>
                    <p className="text-gray-500 mt-1 ml-1">Gestionează firmele partenere și agenții lor.</p>
                </div>
                <button
                    onClick={() => { setFurnizorFormData(initialFurnizorData); setIsFurnizorModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 font-bold"
                >
                    <PlusCircle size={20} /> Furnizor Nou
                </button>
            </div>

            {/* Lista Furnizori */}
            <div className="grid gap-4">
                {furnizori.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-medium">
                        Nu există furnizori înregistrați. Apăsați pe „Furnizor Nou” pentru a începe.
                    </div>
                ) : furnizori.map(f => (
                    <div key={f.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Card Header */}
                        <div
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedFurnizor(expandedFurnizor === f.id ? null : f.id)}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600 hidden sm:block">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{f.nume}</h3>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center gap-1"><Hash size={14} /> {f.cui}</span>
                                        <span className="flex items-center gap-1"><MapPin size={14} /> {f.adresa || 'Fără adresă'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    <User size={14} /> {f.agenti?.length || 0} Agenți
                                </div>
                                <ChevronDown className={`text-gray-400 transition-transform duration-300 ${expandedFurnizor === f.id ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {/* Card Body */}
                        {expandedFurnizor === f.id && (
                            <div className="bg-gray-50 border-t border-gray-100 p-5 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider font-mono">Agenți Asociați</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setAgentFormData({...initialAgentData, furnizor_id: f.id}); setIsAgentModalOpen(true); }}
                                            className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <PlusCircle size={14} /> Adaugă Agent
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFurnizor(f.id); }}
                                            className="text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 size={14} /> Șterge Furnizor
                                        </button>
                                    </div>
                                </div>
                                {f.agenti && f.agenti.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {f.agenti.map(a => (
                                            <div key={a.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                                        {a.nume.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-sm">{a.nume}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} /> {a.email}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteAgent(a.id)} className="text-gray-400 hover:text-red-500 p-1 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-400 text-sm italic bg-white rounded-lg border border-dashed border-gray-200">
                                        Nu există agenți înregistrați pentru acest furnizor.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* --- MODAL FURNIZOR (Identic) --- */}
            {isFurnizorModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Adaugă Furnizor</h2>
                            <button onClick={() => setIsFurnizorModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleSaveFurnizor} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nume Firmă</label>
                                <input required autoFocus className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={furnizorFormData.nume} onChange={e => setFurnizorFormData({...furnizorFormData, nume: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CUI / CIF</label>
                                <input required className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={furnizorFormData.cui} onChange={e => setFurnizorFormData({...furnizorFormData, cui: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adresă Sediu</label>
                                <input className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={furnizorFormData.adresa} onChange={e => setFurnizorFormData({...furnizorFormData, adresa: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4 hover:bg-blue-700 transition flex justify-center gap-2 shadow-lg shadow-blue-100">
                                <Save size={18} /> Salvează Furnizor
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL AGENT (Identic) --- */}
            {isAgentModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Cont Nou Agent</h2>
                            <button onClick={() => setIsAgentModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleSaveAgent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nume Complet</label>
                                <input required autoFocus className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={agentFormData.nume} onChange={e => setAgentFormData({...agentFormData, nume: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Login)</label>
                                <input type="email" required className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={agentFormData.email} onChange={e => setAgentFormData({...agentFormData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Shield size={12}/> Parolă Acces</label>
                                <input type="password" required className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={agentFormData.parola} onChange={e => setAgentFormData({...agentFormData, parola: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl mt-4 hover:bg-green-700 transition flex justify-center gap-2 shadow-lg shadow-green-100">
                                <Save size={18} /> Creează Cont Agent
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}