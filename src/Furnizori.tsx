import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { ChevronDown, PlusCircle, Trash2, Building2, MapPin, Hash, User, Mail, Shield, X, Save } from 'lucide-react';


interface Furnizor {
    id: number;
    nume: string;
    cui: string;
    adresa: string;
}

const initialFurnizorData = { nume: '', cui: '', adresa: '' };

export default function Furnizori() {
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedFurnizor, setExpandedFurnizor] = useState<number | null>(null);

    // Modals
    const [isFurnizorModalOpen, setIsFurnizorModalOpen] = useState(false);

    // Forms
    const [furnizorFormData, setFurnizorFormData] = useState(initialFurnizorData);

    const fetchFurnizori = async () => {
        setLoading(true);
        try {
            // Utilizăm alias-ul și semnul '!' pentru a specifica relația exactă
            const { data, error } = await supabase
                .from('furnizori')
                .select(`*`)
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
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteFurnizor(f.id); }}
                                    className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                                    title="Șterge Furnizor"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <ChevronDown className={`text-gray-400 transition-transform duration-300 ${expandedFurnizor === f.id ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {expandedFurnizor === f.id && (
                            <div className="bg-gray-50 border-t border-gray-100 p-5 animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Informații Fiscale</p>
                                        <p className="text-sm font-bold text-gray-700">CUI: {f.cui}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Adresă Sediu</p>
                                        <p className="text-sm font-bold text-gray-700">{f.adresa || 'Nespecificată'}</p>
                                    </div>
                                </div>
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

        </div>
    );
}