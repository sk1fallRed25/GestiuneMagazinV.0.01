import React from 'react';
import { ChevronRight } from 'lucide-react';
import { TransferProduct } from '../types';

interface TransferProductSelectorProps {
    products: TransferProduct[];
    selectedProductId: string;
    onChange: (id: string) => void;
}

export const TransferProductSelector: React.FC<TransferProductSelectorProps> = ({
    products,
    selectedProductId,
    onChange
}) => {
    return (
        <div className="mb-8">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Produsul de transferat
            </label>
            <div className="relative group">
                <select
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-gray-700 transition-all cursor-pointer hover:bg-gray-100"
                    value={selectedProductId}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">-- Selectează din listă --</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.nume}
                        </option>
                    ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" size={20} />
            </div>
        </div>
    );
};
