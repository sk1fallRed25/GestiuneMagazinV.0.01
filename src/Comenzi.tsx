import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import {
    ShoppingCart, Plus, Trash2, Search,
    FileText, User, Package, Send, Calculator
} from 'lucide-react';

// --- DEFINIȚII TIPURI ---
interface Furnizor { id: number; nume: string; cui: string }
interface Produs { id: number; nume: string; cod_bare: string; pret_vanzare: number }
interface LinieComanda {
    id: number;
    produs: Produs;
    cantitate: number;
    pret_unitar: number;
}

export default function Comenzi() {
    // State-uri principale
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [produse, setProduse] = useState<Produs[]>([]);
    const [selFurnizorId, setSelFurnizorId] = useState<string>('');
    const [liniiComanda, setLiniiComanda] = useState<LinieComanda[]>([]);

    // State-uri pentru adăugare produs
    const [searchProdus, setSearchProdus] = useState('');
    const [produsSelectat, setProdusSelectat] = useState<Produs | null>(null);
    const [cantitateInput, setCantitateInput] = useState<number>(1);
    const [pretInput, setPretInput] = useState<number>(0);

    const [loading, setLoading] = useState(false);

    // --- ÎNCĂRCARE DATE INIȚIALE ---
    useEffect(() => {
        const fetchDateBase = async () => {
            const { data: f } = await supabase.from('furnizori').select('id, nume, cui').order('nume');
            const { data: p } = await supabase.from('produse').select('id, nume, cod_bare, pret_vanzare').order('nume');
            if (f) setFurnizori(f);
            if (p) setProduse(p);
        };
        fetchDateBase();
    }, []);

    // --- LOGICĂ ADĂUGARE LINIE ---
    const produseFiltrate = produse.filter(p =>
        p.nume.toLowerCase().includes(searchProdus.toLowerCase()) ||
        p.cod_bare?.includes(searchProdus)
    ).slice(0, 5);

    const adaugaLinie = () => {
        if (!produsSelectat || cantitateInput <= 0) {
            return toast.error("Selectați un produs și o cantitate validă.");
        }

        const linieNoua: LinieComanda = {
            id: Date.now(),
            produs: produsSelectat,
            cantitate: cantitateInput,
            pret_unitar: pretInput
        };

        setLiniiComanda([...liniiComanda, linieNoua]);
        setProdusSelectat(null);
        setSearchProdus('');
        setPretInput(0);
        setCantitateInput(1);
    };

    const stergeLinie = (id: number) => {
        setLiniiComanda(liniiComanda.filter(l => l.id !== id));
    };

    // --- FINALIZARE COMANDĂ ---
    const salveazaComanda = async () => {
        if (!selFurnizorId) return toast.error("Selectați furnizorul.");
        if (liniiComanda.length === 0) return toast.error("Comanda nu are produse.");

        setLoading(true);
        const total = liniiComanda.reduce((acc, l) => acc + (l.cantitate * l.pret_unitar), 0);

        try {
            // 1. Inserare Header Comandă
            const { data: comanda, error: errC } = await supabase
                .from('comenzi_catre_furnizor')
                .insert([{
                    furnizor_id: parseInt(selFurnizorId),
                    total_valoare: total,
                    status: 'pending'
                }])
                .select()
                .single();

            if (errC) throw errC;

            // 2. Inserare Detalii Comandă
            const detalii = liniiComanda.map(l => ({
                comanda_id: comanda.id,
                produs_id: l.produs.id,
                cantitate: l.cantitate,
                pret_unitar: l.pret_unitar
            }));

            const { error: errD } = await supabase.from('comenzi_aprovizionare_detalii').insert(detalii);
            if (errD) throw errD;

            toast.success("Comandă trimisă cu succes!");
            setLiniiComanda([]);
            setSelFurnizorId('');
        } catch (err: any) {
            toast.error("Eroare: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalComanda = liniiComanda.reduce((acc, l) => acc + (l.cantitate * l.pret_unitar), 0);

    return (
        <div className="p-8 max-w-6xl mx-auto bg-gray-50/30 min-h-screen pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                        <ShoppingCart size={28} />
                    </span>
                    Creare Comandă Furnizor
                </h1>
                <p className="text-gray-500 mt-2 ml-14">Generați o listă de achiziții pentru furnizorii parteneri.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- COLOANA STÂNGA: CONFIGURARE --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <User className="text-blue-500" size={18} /> Selecție Furnizor
                        </h3>
                        <select
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            value={selFurnizorId}
                            onChange={(e) => setSelFurnizorId(e.target.value)}
                        >
                            <option value="">-- Alege Furnizor --</option>
                            {furnizori.map(f => (
                                <option key={f.id} value={f.id}>{f.nume}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                        <Calculator className="absolute right-[-10px] top-[-10px] text-white/10" size={120} />
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Total Estimativ</p>
                        <h2 className="text-4xl font-black mt-2">{totalComanda.toFixed(2)} <span className="text-sm font-normal opacity-60">RON</span></h2>
                        <button
                            onClick={salveazaComanda}
                            disabled={loading || liniiComanda.length === 0}
                            className="w-full mt-6 bg-white text-indigo-900 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? "Se procesează..." : <><Send size={18} /> Trimite Comanda</>}
                        </button>
                    </div>
                </div>

                {/* --- COLOANA DREAPTĂ: ADĂUGARE PRODUSE --- */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Adăugare Produse</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Caută produs..."
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    value={searchProdus}
                                    onChange={(e) => setSearchProdus(e.target.value)}
                                />
                                {searchProdus && produseFiltrate.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-100 shadow-xl rounded-xl mt-2 overflow-hidden">
                                        {produseFiltrate.map(p => (
                                            <div
                                                key={p.id}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                                                onClick={() => { setProdusSelectat(p); setSearchProdus(p.nume); }}
                                            >
                                                <p className="font-bold text-sm text-gray-800">{p.nume}</p>
                                                <p className="text-xs text-gray-400">{p.cod_bare}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Preț unitar"
                                    className="w-1/2 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    value={pretInput || ''}
                                    onChange={(e) => setPretInput(parseFloat(e.target.value))}
                                />
                                <input
                                    type="number"
                                    placeholder="Cant."
                                    className="w-1/4 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                                    value={cantitateInput}
                                    onChange={(e) => setCantitateInput(parseInt(e.target.value))}
                                />
                                <button
                                    onClick={adaugaLinie}
                                    className="w-1/4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center shadow-md shadow-blue-200"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabel Linii */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b">
                            <tr>
                                <th className="px-6 py-4">Produs</th>
                                <th className="px-6 py-4 text-center">Cantitate</th>
                                <th className="px-6 py-4 text-right">Preț Estimativ</th>
                                <th className="px-6 py-4 text-right">Subtotal</th>
                                <th className="px-6 py-4 text-center"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {liniiComanda.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                        Nu ați adăugat niciun produs pe listă.
                                    </td>
                                </tr>
                            ) : (
                                liniiComanda.map(l => (
                                    <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-800">{l.produs.nume}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">{l.produs.cod_bare}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-blue-600">{l.cantitate} buc</td>
                                        <td className="px-6 py-4 text-right font-mono">{l.pret_unitar.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{(l.cantitate * l.pret_unitar).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => stergeLinie(l.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
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