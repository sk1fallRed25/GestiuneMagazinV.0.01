import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Building2, Package, Search, CheckCircle, RefreshCw, Filter, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Furnizor { id: number; nume: string; adresa: string; }
interface Produs { id: number; nume: string; cod_bare: string; stoc_depozit: number; }

export default function GestiuneProduseFurnizor() {
    const [loading, setLoading] = useState(true);
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [produse, setProduse] = useState<Produs[]>([]);
    const [selectedFurnizorId, setSelectedFurnizorId] = useState<number | null>(null);
    const [alocariDirecte, setAlocariDirecte] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const initLoad = async () => {
            setLoading(true);
            const { data: f } = await supabase.from('furnizori').select('id, nume, adresa').order('nume');
            const { data: p } = await supabase.from('produse').select('id, nume, cod_bare, stoc_depozit').order('nume');
            if (f) setFurnizori(f);
            if (p) setProduse(p);
            if (f && f.length > 0) setSelectedFurnizorId(f[0].id);
            setLoading(false);
        };
        initLoad();
    }, []);

    useEffect(() => {
        const fetchAlocari = async () => {
            if (!selectedFurnizorId) return;
            const { data } = await supabase
                .from('furnizor_produse')
                .select('produs_id')
                .eq('furnizor_id', selectedFurnizorId);

            setAlocariDirecte(new Set(data?.map(i => i.produs_id)));
        };
        fetchAlocari();
    }, [selectedFurnizorId]);

    const toggleAlocareDirecta = async (produsId: number) => {
        if (!selectedFurnizorId) return;

        const exists = alocariDirecte.has(produsId);
        const updatedSet = new Set(alocariDirecte);

        if (exists) updatedSet.delete(produsId);
        else updatedSet.add(produsId);
        setAlocariDirecte(updatedSet);

        try {
            if (exists) {
                await supabase.from('furnizor_produse').delete()
                    .eq('furnizor_id', selectedFurnizorId).eq('produs_id', produsId);
                toast.success("Legătură directă eliminată.");
            } else {
                await supabase.from('furnizor_produse').insert({
                    furnizor_id: selectedFurnizorId,
                    produs_id: produsId
                });
                toast.success("Produs alocat direct furnizorului.");
            }
        } catch (err) {
            toast.error("Eroare la actualizarea bazei de date.");
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-gray-400">Sincronizare nomenclator direct...</div>;

    return (
        <div className="p-8 h-screen flex flex-col bg-slate-50">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Building2 className="text-blue-600" size={32} />
                        Alocare Directă Produse
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Stabiliți produsele achiziționate direct de la furnizor (fără intermediar).</p>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* LISTA FURNIZORI */}
                <div className="w-1/3 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-5 bg-slate-50 border-b font-bold text-xs uppercase tracking-widest text-slate-400">
                        Selectați Furnizorul
                    </div>
                    <div className="overflow-y-auto flex-1 p-3 space-y-2">
                        {furnizori.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setSelectedFurnizorId(f.id)}
                                className={`w-full text-left p-4 rounded-2xl transition-all ${
                                    selectedFurnizorId === f.id
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'hover:bg-blue-50 text-slate-600'
                                }`}
                            >
                                <p className="font-bold">{f.nume}</p>
                                <p className={`text-[10px] ${selectedFurnizorId === f.id ? 'text-blue-200' : 'text-slate-400'}`}>{f.adresa}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* CATALOG PRODUSE */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                className="w-full pl-10 pr-4 py-2 rounded-xl border-none bg-white text-sm outline-none"
                                placeholder="Caută produs..."
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4">
                        {produse.filter(p => p.nume.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                            const active = alocariDirecte.has(p.id);
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => toggleAlocareDirecta(p.id)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                                        active ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 opacity-60'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${active ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                                        {active && <CheckCircle size={14} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{p.nume}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">{p.cod_bare}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}