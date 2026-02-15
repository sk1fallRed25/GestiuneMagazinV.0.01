import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Send, Truck, User, Calendar, FileText, Package, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// --- DEFINIRE TIPURI ---
interface Furnizor {
    id: number;
    nume: string; // Am standardizat la 'nume'. Dacă în baza ta e 'nume', schimbă aici.
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

    // Form State
    const [selectedFurnizor, setSelectedFurnizor] = useState('');
    const [selectedProdus, setSelectedProdus] = useState('');
    const [cantitate, setCantitate] = useState('');
    const [dataLivrare, setDataLivrare] = useState('');
    const [observatii, setObservatii] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Luăm furnizorii
                const { data: dataF, error: errF } = await supabase
                    .from('furnizori')
                    .select('*')
                    .order('nume');

                if (errF) throw errF;
                if (dataF) setFurnizori(dataF);

                // 2. Luăm produsele
                const { data: dataP, error: errP } = await supabase
                    .from('produse')
                    .select('id, nume, stoc_depozit, cod_bare')
                    .order('nume');

                if (errP) throw errP;
                if (dataP) setProduse(dataP);

            } catch (error: any) {
                console.error("Eroare încărcare date:", error);
                toast.error("Nu s-au putut încărca listele.");
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFurnizor || !selectedProdus || !cantitate) {
            toast.error("Te rog completează furnizorul, produsul și cantitatea.");
            return;
        }

        setLoading(true);

        try {
            // FIX: Folosim numele standard de coloane (furnizor_id, produs_id)
            const { error } = await supabase.from('comenzi_furnizor').insert([
                {
                    furnizor_id: parseInt(selectedFurnizor), // Corectat din id_furnizor
                    produs_id: parseInt(selectedProdus),     // Corectat din id_produs
                    cantitate: parseInt(cantitate),
                    status: 'pending',
                    data_livrare_estimata: dataLivrare || null,
                    observatii: observatii || '',
                    // created_at este de obicei auto-generat, dar îl putem forța dacă e necesar
                }
            ]);

            if (error) throw error;

            toast.success("Comanda a fost trimisă către furnizor!");

            // Reset form
            setCantitate('');
            setObservatii('');
            setDataLivrare('');
            // Nu resetăm furnizorul/produsul pentru a permite introducerea rapidă a mai multor produse

        } catch (error: any) {
            console.error(error);
            toast.error("Eroare la salvare: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8 border-b border-gray-200 pb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200">
                        <Truck size={32} />
                    </div>
                    Comandă Aprovizionare
                </h1>
                <p className="text-gray-500 mt-2 text-lg">Creează și trimite comenzi direct către furnizorii parteneri.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* SELECT FURNIZOR */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <User size={18} className="text-blue-600" />
                                Selectează Furnizor
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none font-medium text-gray-700"
                                    value={selectedFurnizor}
                                    onChange={e => setSelectedFurnizor(e.target.value)}
                                >
                                    <option value="">-- Alege din listă --</option>
                                    {furnizori.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.nume} {f.cui ? `(CUI: ${f.cui})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>

                        {/* DATA LIVRARE */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-600" />
                                Dată Livrare Estimată
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
                        {/* SELECT PRODUS */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Package size={18} className="text-blue-600" />
                                Produs Dorit
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none font-medium text-gray-700"
                                    value={selectedProdus}
                                    onChange={e => setSelectedProdus(e.target.value)}
                                >
                                    <option value="">-- Alege Produsul --</option>
                                    {produse.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nume} {p.stoc_depozit !== undefined ? `(Stoc: ${p.stoc_depozit})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>

                        {/* CANTITATE */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 mb-2">Cantitate Comandată</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="ex: 100"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-gray-800"
                                value={cantitate}
                                onChange={e => setCantitate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* OBSERVAȚII */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" />
                            Observații / Notă
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Detalii suplimentare pentru furnizor (ex: livrare la rampa 2)..."
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-gray-700"
                            value={observatii}
                            onChange={e => setObservatii(e.target.value)}
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg ${
                                loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                            }`}
                        >
                            {loading ? (
                                'Se procesează...'
                            ) : (
                                <>
                                    <Send size={24} /> Trimite Comanda
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}