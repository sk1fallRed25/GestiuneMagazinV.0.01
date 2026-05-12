import React from 'react';
import { Search } from 'lucide-react';

interface LossesSearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export const LossesSearchBar: React.FC<LossesSearchBarProps> = ({ value, onChange }) => {
    return (
        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                type="text"
                placeholder="Denumire sau Cod Bare..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition-all"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};
