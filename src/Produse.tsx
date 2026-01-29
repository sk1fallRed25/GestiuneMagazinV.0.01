import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { Edit, Trash2, TrendingUp } from 'lucide-react';

// --- TIPURI DATE ---
interface Produs {
    id: number;
    nume: string;
    cod_bare: string;
    unitate_masura: string;
    pret_vanzare_fara_tva: number;
    tva_procent: number;
    pret_achizitie: number;
    stoc_depozit: number;
    stoc_magazin: number;
    stoc_minim_depozit: number;
    stoc_minim_magazin: number;
    prag_optim: number;
    furnizor_id: number | null;
    sales_velocity?: number; // NOU: Câmp pentru viteza de vânzare
}
interface Furnizor { id: number; nume_firma: string; }
interface ProduseProps { userRole: string; }

const initialFormData: Omit<Produs, 'id'> = {
    nume: '', cod_bare: '', unitate_masura: 'buc', 
    pret_vanzare_fara_tva: 0, tva_procent: 21,
    pret_achizitie: 0, stoc_depozit: 0, stoc_magazin: 0, 
    stoc_minim_depozit: 5, stoc_minim_magazin: 3, prag_optim: 10, furnizor_id: null
};

export default function Produse({ userRole }: ProduseProps) {
    const [produse, setProduse] = useState<Produs[]>([]);
    const [furnizori, setFurnizori] = useState<Furnizor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Produs | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [pretVanzareFinal, setPretVanzareFinal] = useState(0);

    const fetchProduse = async () => {
        setLoading(true);
        const { data: produseData, error } = await supabase.from('produse').select('*').order('nume', { ascending: true });
        
        if (error) {
            toast.error(error.message);
            setLoading(false);
            return;
        }

        if (produseData && userRole === 'admin') {
            const produseCuViteza = await Promise.all(produseData.map(async (p) => {
                const { data: velocity, error: rpcError } = await supabase.rpc('get_sales_velocity', { p_produs_id: p.id });
                if (rpcError) console.error(`Eroare la calcul viteză pentru ${p.nume}:`, rpcError);
                return { ...p, sales_velocity: velocity || 0 };
            }));
            setProduse(produseCuViteza as Produs[]);
        } else {
            setProduse(produseData as Produs[] || []);
        }
        setLoading(false);
    };

    const fetchFurnizori = async () => {
        const { data } = await supabase.from('furnizori').select('id, nume_firma');
        if (data) setFurnizori(data);
    };

    useEffect(() => {
        fetchProduse();
        if (userRole === 'admin') {
            fetchFurnizori();
        }
    }, [userRole]);

    useEffect(() => {
        const tvaMultiplier = 1 + (formData.tva_procent / 100);
        const pretFaraTVA = pretVanzareFinal > 0 ? pretVanzareFinal / tvaMultiplier : 0;
        setFormData(prev => ({ ...prev, pret_vanzare_fara_tva: pretFaraTVA }));
    }, [pretVanzareFinal, formData.tva_procent]);

    const handleOpenModalForEdit = (produs: Produs) => {
        setEditingProduct(produs);
        const { id, ...rest } = produs;
        setFormData(rest);
        const pretFinal = produs.pret_vanzare_fara_tva * (1 + produs.tva_procent / 100);
        setPretVanzareFinal(pretFinal);
        setIsModalOpen(true);
    };

    const handleOpenModalForNew = () => {
        setEditingProduct(null);
        setFormData(initialFormData);
        setPretVanzareFinal(0);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nume) return toast.error("Numele produsului este obligatoriu!");

        let promise;
        if (editingProduct) {
            promise = supabase.from('produse').update(formData).eq('id', editingProduct.id).then();
        } else {
            promise = supabase.from('produse').insert([formData]).then();
        }

        // @ts-ignore
        toast.promise(promise, {
            loading: `Se ${editingProduct ? 'modifică' : 'salvează'} produsul...`,
            success: () => {
                setIsModalOpen(false);
                fetchProduse();
                return `Produs ${editingProduct ? 'modificat' : 'salvat'}!`;
            },
            error: (err) => `Eroare: ${err.message}`
        });
    };

    const handleDelete = (id: number) => {
        toast((t) => (
            <div className="p-2">
                <p className="mb-2 font-bold">Sigur ștergi acest produs?</p>
                <div className="flex gap-2">
                    <button className="w-full bg-red-600 text-white px-3 py-1 rounded-md text-sm" onClick={() => {
                        const promise = supabase.from('produse').delete().eq('id', id).then();
                        // @ts-ignore
                        toast.promise(promise, {
                            loading: 'Se șterge...',
                            success: () => { fetchProduse(); return 'Produs șters!'; },
                            error: (err) => `Eroare: ${err.message}`
                        });
                        toast.dismiss(t.id);
                    }}>Da, șterge</button>
                    <button className="w-full bg-gray-200 px-3 py-1 rounded-md text-sm" onClick={() => toast.dismiss(t.id)}>Anulează</button>
                </div>
            </div>
        ));
    };

    const isAdmin = userRole === 'admin';

    return (
        <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div><h1 className="text-2xl font-bold">Produse & Stoc</h1><p className="text-sm text-gray-500">{isAdmin ? 'Analiză și predicții stocuri' : 'Gestionează inventarul'}</p></div>
                    {isAdmin && <button onClick={handleOpenModalForNew} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm">+ Produs Nou</button>}
                </div>

                {loading ? <p>Se încarcă...</p> : (
                    <div className="bg-white shadow-md rounded-lg overflow-hidden border">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b"><tr className="text-xs font-semibold text-gray-500 uppercase">
                                <th className="py-3 px-4">Produs</th>
                                <th className="py-3 px-4 text-right">Preț Final</th>
                                {isAdmin ? <>
                                    <th className="py-3 px-4 text-center">Stoc Total</th>
                                    <th className="py-3 px-4 text-center">Vânzări 30z</th>
                                    <th className="py-3 px-4 text-center">Zile Stoc Est.</th>
                                </> : <>
                                    <th className="py-3 px-4 text-center">Stoc Depozit</th>
                                    <th className="py-3 px-4 text-center">Stoc Magazin</th>
                                </>}
                                {isAdmin && <th className="py-3 px-4 text-right">Acțiuni</th>}
                            </tr></thead>
                            <tbody className="divide-y">
                            {produse.map((p) => {
                                const stocTotal = p.stoc_depozit + p.stoc_magazin;
                                const vitezaZilnica = (p.sales_velocity || 0) / 30;
                                const zileStoc = vitezaZilnica > 0 ? Math.floor(stocTotal / vitezaZilnica) : Infinity;
                                return (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium">{p.nume}</td>
                                    <td className="py-3 px-4 text-right font-bold text-blue-600">{(p.pret_vanzare_fara_tva * (1 + p.tva_procent / 100)).toFixed(2)}</td>
                                    {isAdmin ? <>
                                        <td className="py-3 px-4 text-center font-bold text-lg">{stocTotal}</td>
                                        <td className="py-3 px-4 text-center font-semibold text-purple-600 flex items-center justify-center gap-1"><TrendingUp size={14}/> {p.sales_velocity}</td>
                                        <td className="py-3 px-4 text-center"><span className={`font-bold text-lg ${zileStoc <= 7 ? 'text-red-500' : zileStoc <= 14 ? 'text-yellow-600' : 'text-green-600'}`}>{zileStoc === Infinity ? '∞' : zileStoc}</span></td>
                                    </> : <>
                                        <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${p.stoc_depozit <= p.stoc_minim_depozit ? 'bg-yellow-100' : ''}`}>{p.stoc_depozit}</span></td>
                                        <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${p.stoc_magazin <= p.stoc_minim_magazin ? 'bg-red-100' : ''}`}>{p.stoc_magazin}</span></td>
                                    </>}
                                    {isAdmin && <td className="py-3 px-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleOpenModalForEdit(p)} className="p-1"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(p.id)} className="p-1"><Trash2 size={16}/></button>
                                        </div>
                                    </td>}
                                </tr>
                            )})}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Modalul va fi adăugat aici */}
            </div>
        </div>
    )
}