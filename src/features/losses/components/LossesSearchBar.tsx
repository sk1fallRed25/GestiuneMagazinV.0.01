import React from 'react';
import { Search, X } from 'lucide-react';

interface LossesSearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export const LossesSearchBar: React.FC<LossesSearchBarProps> = ({ value, onChange }) => {
    return (
        <div className="relative w-full md:w-96 flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                type="text"
                placeholder="Denumire sau Cod Bare..."
                className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition-all text-sm font-semibold"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onChange('');
                }}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-655 transition-colors"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

