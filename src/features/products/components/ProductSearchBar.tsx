import React from 'react';
import { Search } from 'lucide-react';

interface ProductSearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

const ProductSearchBar = ({ value, onChange }: ProductSearchBarProps) => {
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-3 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <Search className="text-gray-400" size={20} />
            <input
                type="text"
                placeholder="Căutare rapidă după denumire produs sau cod de bare..."
                className="w-full outline-none text-gray-700 font-medium bg-transparent"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};

export default ProductSearchBar;
