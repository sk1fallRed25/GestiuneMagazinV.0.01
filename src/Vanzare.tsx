import React, { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'
import { db, LocalProduct } from './db'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'react-hot-toast'

// Funcție ajutătoare pentru calculul prețului cu TVA
const calculPretFinal = (produs: LocalProduct) => {
    return produs.pret_vanzare_fara_tva * (1 + produs.tva_procent / 100);
};

export default function Vanzare() {
    const [filtru, setFiltru] = useState('')
    const [bon, setBon] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [syncStatus, setSyncStatus] = useState("Actualizat")

    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));

        const syncProduse = async () => {
            if (!navigator.onLine) return;
            setSyncStatus("Se descarcă produsele...")
            const { data } = await supabase.from('produse').select('id, nume, cod_bare, pret_vanzare_fara_tva, tva_procent, unitate_masura, stoc_magazin');
            if (data) {
                await db.products.clear();
                await db.products.bulkAdd(data as LocalProduct[]);
                setSyncStatus("Catalog Sincronizat ✅")
            }
        }
        syncProduse();

        const syncBonuriVechi = async () => {
            if (!navigator.onLine) return;
            const bonuriOffline = await db.bonuri.where('synced').equals(0).toArray();
            if (bonuriOffline.length > 0) {
                setSyncStatus(`Trimit ${bonuriOffline.length} bonuri offline...`);
                for (const b of bonuriOffline) {
                    const { data: bonSaved, error } = await supabase.from('bonuri').insert([{ total: b.total }]).select();
                    if (!error && bonSaved) {
                        const bonId = bonSaved[0].id;
                        const detalii = b.items.map((i: any) => ({ bon_id: bonId, produs_id: i.id, cantitate: i.cantitate, pret_vanzare: i.pret_vanzare_fara_tva, tva_procent: i.tva_procent }));
                        await supabase.from('bon_detalii').insert(detalii);
                        for (const item of b.items) {
                            await supabase.rpc('scade_stoc_magazin', { p_produs_id: item.id, p_cantitate: item.cantitate });
                        }
                        if (b.id) await db.bonuri.delete(b.id);
                    }
                }
                setSyncStatus("Toate datele salvate! ✅");
            }
        }
        const interval = setInterval(syncBonuriVechi, 10000);
        return () => clearInterval(interval);
    }, [isOnline])

    const produseFiltrate = useLiveQuery(async () => {
        if (!filtru) return [];
        const byName = await db.products.filter(p => p.nume.toLowerCase().includes(filtru.toLowerCase())).limit(10).toArray();
        const byCode = await db.products.where('cod_bare').startsWith(filtru).limit(5).toArray();
        const all = [...byCode, ...byName];
        return all.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
    }, [filtru]);

    const adaugaPeBon = (produs: LocalProduct) => {
        const exista = bon.find(item => item.id === produs.id)
        if (exista) {
            setBon(bon.map(item => item.id === produs.id ? { ...item, cantitate: item.cantitate + 1 } : item))
        } else {
            setBon([...bon, { ...produs, cantitate: 1 }])
        }
        setFiltru('')
        searchInputRef.current?.focus()
    }

    const modificaCantitate = (id: number, delta: number) => {
        setBon(bon.map(item => item.id === id ? { ...item, cantitate: Math.max(1, item.cantitate + delta) } : item))
    }

    const stergeProdus = (id: number) => setBon(bon.filter(item => item.id !== id))

    const incaseaza = async () => {
        if (bon.length === 0) return toast.error("Bonul este gol!");
        setLoading(true);

        const total = bon.reduce((acc, item) => acc + (item.cantitate * calculPretFinal(item)), 0);

        const promise = new Promise(async (resolve, reject) => {
            try {
                if (navigator.onLine) {
                    const { data: bonSaved, error: errBon } = await supabase.from('bonuri').insert([{ total }]).select();
                    if (errBon) throw errBon;

                    const detalii = bon.map(item => ({ bon_id: bonSaved[0].id, produs_id: item.id, cantitate: item.cantitate, pret_vanzare: item.pret_vanzare_fara_tva, tva_procent: item.tva_procent }));
                    await supabase.from('bon_detalii').insert(detalii);
                    for (const item of bon) {
                        await supabase.rpc('scade_stoc_magazin', { p_produs_id: item.id, p_cantitate: item.cantitate });
                    }
                } else {
                    await db.bonuri.add({ data: new Date().toISOString(), total: total, items: bon, synced: 0 });
                }

                for (const item of bon) {
                    const p = await db.products.get(item.id);
                    if (p) {
                        await db.products.update(item.id, { stoc_magazin: p.stoc_magazin - item.cantitate });
                    }
                }
                resolve(`Bon emis cu succes!`);
            } catch (error) {
                reject(error);
            }
        });

        toast.promise(promise, {
            loading: 'Se procesează bonul...',
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
    }

    const totalBon = bon.reduce((acc, item) => acc + (item.cantitate * calculPretFinal(item)), 0);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <div className="w-3/5 p-4 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                        <span className={isOnline ? "text-green-600" : "text-red-600"}>{isOnline ? "🟢 CONECTAT" : "🔴 OFFLINE"}</span>
                        <span className="text-gray-400">{syncStatus}</span>
                    </div>
                    <input ref={searchInputRef} type="text" placeholder="Căutare..." className="w-full border-2 border-blue-100 rounded-lg px-4 py-3 text-lg" value={filtru} onChange={e => setFiltru(e.target.value)} autoFocus />
                </div>
                <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 content-start pb-4">
                    {produseFiltrate?.map(p => (
                        <button key={p.id} onClick={() => adaugaPeBon(p)} disabled={p.stoc_magazin <= 0} className={`p-4 rounded-xl shadow-sm border text-left flex flex-col justify-between h-32 ${p.stoc_magazin <= 0 ? 'bg-gray-100 opacity-60' : 'bg-white hover:border-blue-400'}`}>
                            <div>
                                <div className="font-bold text-gray-800 line-clamp-2">{p.nume}</div>
                                <div className="text-xs text-gray-500 mt-1">Stoc: {p.stoc_magazin}</div>
                            </div>
                            <div className="font-bold text-lg text-blue-600 self-end">{calculPretFinal(p).toFixed(2)} Lei</div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="w-2/5 bg-white border-l flex flex-col shadow-2xl">
                <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
                    <div><h2 className="text-xl font-bold">🛒 Bon Curent</h2><div className="text-sm text-gray-400">Produse: {bon.length}</div></div>
                    <Link to="/" className="text-xs text-gray-500 hover:text-white border border-gray-700 px-2 py-1 rounded">Ieșire</Link>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                    {bon.map((item) => (
                        <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border flex items-center">
                            <div className="flex-1">
                                <div className="font-bold">{item.nume}</div>
                                <div className="text-sm text-gray-500">{item.cantitate} x {calculPretFinal(item).toFixed(2)} Lei</div>
                            </div>
                            <div className="font-bold w-20 text-right">{(item.cantitate * calculPretFinal(item)).toFixed(2)}</div>
                            <div className="flex bg-gray-100 rounded-lg p-1 gap-1 ml-3">
                                <button onClick={() => modificaCantitate(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm">-</button>
                                <button onClick={() => modificaCantitate(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm">+</button>
                            </div>
                            <button onClick={() => stergeProdus(item.id)} className="ml-2 text-gray-400 hover:text-red-500">✕</button>
                        </div>
                    ))}
                </div>
                <div className="p-6 bg-white border-t">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500 text-lg">Total</span>
                        <span className="text-4xl font-bold text-gray-900">{totalBon.toFixed(2)} Lei</span>
                    </div>
                    <button onClick={incaseaza} disabled={bon.length === 0 || loading} className={`w-full py-4 rounded-xl text-xl font-bold shadow-lg ${isOnline ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'} text-white`}>
                        {loading ? 'Procesare...' : (isOnline ? '💳 ÎNCASEAZĂ' : '💾 SALVEAZĂ OFFLINE')}
                    </button>
                </div>
            </div>
        </div>
    )
}