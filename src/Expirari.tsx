import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import necesar pentru rutare
import { supabase } from './supabaseClient';
import {
    CalendarClock, AlertTriangle, Trash2, Tag,
    Package, Store, Search, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- DEFINIȚIE INTERFAȚĂ DATE ---
interface ProdusExpirat {
    receptie_detaliu_id: number;
    produs_id: number;
    nume: string;
    data_expirare: string;
    stoc_magazin: number;
    stoc_depozit: number;
}

export default function Expirari() {
    const [items, setItems] = useState<ProdusExpirat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Inițializare motor de navigare
    const navigate = useNavigate();

    useEffect(() => {
        fetchExpirations();
    }, []);

    const fetchExpirations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('view_expirari')
                .select('*')
                .order('data_expirare', { ascending: true });

            if (error) throw error;
            setItems(data || []);
        } catch (err: any) {
            toast.error("Eroare la sincronizarea datelor: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getDaysLeft = (dateString: string) => {
        const today = new Date();
        const expDate = new Date(dateString);
        const diffTime = expDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    /**
     * Gestionează acțiunile operaționale pentru un lot specific.
     * În cazul tipului 'SCRAP', se realizează redirecționarea către modulul Pierderi.
     */
    const handleAction = (item: ProdusExpirat, type: 'SCRAP' | 'PROMO') => {
        if (type === 'SCRAP') {
            // Transferul stării către ruta /pierderi pentru pre-completarea formularului
            navigate('/pierderi', {
                state: {
                    preSelectedId: item.produs_id,
                    preSelectedName: item.nume
                }
            });
        } else if (type === 'PROMO') {
            toast.success(`Marcaj promoțional activat pentru: ${item.nume}`);
        }
    };

    const filteredItems = items.filter(i =>
        i.nume.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto bg-gray-50/30 min-h-screen pb-20 font-sans">
            {/* Secțiune Header și Filtrare */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-200">
                            <CalendarClock size={28} />
                        </span>
                        Monitorizare Expirări
                    </h1>
                    <p className="text-gray-500 mt-2 ml-14">Identificarea loturilor cu risc de perisabilitate ridicat.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Căutare după denumire produs..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-20 text-center border border-gray-100 shadow-sm">
                    <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">Integritate stoc validată!</h3>
                    <p className="text-gray-500 mt-2">Nu există loturi care expiră în intervalul de 30 de zile monitorizat.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item) => {
                        const daysLeft = getDaysLeft(item.data_expirare);

                        let statusConfig = {
                            color: "text-yellow-600 bg-yellow-50 border-yellow-100",
                            bar: "bg-yellow-500",
                            label: `${daysLeft} Zile rămase`
                        };

                        if (daysLeft < 0) {
                            statusConfig = {
                                color: "text-red-700 bg-red-50 border-red-100",
                                bar: "bg-red-600",
                                label: `EXPIRAT DE ${Math.abs(daysLeft)} ZILE`
                            };
                        } else if (daysLeft <= 7) {
                            statusConfig = {
                                color: "text-orange-700 bg-orange-50 border-orange-100",
                                bar: "bg-orange-600",
                                label: `CRITIC: ${daysLeft} ZILE`
                            };
                        }

                        return (
                            <div key={item.receptie_detaliu_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                                <div className={`h-1.5 w-full ${statusConfig.bar}`}></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-gray-800 text-lg leading-tight group-hover:text-red-600 transition-colors">
                                            {item.nume}
                                        </h3>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${statusConfig.color} flex items-center gap-1.5`}>
                                            <AlertCircle size={12} />
                                            {statusConfig.label}
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Data Limită:</span>
                                            <span className="font-mono font-bold text-gray-700">
                                                {new Date(item.data_expirare).toLocaleDateString('ro-RO')}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                                                <p className="text-[10px] uppercase text-gray-400 font-bold mb-1 flex items-center justify-center gap-1">
                                                    <Store size={10} /> Raft
                                                </p>
                                                <p className="text-lg font-black text-gray-800">{item.stoc_magazin}</p>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                                                <p className="text-[10px] uppercase text-gray-400 font-bold mb-1 flex items-center justify-center gap-1">
                                                    <Package size={10} /> Depozit
                                                </p>
                                                <p className="text-lg font-black text-gray-800">{item.stoc_depozit}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-gray-50">
                                        {daysLeft < 0 ? (
                                            <button
                                                onClick={() => handleAction(item, 'SCRAP')}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all border border-red-100"
                                            >
                                                <Trash2 size={14} /> Scoatere (Pierderi)
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleAction(item, 'PROMO')}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-600 hover:text-white transition-all border border-orange-100"
                                            >
                                                <Tag size={14} /> Aplică Reducere
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}