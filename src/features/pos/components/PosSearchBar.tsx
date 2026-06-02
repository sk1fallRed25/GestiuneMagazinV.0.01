import React, { forwardRef } from 'react';
import { Search } from 'lucide-react';

interface PosSearchBarProps {
    query: string;
    onQueryChange: (q: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const PosSearchBar = forwardRef<HTMLInputElement, PosSearchBarProps>(
    ({ query, onQueryChange, onKeyDown }, ref) => {
        return (
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                <input
                    ref={ref}
                    type="text"
                    placeholder="Caută produs (nume sau cod)..."
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-xl text-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    value={query}
                    onChange={e => onQueryChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoFocus
                    data-testid="pos-barcode-input"
                />
            </div>
        );
    }
);

PosSearchBar.displayName = 'PosSearchBar';
