import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
    Trash2, Search, AlertOctagon, X,
    ArrowLeft, Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- DEFINIȚIE INTERFAȚĂ PRODUS ---
interface Produs {
    id: number;
    nume: string;
    cod_bare: string;
    stoc_depozit: number;
    stoc_magazin: number;
}

export default function Pierderi() {
    const location = useLocation();
    const navigate = useNavigate();

    const [products, setProducts] = useState<Produs[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Stări Modal și Formular
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Produs | null>(null);
    const [scrapQty, setScrapQty] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchProductsAndCheckParams();
    }, []);

    const fetchProductsAndCheckParams = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
                .order('nume');

            if (error) throw error;
            const fetchedProducts = data || [];
            setProducts(fetchedProducts);

            const state = location.state as { preSelectedId?: number };
            if (state?.preSelectedId) {
                const preSelected = fetchedProducts.find(p => p.id === state.preSelectedId);
                if (preSelected) {
                    openScrapModal(preSelected);
                    setReason("Produs Expirat");
                }
            }
        } catch (err: any) {
            toast.error("Eroare la sincronizarea nomenclatorului: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const openScrapModal = (prod: Produs) => {
        setSelectedProduct(prod);
        setScrapQty('');
        setShowModal(true);
    };

    const handleScrap = async () => {
        const qty = parseFloat(scrapQty);
        // Preluarea ID-ului utilizatorului (UUID) salvat la login
        const currentUserId = localStorage.getItem('magazin_agent_id');

        if (!selectedProduct) return;
        if (!currentUserId) return toast.error("Eroare autentificare: ID utilizator lipsă.");
        if (!qty || qty <= 0) return toast.error("Specificați o cantitate validă.");
        if (!reason) return toast.error("Specificați motivul (ex: Expirat, Spart).");

        const totalStock = (selectedProduct.stoc_depozit || 0) + (selectedProduct.stoc_magazin || 0);
        if (qty > totalStock) {
            return toast.error(`Stoc insuficient. Disponibil total: ${totalStock} buc.`);
        }

        setLoading(true);
        try {
            // Algoritm Calcul Sursă Stoc și Decrementare (Prioritate Magazin)
            let remainingToScrap = qty;
            let newMagazin = selectedProduct.stoc_magazin || 0;
            let newDepozit = selectedProduct.stoc_depozit || 0;
            let sursaEfectiva = "Depozit";

            if (newMagazin >= remainingToScrap) {
                newMagazin -= remainingToScrap;
                remainingToScrap = 0;
                sursaEfectiva = "Raft";
            } else {
                if (newMagazin > 0) {
                    remainingToScrap -= newMagazin;
                    newMagazin = 0;
                    sursaEfectiva = "Mixt (Raft + Depozit)";
                }
                newDepozit -= remainingToScrap;
            }

            // 1. Înregistrare pierdere conform schemei bazei de date
            const { error: logError } = await supabase
                .from('pierderi')
                .insert([{
                    produs_id: selectedProduct.id,
                    user_id: currentUserId, // UUID-ul angajatului
                    cantitate: qty,
                    motiv: reason,
                    sursa_stoc: sursaEfectiva // Identificarea sursei
                }]);

            if (logError) throw logError;

            // 2. Actualizare stocuri în tabela produse
            const { error: updateError } = await supabase
                .from('produse')
                .update({
                    stoc_magazin: newMagazin,
                    stoc_depozit: newDepozit
                })
                .eq('id', selectedProduct.id);

            if (updateError) throw updateError;

            toast.success("Pierdere înregistrată de angajat. Stoc actualizat.");
            setShowModal(false);
            fetchProductsAndCheckParams();

        } catch (err: any) {
            toast.error("Eroare tranzacțională: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.nume.toLowerCase().includes(search.toLowerCase()) ||
        p.cod_bare.includes(search)
    );

    return (
        <div className="p-8 max-w-7xl mx-auto bg-gray-50/30 min-h-screen">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Raportare Pierderi</h1>
                        <p className="text-gray-500 text-sm">Gestionarea ieșirilor neconforme din gestiune.</p>
                    </div>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Denumire sau Cod Bare..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading && !showModal ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((prod) => (
                        <button
                            key={prod.id}
                            onClick={() => openScrapModal(prod)}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all flex justify-between items-center group text-left"
                        >
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">{prod.nume}</h3>
                                <p className="text-xs text-gray-400 font-mono mt-1">{prod.cod_bare}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-gray-400">Total Disponibil</p>
                                <p className="text-lg font-black text-red-600">{(prod.stoc_depozit || 0) + (prod.stoc_magazin || 0)}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-10">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-gray-800">Validare Casare</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-red-50 p-5 rounded-3xl border border-red-100">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Repere Vizate</p>
                                <p className="text-xl font-bold text-gray-800">{selectedProduct?.nume}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Volum Pierdere</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-xl"
                                        placeholder="0"
                                        value={scrapQty}
                                        onChange={(e) => setScrapQty(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Motiv (Ex: Deteriorat)</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500"
                                        placeholder="Motivul..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleScrap}
                                disabled={loading}
                                className="w-full py-5 bg-red-600 text-white rounded-3xl font-black hover:bg-red-700 shadow-xl shadow-red-200 transition-all flex items-center justify-center gap-3 text-lg"
                            >
                                {loading ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <><AlertOctagon size={24}/> Finalizează Raportul</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}