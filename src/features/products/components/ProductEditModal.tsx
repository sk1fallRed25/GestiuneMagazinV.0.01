import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Product, ProductUpdateInput } from '../types';

interface ProductEditModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (productId: number, data: ProductUpdateInput) => Promise<void>;
}

const ProductEditModal = ({ product, isOpen, onClose, onSubmit }: ProductEditModalProps) => {
    const [formData, setFormData] = useState<Product | null>(null);

    useEffect(() => {
        if (product) {
            setFormData({ ...product });
        }
    }, [product]);

    if (!isOpen || !formData) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            const { id, ...updateData } = formData;
            await onSubmit(id, updateData);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Parametri Produs</h2>
                        <p className="text-slate-400 text-xs mt-1">ID Unic: {formData.id}</p>
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
                            value={formData.nume}
                            onChange={e => setFormData({ ...formData, nume: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Preț Unitar</label>
                            <input
                                type="number" step="0.01"
                                className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold"
                                value={formData.pret_vanzare}
                                onChange={e => setFormData({ ...formData, pret_vanzare: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">U.M.</label>
                            <input
                                className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-center"
                                value={formData.um}
                                onChange={e => setFormData({ ...formData, um: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl grid grid-cols-2 gap-6 border border-slate-100">
                        <div>
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Stoc Depozit</label>
                            <input
                                type="number"
                                className="w-full border border-indigo-100 p-4 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-indigo-600 shadow-sm"
                                value={formData.stoc_depozit}
                                onChange={e => setFormData({ ...formData, stoc_depozit: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Stoc Magazin</label>
                            <input
                                type="number"
                                className="w-full border border-purple-100 p-4 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/10 font-bold text-purple-600 shadow-sm"
                                value={formData.stoc_magazin}
                                onChange={e => setFormData({ ...formData, stoc_magazin: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl mt-4 hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex justify-center items-center gap-3 text-sm uppercase tracking-widest">
                        <Save size={20} /> Validare Modificări
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProductEditModal;
