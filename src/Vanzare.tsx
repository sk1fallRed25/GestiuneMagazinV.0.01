import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { db, LocalProduct, LocalBon } from './db'; // Asigură-te că db.ts exportă aceste tipuri
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'react-hot-toast';
import { Wifi, WifiOff, Search, ShoppingCart, Trash2, Plus, Minus, LogOut, RefreshCw, CreditCard } from 'lucide-react';

export default function Vanzare() {
    const [filtru, setFiltru] = useState('');
    const [bon, setBon] = useState<any[]>([]); // Coșul de cumpărături
    const [loading, setLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState("Pregătit");
    const [metodaPlata, setMetodaPlata] = useState<'cash' | 'card'>('cash');

    const searchInputRef = useRef<HTMLInputElement>(null);

    // --- 1. SINCRONIZARE AUTOMATĂ (ONLINE/OFFLINE) ---
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // A. DESCARCĂ PRODUSE (Supabase -> Dexie)
        const syncProduse = async () => {
            if (!navigator.onLine) return;
            setSyncStatus("Se descarcă catalogul...");

            try {
                const { data, error } = await supabase
                    .from('produse')
                    .select('id, nume, cod_bare, pret_vanzare, stoc_magazin, unitate_masura');

                if (error) throw error;

                if (data) {
                    await db.products.clear();
                    await db.products.bulkAdd(data as LocalProduct[]);
                    setSyncStatus("Catalog Actualizat ✅");
                }
            } catch (e) {
                console.error("Eroare sync produse:", e);
                setSyncStatus("Eroare Sync ⚠️");
            }
        };

        // B. TRIMITE BONURI OFFLINE (Dexie -> Supabase)
        const syncBonuriVechi = async () => {
            if (!navigator.onLine) return;

            const bonuriOffline = await db.bonuri.where('synced').equals(0).toArray();

            if (bonuriOffline.length > 0) {
                setSyncStatus(`Se trimit ${bonuriOffline.length} bonuri...`);

                for (const b of bonuriOffline) {
                    try {
                        // 1. Inserare Header Vânzare
                        const { data: vanzareSaved, error: errVanzare } = await supabase
                            .from('vanzari')
                            .insert([{
                                total: b.total,
                                metoda_plata: 'cash', // Implicit cash pentru offline momentan
                                data_vanzare: b.data,
                                status: 'finalizat'
                            }])
                            .select()
                            .single();

                        if (errVanzare) throw errVanzare;

                        // 2. Inserare Detalii
                        const detalii = b.items.map((i: any) => ({
                            vanzare_id: vanzareSaved.id,
                            produs_id: i.id,
                            cantitate: i.cantitate,
                            pret_vanzare: i.pret
                        }));

                        const { error: errDetalii } = await supabase.from('detalii_vanzare').insert(detalii);
                        if (errDetalii) throw errDetalii;

                        // 3. Scădere Stoc (Server-side)
                        for (const item of b.items) {
                            await supabase.rpc('scade_stoc_magazin', {
                                p_produs_id: item.id,
                                p_cantitate: item.cantitate
                            });
                        }

                        // 4. Ștergere locală după succes
                        if (b.id) await db.bonuri.delete(b.id);

                    } catch (err) {
                        console.error("Eroare sync bon:", err);
                    }
                }
                setSyncStatus("Sincronizare Completă ✅");
            }
        };

        syncProduse();
        const interval = setInterval(syncBonuriVechi, 15000); // Verifică la fiecare 15 secunde

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [isOnline]);

    // --- 2. CĂUTARE LIVE (DEXIE) ---
    const produseFiltrate = useLiveQuery(async () => {
        if (!filtru) return [];
        const byName = await db.products
            .filter(p => p.nume.toLowerCase().includes(filtru.toLowerCase()))
            .limit(12)
            .toArray();
        const byCode = await db.products
            .where('cod_bare').startsWith(filtru)
            .limit(5)
            .toArray();

        // Eliminăm duplicatele
        const all = [...byCode, ...byName];
        return all.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    }, [filtru]);

    // --- 3. FUNCȚII COȘ ---
    const adaugaPeBon = (produs: LocalProduct) => {
        if (produs.stoc_magazin <= 0) {
            toast.error("Stoc epuizat la raft!");
            return;
        }

        setBon(prevBon => {
            const exista = prevBon.find(item => item.id === produs.id);
            if (exista) {
                // Verificăm dacă mai avem stoc pentru a adăuga încă una
                if (exista.cantitate + 1 > produs.stoc_magazin) {
                    toast.error(`Doar ${produs.stoc_magazin} buc pe stoc!`);
                    return prevBon;
                }
                return prevBon.map(item => item.id === produs.id ? { ...item, cantitate: item.cantitate + 1 } : item);
            } else {
                return [...prevBon, { ...produs, cantitate: 1, pret: produs.pret_vanzare }];
            }
        });
        setFiltru('');
        searchInputRef.current?.focus();
    };

    const modificaCantitate = (id: number, delta: number) => {
        setBon(prevBon => prevBon.map(item => {
            if (item.id === id) {
                const nouaCantitate = item.cantitate + delta;
                if (nouaCantitate < 1) return item; // Nu scădem sub 1
                // Verificare stoc (simplificată, ar trebui verificată cu stocul original)
                return { ...item, cantitate: nouaCantitate };
            }
            return item;
        }));
    };

    const stergeProdus = (id: number) => setBon(bon.filter(item => item.id !== id));

    // --- 4. ÎNCASARE ---
    const incaseaza = async () => {
        if (bon.length === 0) return toast.error("Bonul este gol!");
        setLoading(true);

        const total = bon.reduce((acc, item) => acc + (item.cantitate * item.pret), 0);

        const promise = new Promise(async (resolve, reject) => {
            try {
                // CAZ ONLINE
                if (navigator.onLine) {
                    // 1. Vanzare Header
                    const { data: vanzare, error: errV } = await supabase
                        .from('vanzari')
                        .insert([{
                            total,
                            metoda_plata: metodaPlata,
                            data_vanzare: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (errV) throw errV;

                    // 2. Detalii
                    const detalii = bon.map(item => ({
                        vanzare_id: vanzare.id,
                        produs_id: item.id,
                        cantitate: item.cantitate,
                        pret_vanzare: item.pret // Prețul la momentul vânzării
                    }));

                    const { error: errD } = await supabase.from('detalii_vanzare').insert(detalii);
                    if (errD) throw errD;

                    // 3. RPC Stoc
                    for (const item of bon) {
                        await supabase.rpc('scade_stoc_magazin', { p_produs_id: item.id, p_cantitate: item.cantitate });
                    }
                }
                // CAZ OFFLINE
                else {
                    await db.bonuri.add({
                        data: new Date().toISOString(),
                        total: total,
                        items: bon,
                        synced: 0 // Marcat pentru sync
                    });
                }

                // ACTUALIZARE STOC LOCAL (DEXIE) PENTRU UI
                for (const item of bon) {
                    const p = await db.products.get(item.id);
                    if (p) {
                        await db.products.update(item.id, { stoc_magazin: Math.max(0, p.stoc_magazin - item.cantitate) });
                    }
                }

                resolve('Bon emis cu succes!');
            } catch (error) {
                reject(error);
            }
        });

        toast.promise(promise, {
            loading: 'Se procesează...',
            success: (msg) => {
                setBon([]);
                setFiltru('');
                setLoading(false);
                return `${msg}`;
            },
            error: (err: any) => {
                setLoading(false);
                return `Eroare: ${err.message}`;
            }
        });
    };

    const totalBon = bon.reduce((acc, item) => acc + (item.cantitate * item.pret), 0);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">

            {/* --- STANGA: CATALOG --- */}
            <div className="w-3/5 p-6 flex flex-col gap-6">

                {/* Search Header */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full ${isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                            {isOnline ? "ONLINE" : "OFFLINE MODE"}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                            {loading && <RefreshCw size={12} className="animate-spin" />}
                            {syncStatus}
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Caută produs (nume sau cod)..."
                            className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-xl text-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={filtru}
                            onChange={e => setFiltru(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Grid Produse */}
                <div className="flex-1 overflow-y-auto pr-2">
                    {produseFiltrate && produseFiltrate.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                            {produseFiltrate.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => adaugaPeBon(p)}
                                    disabled={p.stoc_magazin <= 0}
                                    className={`relative p-5 rounded-2xl shadow-sm border text-left flex flex-col justify-between h-36 transition-all active:scale-95 group ${
                                        p.stoc_magazin <= 0
                                            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                                            : 'bg-white border-white hover:border-indigo-300 hover:shadow-md'
                                    }`}
                                >
                                    <div>
                                        <div className="font-bold text-gray-800 line-clamp-2 leading-tight">{p.nume}</div>
                                        <div className={`text-xs font-bold mt-2 px-2 py-0.5 rounded w-fit ${p.stoc_magazin < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                            Stoc: {p.stoc_magazin} {p.unitate_masura}
                                        </div>
                                    </div>
                                    <div className="font-black text-xl text-indigo-600 self-end">
                                        {p.pret_vanzare.toFixed(2)} <span className="text-xs font-medium text-gray-400">LEI</span>
                                    </div>
                                    {/* Cod bare mic */}
                                    <div className="absolute bottom-2 left-4 text-[10px] text-gray-300 font-mono">{p.cod_bare}</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            <Search size={64} className="mb-4 opacity-20" />
                            <p className="text-lg">Scanează sau caută un produs...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- DREAPTA: BON --- */}
            <div className="w-2/5 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-10">

                {/* Header Bon */}
                <div className="p-6 bg-gray-900 text-white flex justify-between items-center shadow-lg">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <ShoppingCart size={24} className="text-indigo-400" />
                            Bon Fiscal
                        </h2>
                        <div className="text-sm text-gray-400 mt-1">{bon.length} linii active</div>
                    </div>
                    <Link to="/" className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white" title="Ieșire">
                        <LogOut size={20} />
                    </Link>
                </div>

                {/* Lista Produse Bon */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    {bon.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate">{item.nume}</div>
                                <div className="text-sm text-gray-500 font-mono mt-1">
                                    {item.pret.toFixed(2)} x {item.cantitate}
                                </div>
                            </div>

                            <div className="font-bold text-lg text-gray-900 w-24 text-right">
                                {(item.cantitate * item.pret).toFixed(2)}
                            </div>

                            {/* Controale Cantitate */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <button onClick={() => modificaCantitate(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors">
                                    <Minus size={14} />
                                </button>
                                <span className="w-8 text-center font-bold text-sm">{item.cantitate}</span>
                                <button onClick={() => modificaCantitate(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors">
                                    <Plus size={14} />
                                </button>
                            </div>

                            <button onClick={() => stergeProdus(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Footer Total */}
                <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">

                    {/* Metoda Plată */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setMetodaPlata('cash')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all ${metodaPlata === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}
                        >
                            💵 NUMERAR
                        </button>
                        <button
                            onClick={() => setMetodaPlata('card')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${metodaPlata === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}
                        >
                            <CreditCard size={14} /> CARD
                        </button>
                    </div>

                    <div className="flex justify-between items-end mb-6">
                        <span className="text-gray-500 font-medium">TOTAL DE PLATĂ</span>
                        <span className="text-5xl font-black text-gray-900 tracking-tight">
                            {totalBon.toFixed(2)} <span className="text-lg text-gray-400 font-normal">LEI</span>
                        </span>
                    </div>

                    <button
                        onClick={incaseaza}
                        disabled={bon.length === 0 || loading}
                        className={`w-full py-5 rounded-2xl text-2xl font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                            isOnline
                                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-200'
                                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {loading ? <RefreshCw className="animate-spin" /> : (isOnline ? 'ÎNCASEAZĂ' : 'SALVEAZĂ LOCAL')}
                    </button>
                </div>
            </div>
        </div>
    );
}