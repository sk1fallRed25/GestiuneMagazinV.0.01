import React, { forwardRef } from 'react';
import { Search } from 'lucide-react';

interface PosSearchBarProps {
    query: string;
    onQueryChange: (q: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    isScannerReady?: boolean;
}

export const PosSearchBar = forwardRef<HTMLInputElement, PosSearchBarProps>(
    ({ query, onQueryChange, onKeyDown, isScannerReady = false }, ref) => {
        return (
            <div className="relative mb-6">
                <Search 
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                        isScannerReady ? 'text-emerald-500' : 'text-gray-400'
                    }`} 
                    size={24} 
                />
                <input
                    ref={ref}
                    type="text"
                    placeholder="Caută produs (nume sau cod)..."
                    className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl text-xl outline-none transition-all shadow-sm ${
                        isScannerReady
                            ? 'border-emerald-400 ring-4 ring-emerald-500/15 shadow-emerald-100'
                            : 'border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                    }`}
                    value={query}
                    onChange={e => onQueryChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoFocus
                    data-testid="pos-barcode-input"
                />
                {/* Scanner Ready Indicator */}
                {isScannerReady && (
                    <div 
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-600 animate-pulse"
                        data-testid="pos-scanner-ready-badge"
                    >
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-300"></span>
                        <span className="text-xs font-bold uppercase tracking-wider">Scanner Pregătit</span>
                    </div>
                )}
            </div>
        );
    }
);

PosSearchBar.displayName = 'PosSearchBar';
