import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';

interface Furnizor { id: number; nume_firma: string; }
interface Agent { id: number; nume: string; }
interface Produs { id: number; nume: string; }
interface LinieComanda { produs_id: number; nume: string; cantitate: number; }

export default function ComandaFurnizor() {
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [agenti, setAgenti] = useState<Agent[]>([]);
    const [produseAgent, setProduseAgent] = useState<Produs[]>([]);
    
    const [selectedFurnizor, setSelectedFurnizor] = useState<string>('');
    const [selectedAgent, setSelectedAgent] = useState<string>('');
    
    const [comanda, setComanda] = useState<LinieComanda[]>([]);
    const [observatii, setObservatii] = useState('');
    const [dataLivrare, setDataLivrare] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFurnizori = async () => {
            const { data, error } = await supabase.from('furnizori').select('id, nume_firma').order('nume_firma');
            if (error) toast.error(error.message);
            else setFurnizori(data || []);
        };
        fetchFurnizori();
    }, []);

    useEffect(() => {
        if (!selectedFurnizor) {
            setAgenti([]);
            setSelectedAgent('');
            return;
        }
        const fetchAgenti = async () => {
            const { data, error } = await supabase.from('agenti').select('id, nume').eq('furnizor_id', selectedFurnizor).order('nume');
            if (error) toast.error(error.message);
            else setAgenti(data || []);
        };
        fetchAgenti();
    }, [selectedFurnizor]);

    useEffect(() => {
        if (!selectedAgent) {
            setProduseAgent([]);
            return;
        }
        const fetchProduse = async () => {
            const { data: relatii, error: errRel } = await supabase.from('agent_produse').select('produs_id').eq('agent_id', selectedAgent);
            if (errRel) { toast.error(errRel.message); return; }
            
            const ids = relatii.map(r => r.produs_id);
            if (ids.length > 0) {
                const { data, error } = await supabase.from('produse').select('id, nume').in('id', ids).order('nume');
                if (error) toast.error(error.message);
                else setProduseAgent(data || []);
            } else {
                setProduseAgent([]);
            }
        };
        fetchProduse();
    }, [selectedAgent]);

    const handleAddProdus = (produs: Produs) => {
        const cantitate = parseInt(prompt(`Cantitate pentru "${produs.nume}":`, '1') || '0');
        if (cantitate > 0) {
            setComanda(prev => [...prev, { produs_id: produs.id, nume: produs.nume, cantitate }]);
        }
    };

    const handleRemoveProdus = (produs_id: number) => {
        setComanda(prev => prev.filter(p => p.produs_id !== produs_id));
    };

    const handleTrimiteComanda = async () => {
        if (!selectedFurnizor || !selectedAgent) return toast.error('Selectează un furnizor și un agent.');
        if (comanda.length === 0) return toast.error('Adaugă cel puțin un produs în comandă.');

        const comenziDeTrimis = comanda.map(linie => ({
            furnizor_id: parseInt(selectedFurnizor),
            agent_id: parseInt(selectedAgent),
            produs_id: linie.produs_id,
            cantitate: linie.cantitate,
            observatii: observatii,
            data_livrare_estimata: dataLivrare || null,
            status: 'pending'
        }));

        const promise = supabase.from('comenzi_catre_furnizor').insert(comenziDeTrimis).then();
        // @ts-ignore
        toast.promise(promise, {
            loading: 'Se trimite comanda...',
            success: () => {
                setComanda([]); setObservatii(''); setDataLivrare(''); setSelectedAgent(''); setSelectedFurnizor('');
                return 'Comanda a fost trimisă cu succes!';
            },
            error: (err) => `Eroare: ${err.message}`
        });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Comandă Către Furnizor</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">1. Selectează Furnizorul</label>
                                <select value={selectedFurnizor} onChange={e => setSelectedFurnizor(e.target.value)} className="w-full border p-2 rounded-lg bg-white">
                                    <option value="">-- Alege un furnizor --</option>
                                    {furnizori.map(f => <option key={f.id} value={f.id}>{f.nume_firma}</option>)}
                                </select>
                            </div>
                            {selectedFurnizor && <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">2. Selectează Agentul</label>
                                <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="w-full border p-2 rounded-lg bg-white" disabled={agenti.length === 0}>
                                    <option value="">-- Alege un agent --</option>
                                    {agenti.map(a => <option key={a.id} value={a.id}>{a.nume}</option>)}
                                </select>
                            </div>}
                        </div>

                        {selectedAgent && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border">
                                <h2 className="text-lg font-bold text-gray-800 mb-4">3. Adaugă Produse în Comandă</h2>
                                <div className="max-h-96 overflow-y-auto space-y-2">
                                    {produseAgent.length > 0 ? produseAgent.map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <span className="font-medium">{p.nume}</span>
                                            <button onClick={() => handleAddProdus(p)} className="bg-blue-500 text-white px-3 py-1 text-xs font-bold rounded-md hover:bg-blue-600">Adaugă</button>
                                        </div>
                                    )) : <p className="text-center text-gray-500 py-4">Niciun produs găsit pentru acest agent.</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">4. Finalizează Comanda</h2>
                        {comanda.length === 0 ? <p className="text-center text-gray-500 mt-10">Comanda este goală.</p> :
                        (<div className="space-y-4">
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {comanda.map(item => (
                                    <div key={item.produs_id} className="flex justify-between items-center text-sm p-2 bg-gray-100 rounded">
                                        <span>{item.nume} x <strong>{item.cantitate}</strong></span>
                                        <button onClick={() => handleRemoveProdus(item.produs_id)} className="text-red-500">✕</button>
                                    </div>
                                ))}
                            </div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Observații</label><textarea value={observatii} onChange={e => setObservatii(e.target.value)} className="w-full border rounded-lg p-2 text-sm" rows={2}></textarea></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Data livrării</label><input type="date" value={dataLivrare} onChange={e => setDataLivrare(e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                            <button onClick={handleTrimiteComanda} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">Trimite Comanda</button>
                        </div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}