import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { ChevronDown, PlusCircle, Trash2 } from 'lucide-react';

interface Agent {
    id: number;
    nume: string;
    email: string;
}

interface Furnizor {
    id: number;
    nume_firma: string;
    cui: string;
    adresa: string;
    agenti: Agent[];
}

const initialFurnizorData = { nume_firma: '', cui: '', adresa: '' };
const initialAgentData = { nume: '', email: '', parola: '', furnizor_id: 0 };

export default function Furnizori() {
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedFurnizor, setExpandedFurnizor] = useState<number | null>(null);

    const [isFurnizorModalOpen, setIsFurnizorModalOpen] = useState(false);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

    const [furnizorFormData, setFurnizorFormData] = useState(initialFurnizorData);
    const [agentFormData, setAgentFormData] = useState(initialAgentData);

    const fetchFurnizori = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('furnizori')
            .select('*, agenti(*)')
            .order('nume_firma');

        if (error) toast.error(error.message);
        else setFurnizori(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchFurnizori();
    }, []);

    const handleSaveFurnizor = async (e: React.FormEvent) => {
        e.preventDefault();
        const promise = supabase.from('furnizori').insert(furnizorFormData).then();
        // @ts-ignore
        toast.promise(promise, {
            loading: 'Se adaugă furnizorul...',
            success: () => { setIsFurnizorModalOpen(false); fetchFurnizori(); return 'Furnizor adăugat!'; },
            error: (err) => `Eroare: ${err.message}`
        });
    };

    const handleSaveAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        const promise = supabase.from('agenti').insert(agentFormData).then();
        // @ts-ignore
        toast.promise(promise, {
            loading: 'Se adaugă agentul...',
            success: () => { setIsAgentModalOpen(false); fetchFurnizori(); return 'Agent adăugat!'; },
            error: (err) => `Eroare: ${err.message}`
        });
    };

    const handleDeleteFurnizor = (furnizorId: number) => {
        toast((t) => (
            <div className="p-2">
                <p className="mb-2 font-bold">Sigur ștergi acest furnizor?</p>
                <p className="text-sm text-red-600 mb-3">Atenție: Toți agenții și produsele asociate vor fi deconectați.</p>
                <div className="flex gap-2">
                    <button className="w-full bg-red-600 text-white px-3 py-1 rounded-md text-sm" onClick={() => {
                        const promise = supabase.from('furnizori').delete().eq('id', furnizorId).then();
                        // @ts-ignore
                        toast.promise(promise, {
                            loading: 'Se șterge furnizorul...',
                            success: () => { fetchFurnizori(); return 'Furnizor șters!'; },
                            error: (err) => `Eroare: ${err.message}. Asigură-te că nu are comenzi sau recepții asociate.`
                        });
                        toast.dismiss(t.id);
                    }}>Da, șterge</button>
                    <button className="w-full bg-gray-200 px-3 py-1 rounded-md text-sm" onClick={() => toast.dismiss(t.id)}>Anulează</button>
                </div>
            </div>
        ));
    };

    const handleDeleteAgent = (agentId: number) => {
        toast((t) => (
            <div className="p-2">
                <p className="mb-2">Sigur ștergi acest agent?</p>
                <div className="flex gap-2">
                    <button className="w-full bg-red-600 text-white px-3 py-1 rounded-md text-sm" onClick={() => {
                        const promise = supabase.from('agenti').delete().eq('id', agentId).then();
                        // @ts-ignore
                        toast.promise(promise, {
                            loading: 'Se șterge...',
                            success: () => { fetchFurnizori(); return 'Agent șters!'; },
                            error: (err) => `Eroare: ${err.message}`
                        });
                        toast.dismiss(t.id);
                    }}>Da, șterge</button>
                    <button className="w-full bg-gray-200 px-3 py-1 rounded-md text-sm" onClick={() => toast.dismiss(t.id)}>Anulează</button>
                </div>
            </div>
        ));
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Management Furnizori & Agenți</h1>
                    <button onClick={() => { setFurnizorFormData(initialFurnizorData); setIsFurnizorModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm font-medium">+ Furnizor Nou</button>
                </div>

                <div className="space-y-4">
                    {loading ? <p>Se încarcă...</p> : furnizori.map(f => (
                        <div key={f.id} className="bg-white rounded-xl shadow-sm border">
                            <div className="p-4 flex justify-between items-center">
                                <button onClick={() => setExpandedFurnizor(expandedFurnizor === f.id ? null : f.id)} className="flex-1 flex items-center gap-2 text-left">
                                    <span className="font-bold text-lg">{f.nume_firma}</span>
                                    <ChevronDown className={`transition-transform ${expandedFurnizor === f.id ? 'rotate-180' : ''}`} />
                                </button>
                                <button onClick={() => handleDeleteFurnizor(f.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                            </div>
                            {expandedFurnizor === f.id && (
                                <div className="p-4 border-t bg-gray-50">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-md">Agenți Asociați</h3>
                                        <button onClick={() => { setAgentFormData({...initialAgentData, furnizor_id: f.id}); setIsAgentModalOpen(true); }} className="flex items-center gap-2 text-sm bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600">
                                            <PlusCircle size={16} /> Adaugă Agent
                                        </button>
                                    </div>
                                    {f.agenti.length > 0 ? (
                                        <ul className="space-y-2">
                                            {f.agenti.map(a => (
                                                <li key={a.id} className="flex justify-between items-center p-2 bg-white rounded border">
                                                    <div><p className="font-medium">{a.nume}</p><p className="text-sm text-gray-500">{a.email}</p></div>
                                                    <button onClick={() => handleDeleteAgent(a.id)} className="text-red-500 p-1 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-sm text-gray-500 text-center py-4">Niciun agent adăugat.</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isFurnizorModalOpen && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">Furnizor Nou</h2>
                <form onSubmit={handleSaveFurnizor} className="space-y-4">
                    <input type="text" placeholder="Nume Firmă" required value={furnizorFormData.nume_firma} onChange={e => setFurnizorFormData({...furnizorFormData, nume_firma: e.target.value})} className="w-full border p-2 rounded"/>
                    <input type="text" placeholder="CUI" required value={furnizorFormData.cui} onChange={e => setFurnizorFormData({...furnizorFormData, cui: e.target.value})} className="w-full border p-2 rounded"/>
                    <input type="text" placeholder="Adresă" value={furnizorFormData.adresa} onChange={e => setFurnizorFormData({...furnizorFormData, adresa: e.target.value})} className="w-full border p-2 rounded"/>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setIsFurnizorModalOpen(false)} className="px-4 py-2 rounded">Anulează</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Salvează</button></div>
                </form>
            </div></div>}

            {isAgentModalOpen && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">Agent Nou</h2>
                <form onSubmit={handleSaveAgent} className="space-y-4">
                    <input type="text" placeholder="Nume Agent" required value={agentFormData.nume} onChange={e => setAgentFormData({...agentFormData, nume: e.target.value})} className="w-full border p-2 rounded"/>
                    <input type="email" placeholder="Email" required value={agentFormData.email} onChange={e => setAgentFormData({...agentFormData, email: e.target.value})} className="w-full border p-2 rounded"/>
                    <input type="password" placeholder="Parolă" required value={agentFormData.parola} onChange={e => setAgentFormData({...agentFormData, parola: e.target.value})} className="w-full border p-2 rounded"/>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setIsAgentModalOpen(false)} className="px-4 py-2 rounded">Anulează</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Salvează</button></div>
                </form>
            </div></div>}
        </div>
    );
}