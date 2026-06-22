import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface PosSearchBarProps {
    query: string;
    onQueryChange: (q: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    isScannerReady?: boolean;
}

export const PosSearchBar = forwardRef<HTMLInputElement, PosSearchBarProps>(
    ({ query, onQueryChange, onKeyDown, isScannerReady = false }, ref) => {
        return (
            <div className="flex flex-col gap-2 mb-6" data-testid="pos-scan-area">
                <div className="flex items-center justify-between min-h-[28px]">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Căutare rapidă / Scanare
                    </span>
                    {/* Scanner Ready Indicator */}
                    {isScannerReady && (
                        <div 
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg animate-pulse"
                            data-testid="pos-scan-status-badge"
                        >
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span className="text-[10px] font-black uppercase tracking-wider">Scanner Pregătit</span>
                        </div>
                    )}
                </div>
                <div className="relative">
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
                        className={`w-full pl-12 pr-12 py-4 border-2 rounded-xl text-xl outline-none transition-all shadow-sm ${
                            isScannerReady
                                ? 'border-emerald-400 ring-4 ring-emerald-500/15 shadow-emerald-100'
                                : 'border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                        }`}
                        value={query}
                        onChange={e => onQueryChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        autoFocus
                        data-testid="pos-scan-input"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                onQueryChange('');
                                if (ref && 'current' in ref) {
                                    ref.current?.focus();
                                }
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>
        );
    }
);

PosSearchBar.displayName = 'PosSearchBar';
