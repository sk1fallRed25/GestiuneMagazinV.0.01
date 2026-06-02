import React from 'react';
import { AiProductInsight } from '../types';
import { Package, Calendar, AlertOctagon, HelpCircle } from 'lucide-react';

interface AiProductInsightTableProps {
    title: string;
    products: AiProductInsight[];
    type: 'low-stock' | 'expiry' | 'dead-stock' | 'top-selling';
    emptyMessage: string;
    testId?: string;
    isSidebar?: boolean;
}

export const AiProductInsightTable: React.FC<AiProductInsightTableProps> = ({
    title,
    products,
    type,
    emptyMessage,
    testId,
    isSidebar = false
}) => {
    // Expirary Risk Badge Helper
    const renderExpiryBadge = (risk: AiProductInsight['expiryRisk']) => {
        const config = {
            expired: 'bg-red-50 text-red-700 border-red-200',
            critical: 'bg-orange-50 text-orange-700 border-orange-200',
            warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            none: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
        const labels = {
            expired: 'Expirat',
            critical: 'Critic',
            warning: 'Atenție',
            none: 'OK'
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${config[risk]}`}>
                {labels[risk]}
            </span>
        );
    };

    // Stock Badge Helper
    const renderStockBadge = (stockTotal: number) => {
        if (stockTotal === 0) {
            return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider bg-red-50 text-red-600 border-red-200">
                    Stoc zero
                </span>
            );
        }
        if (stockTotal <= 5) {
            return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider bg-orange-50 text-orange-600 border-orange-200">
                    Stoc scăzut
                </span>
            );
        }
        return (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider bg-emerald-50 text-emerald-600 border-emerald-200">
                În stoc
            </span>
        );
    };

    if (products.length === 0) {
        return (
            <div data-testid={testId} className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-sm">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                    <Package size={20} />
                </div>
                <h3 className="text-sm font-bold text-slate-700">{title}</h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div data-testid={testId} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-800 tracking-tight">{title}</h3>
                <span className="px-2.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-black rounded-lg border border-slate-100">
                    {products.length} repere
                </span>
            </div>

            {isSidebar ? (
                <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                    {products.map((p) => (
                        <div key={p.productId} className="p-4 hover:bg-slate-50/30 transition-colors flex items-center justify-between gap-4 text-xs">
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-800 text-sm truncate" title={p.name}>
                                    {p.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">
                                        {p.barcode}
                                    </span>
                                    {type === 'expiry' && p.expiryRisk !== 'none' && renderExpiryBadge(p.expiryRisk)}
                                    {type === 'low-stock' && renderStockBadge(p.stockTotal)}
                                    {type === 'dead-stock' && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded font-black uppercase tracking-wider">
                                            {p.stockValueEstimate.toFixed(0)} lei blocat
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="font-black text-slate-800 text-sm">
                                    {p.stockTotal} <span className="text-slate-400 font-bold">{p.unit}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                    {p.stockMagazin}M / {p.stockDepozit}D
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Desktop & Laptop View (hidden on mobile) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="py-4 px-6">Produs</th>
                                    <th className="py-4 px-6 text-center">Stoc Total</th>
                                    <th className="py-4 px-6 text-center">Magazin / Depozit</th>
                                    <th className="py-4 px-6 text-right">Preț Vânzare</th>
                                    
                                    {type === 'top-selling' && (
                                        <>
                                            <th className="py-4 px-6 text-center">Cantitate 30z</th>
                                            <th className="py-4 px-6 text-right">Valoare 30z</th>
                                            <th className="py-4 px-6 text-right">Ultima Vânzare</th>
                                        </>
                                    )}
                                    
                                    {type === 'low-stock' && (
                                        <>
                                            <th className="py-4 px-6 text-center">Status Stoc</th>
                                            <th className="py-4 px-6 text-right">Valoare Est.</th>
                                        </>
                                    )}
                                    
                                    {type === 'expiry' && (
                                        <>
                                            <th className="py-4 px-6 text-center">Risc Expirare</th>
                                            <th className="py-4 px-6 text-right">Valoare Est.</th>
                                        </>
                                    )}
                                    
                                    {type === 'dead-stock' && (
                                        <>
                                            <th className="py-4 px-6 text-right">Ultima Vânzare</th>
                                            <th className="py-4 px-6 text-right">Valoare Blocată</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {products.map((p) => (
                                    <tr key={p.productId} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-slate-800 text-sm max-w-[200px] truncate" title={p.name}>
                                                {p.name}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 font-mono tracking-wider mt-0.5">
                                                {p.barcode}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center font-black text-slate-800">
                                            {p.stockTotal} <span className="text-slate-400 font-bold">{p.unit}</span>
                                        </td>
                                        <td className="py-4 px-6 text-center font-semibold text-slate-500">
                                            {p.stockMagazin}M / {p.stockDepozit}D
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-800">
                                            {p.priceSale.toFixed(2)} lei
                                        </td>
                                        
                                        {type === 'top-selling' && (
                                            <>
                                                <td className="py-4 px-6 text-center font-black text-emerald-600">
                                                    {p.soldQuantity30d} {p.unit}
                                                </td>
                                                <td className="py-4 px-6 text-right font-black text-slate-800">
                                                    {p.soldValue30d.toFixed(2)} lei
                                                </td>
                                                <td className="py-4 px-6 text-right font-semibold text-slate-500 font-mono">
                                                    {p.lastSaleAt ? new Date(p.lastSaleAt).toLocaleDateString('ro-RO') : 'N/A'}
                                                </td>
                                            </>
                                        )}
                                        
                                        {type === 'low-stock' && (
                                            <>
                                                <td className="py-4 px-6 text-center">
                                                    {renderStockBadge(p.stockTotal)}
                                                </td>
                                                <td className="py-4 px-6 text-right font-black text-slate-700">
                                                    {p.stockValueEstimate.toFixed(2)} lei
                                                </td>
                                            </>
                                        )}
                                        
                                        {type === 'expiry' && (
                                            <>
                                                <td className="py-4 px-6 text-center">
                                                    {renderExpiryBadge(p.expiryRisk)}
                                                </td>
                                                <td className="py-4 px-6 text-right font-black text-slate-700">
                                                    {p.stockValueEstimate.toFixed(2)} lei
                                                </td>
                                            </>
                                        )}
                                        
                                        {type === 'dead-stock' && (
                                            <>
                                                <td className="py-4 px-6 text-right font-semibold text-slate-500 font-mono">
                                                    {p.lastSaleAt ? new Date(p.lastSaleAt).toLocaleDateString('ro-RO') : 'NICIODATĂ'}
                                                </td>
                                                <td className="py-4 px-6 text-right font-black text-red-600">
                                                    {p.stockValueEstimate.toFixed(2)} lei
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View (stacked cards) */}
                    <div className="block md:hidden divide-y divide-slate-50">
                        {products.map((p) => (
                            <div key={p.productId} className="p-5 hover:bg-slate-50/20 transition-colors">
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm leading-snug">{p.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-wider mt-0.5">
                                            {p.barcode}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        {type === 'low-stock' && renderStockBadge(p.stockTotal)}
                                        {type === 'expiry' && renderExpiryBadge(p.expiryRisk)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs mt-3">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Stoc Curent</p>
                                        <p className="font-black text-slate-800 mt-0.5">
                                            {p.stockTotal} {p.unit} <span className="text-[10px] font-semibold text-slate-400">({p.stockMagazin}M/{p.stockDepozit}D)</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Preț Vânzare</p>
                                        <p className="font-bold text-slate-800 mt-0.5">{p.priceSale.toFixed(2)} lei</p>
                                    </div>

                                    {type === 'top-selling' && (
                                        <>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cantitate Vândută</p>
                                                <p className="font-black text-emerald-600 mt-0.5">{p.soldQuantity30d} {p.unit}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Venit 30z</p>
                                                <p className="font-black text-slate-800 mt-0.5">{p.soldValue30d.toFixed(2)} lei</p>
                                            </div>
                                        </>
                                    )}

                                    {type === 'dead-stock' && (
                                        <>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ultima Vânzare</p>
                                                <p className="font-semibold text-slate-600 mt-0.5 font-mono">
                                                    {p.lastSaleAt ? new Date(p.lastSaleAt).toLocaleDateString('ro-RO') : 'NICIODATĂ'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Valoare Blocată</p>
                                                <p className="font-black text-red-600 mt-0.5">{p.stockValueEstimate.toFixed(2)} lei</p>
                                            </div>
                                        </>
                                    )}

                                    {(type === 'low-stock' || type === 'expiry') && (
                                        <>
                                            <div className="col-span-2">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Valoare Estimată Stoc</p>
                                                <p className="font-black text-slate-800 mt-0.5">{p.stockValueEstimate.toFixed(2)} lei</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
