import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Product, ProductUpdateInput } from '../types';
import toast from 'react-hot-toast';

interface ProductEditModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (productId: string, data: ProductUpdateInput) => Promise<void>;
}

const ProductEditModal = ({ product, isOpen, onClose, onSubmit }: ProductEditModalProps) => {
    // Folosim un state local pentru a gestiona valorile ca string pentru a permite editarea fluidă (ex: ștergerea unui caracter)
    const [localState, setLocalState] = useState({
        nume: '',
        cod_bare: '',
        pret_vanzare: '0',
        pret_achizitie: '0',
        um: '',
        stoc_depozit: '0',
        stoc_magazin: '0'
    });

    useEffect(() => {
        if (product) {
            setLocalState({
                nume: product.nume || '',
                cod_bare: product.cod_bare || '',
                pret_vanzare: (product.pret_vanzare || 0).toString(),
                pret_achizitie: (product.pret_achizitie || 0).toString(),
                um: product.um || '',
                stoc_depozit: (product.stoc_depozit || 0).toString(),
                stoc_magazin: (product.stoc_magazin || 0).toString()
            });
        }
    }, [product]);

    if (!isOpen || !product) return null;

    const handleNumberChange = (field: string, value: string) => {
        // Permitem doar cifre și un singur punct zecimal
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setLocalState(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Conversie și validare finală
        const pret_vanzare = parseFloat(localState.pret_vanzare) || 0;
        const pret_achizitie = parseFloat(localState.pret_achizitie) || 0;
        const stoc_depozit = parseFloat(localState.stoc_depozit) || 0;
        const stoc_magazin = parseFloat(localState.stoc_magazin) || 0;

        if (pret_vanzare < 0 || pret_achizitie < 0 || stoc_depozit < 0 || stoc_magazin < 0) {
            toast.error("Prețurile și stocurile nu pot fi negative.");
            return;
        }

        const updateData: ProductUpdateInput = {
            nume: localState.nume,
            cod_bare: localState.cod_bare,
            pret_vanzare,
            pret_achizitie,
            um: localState.um,
            stoc_depozit,
            stoc_magazin
        };

        try {
            await onSubmit(product.id, updateData);
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Eroare la actualizarea produsului.";
            toast.error(message);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Parametri Produs</h2>
                        <p className="text-slate-400 text-[10px] mt-1 font-mono">UUID: {product.id}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Denumire Nomenclator</label>
                        <input
                            className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                            value={localState.nume}
                            onChange={e => setLocalState({ ...localState, nume: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cod de Bare</label>
                        <input
                            className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-600"
                            value={localState.cod_bare}
                            onChange={e => setLocalState({ ...localState, cod_bare: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Preț Vânzare</label>
                            <input
                                type="text"
                                className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold"
                                value={localState.pret_vanzare}
                                onChange={e => handleNumberChange('pret_vanzare', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Preț Achiziție</label>
                            <input
                                type="text"
                                className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold"
                                value={localState.pret_achizitie}
                                onChange={e => handleNumberChange('pret_achizitie', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Unitate de Măsură (U.M.)</label>
                        <input
                            className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                            value={localState.um}
                            onChange={e => setLocalState({ ...localState, um: e.target.value })}
                            required
                        />
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl grid grid-cols-2 gap-6 border border-slate-100">
                        <div>
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Stoc Depozit</label>
                            <input
                                type="text"
                                className="w-full border border-indigo-100 p-4 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-indigo-600 shadow-sm"
                                value={localState.stoc_depozit}
                                onChange={e => handleNumberChange('stoc_depozit', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Stoc Magazin</label>
                            <input
                                type="text"
                                className="w-full border border-purple-100 p-4 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/10 font-bold text-purple-600 shadow-sm"
                                value={localState.stoc_magazin}
                                onChange={e => handleNumberChange('stoc_magazin', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl mt-4 hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex justify-center items-center gap-3 text-sm uppercase tracking-widest">
                        <Save size={20} /> Actualizare Nomenclator
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProductEditModal;
