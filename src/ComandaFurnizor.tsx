import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Send, Truck, User, Calendar, FileText, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ComandaFurnizor() {
    const [loading, setLoading] = useState(false);
    const [furnizori, setFurnizori] = useState<any[]>([]);
    const [produse, setProduse] = useState<any[]>([]);

    // Form State
    const [selectedFurnizor, setSelectedFurnizor] = useState('');
    const [selectedProdus, setSelectedProdus] = useState('');
    const [cantitate, setCantitate] = useState('');
    const [dataLivrare, setDataLivrare] = useState('');
    const [observatii, setObservatii] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            // Luăm furnizorii
            const { data: dataF } = await supabase.from('furnizori').select('*');
            if (dataF) setFurnizori(dataF);

            // Luăm produsele
            const { data: dataP } = await supabase.from('produse').select('*');
            if (dataP) setProduse(dataP);
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFurnizor || !selectedProdus || !cantitate) {
            toast.error("Completează câmpurile obligatorii!");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.from('comenzi_furnizor').insert({
                id_furnizor: parseInt(selectedFurnizor),
                id_produs: parseInt(selectedProdus),
                cantitate: parseInt(cantitate),
                status: 'pending',
                data_livrare_estimata: dataLivrare || null,
                observatii: observatii || '',
                created_at: new Date().toISOString()
            });

            if (error) throw error;

            toast.success("Comanda a fost trimisă cu succes!");

            // Reset form
            setCantitate('');
            setObservatii('');
            setDataLivrare('');

        } catch (error: any) {
            console.error(error);
            toast.error("Eroare la trimitere: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="bg-blue-100 p-2 rounded-xl text-blue-600"><Truck size={28} /></span>
                    Comandă Nouă la Furnizor
                </h1>
                <p className="text-gray-500 mt-2 ml-14">Creează o notă de comandă pentru aprovizionare stoc.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* SELECT FURNIZOR - REPARAT AICI */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <User size={16} /> Selectează Furnizor
                            </label>
                            <select
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800"
                                value={selectedFurnizor}
                                onChange={e => setSelectedFurnizor(e.target.value)}
                            >
                                <option value="">-- Alege din listă --</option>
                                {furnizori.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {/* Afișăm nume_firma (SKFALLL) */}
                                        {f.nume_firma} (CUI: {f.cui || '-'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* DATA LIVRARE */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} /> Dată Livrare Estimată
                            </label>
                            <input
                                type="date"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                value={dataLivrare}
                                onChange={e => setDataLivrare(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* SELECT PRODUS */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Package size={16} /> Produs Dorit
                            </label>
                            <select
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedProdus}
                                onChange={e => setSelectedProdus(e.target.value)}
                            >
                                <option value="">-- Alege Produsul --</option>
                                {produse.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nume} (Stoc curent: {p.stoc_depozit || 0})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* CANTITATE */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Cantitate</label>
                            <input
                                type="number"
                                placeholder="ex: 100"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                value={cantitate}
                                onChange={e => setCantitate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* OBSERVAȚII */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText size={16} /> Observații
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Detalii suplimentare pentru furnizor..."
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            value={observatii}
                            onChange={e => setObservatii(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}
                    >
                        {loading ? 'Se trimite...' : <><Send size={20} /> Trimite Comanda</>}
                    </button>
                </form>
            </div>
        </div>
    );
}