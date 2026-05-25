import React from 'react';
import { X, Printer, Package, CreditCard, Banknote, Calendar, User, Hash, AlertTriangle, RefreshCw } from 'lucide-react';
import { SaleDetails, SaleSummary, SaleItemDetails } from '../types';
import { SaleStatusBadge } from './SaleStatusBadge';
import { formatSgrReceiptLabel, summarizeSgr } from '../utils/sgrDisplay';

interface SaleDetailsModalProps {
    sale: SaleDetails | null;
    loading: boolean;
    onClose: () => void;
    onVoidClick?: (sale: SaleSummary | SaleDetails) => void;
    onReturnClick?: (sale: SaleSummary | SaleDetails) => void;
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ sale, loading, onClose, onVoidClick, onReturnClick }) => {
    if (!sale && !loading) return null;

    const getVatSummary = (items: SaleItemDetails[]) => {
        let totalBase = 0;
        let totalVat = 0;
        let hasSnapshot = false;
        let hasFallback = false;
        let missingVatCount = 0;

        const breakdown: Record<string, { rate: number; base: number; vat: number; label: string; isFallback: boolean }> = {};

        items.forEach((item) => {
            if (item.vatGroup) {
                const rate = item.vatRate ?? 0;
                const base = item.totalWithoutVat ?? 0;
                const vat = item.vatAmount ?? 0;

                totalBase += base;
                totalVat += vat;

                if (item.vatSnapshotAvailable) {
                    hasSnapshot = true;
                } else if (item.vatIsFallback) {
                    hasFallback = true;
                }

                const key = `${item.vatGroup}-${rate}`;
                if (!breakdown[key]) {
                    breakdown[key] = {
                        rate,
                        base: 0,
                        vat: 0,
                        label: item.vatGroup,
                        isFallback: !!item.vatIsFallback
                    };
                }
                breakdown[key].base += base;
                breakdown[key].vat += vat;
            } else {
                missingVatCount++;
            }
        });

        return {
            totalBase,
            totalVat,
            hasSnapshot,
            hasFallback,
            missingVatCount,
            breakdownList: Object.values(breakdown)
        };
    };

    const vatSum = sale ? getVatSummary(sale.items) : { totalBase: 0, totalVat: 0, hasSnapshot: false, hasFallback: false, missingVatCount: 0, breakdownList: [] };
    const sgrSummary = sale ? summarizeSgr(sale.items) : { total: 0, count: 0, byType: {} };
    const sgrTotalSum = sgrSummary.total;
    const productsTotal = sale ? Number((sale.total - sgrTotalSum).toFixed(2)) : 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-black text-gray-900">DETALII BON</h3>
                            <SaleStatusBadge status={sale?.status || ''} />
                        </div>
                        <p className="text-xs text-gray-400 font-mono">ID: {sale?.id}</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                        aria-label="Închide detaliile bonului"
                    >
                        <X size={24} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-gray-400">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                        <p className="font-bold uppercase tracking-widest text-xs">Se încarcă detaliile tranzacției...</p>
                    </div>
                ) : sale ? (
                    <div className="flex-1 overflow-y-auto">
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Data și Ora</p>
                                    <p className="text-sm font-black text-gray-700">
                                        {new Date(sale.createdAt).toLocaleString('ro-RO')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Casier</p>
                                    <p className="text-sm font-black text-gray-700">{sale.cashierName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Hash size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Nr. Produse</p>
                                    <p className="text-sm font-black text-gray-700">{sale.items.length} poziții</p>
                                </div>
                            </div>
                        </div>

                        {/* Produse Table */}
                        <div className="px-8 pb-8">
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <tr>
                                            <th className="p-4">Produs</th>
                                            <th className="p-4 text-center">Cant.</th>
                                            <th className="p-4 text-right">Preț Unitar</th>
                                            <th className="p-4 text-center md:text-left">TVA</th>
                                            <th className="p-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {sale.items.map((item) => (
                                            <React.Fragment key={item.id}>
                                                <tr className="hover:bg-gray-50/50">
                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-800">{item.productName}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.barcode}</div>
                                                        {item.batchNumber && (
                                                            <div className="text-[10px] text-indigo-500 mt-1">
                                                                Lot: {item.batchNumber} {item.expiryDate ? `| Exp: ${item.expiryDate}` : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center font-bold text-gray-600">x{item.quantity}</td>
                                                    <td className="p-4 text-right text-gray-500">{item.unitPrice.toFixed(2)}</td>
                                                    <td className="p-4">
                                                        {item.vatGroup ? (
                                                            <div>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                                                                        item.vatIsFallback 
                                                                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                    }`}>
                                                                        {item.vatGroup} — {item.vatRate}%
                                                                    </span>
                                                                    {item.vatIsFallback && (
                                                                        <span className="text-[8px] text-amber-600 font-extrabold uppercase tracking-wider">
                                                                            Estimativ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.vatAmount !== null && item.vatAmount !== undefined && (
                                                                    <div className="text-[9px] text-gray-500 mt-0.5">
                                                                        TVA inclus: <span className="font-bold">{item.vatAmount.toFixed(2)} lei</span>
                                                                    </div>
                                                                )}
                                                                {item.totalWithoutVat !== null && item.totalWithoutVat !== undefined && (
                                                                    <div className="text-[9px] text-gray-400 font-mono">
                                                                        Bază: {item.totalWithoutVat.toFixed(2)} lei
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200 rounded">
                                                                TVA indisponibil
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right font-black text-gray-900">{item.totalItem.toFixed(2)}</td>
                                                </tr>
                                                {item.sgrEnabled && (
                                                    <tr data-testid={`sale-item-sgr-line-${item.id}`} className="bg-emerald-50/20 hover:bg-emerald-50/30 border-t border-dashed border-gray-100">
                                                        <td className="p-3 pl-8">
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-block px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    SGR
                                                                </span>
                                                                <span data-testid={`sale-item-sgr-label-${item.id}`} className="text-xs font-bold text-gray-700">
                                                                    + Garanție {formatSgrReceiptLabel(item.sgrType)} x{item.quantity}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-center text-xs font-bold text-gray-500">x{item.quantity}</td>
                                                        <td className="p-3 text-right text-xs text-gray-500">{(item.sgrDepositAmount ?? 0.50).toFixed(2)}</td>
                                                        <td className="p-3">
                                                            <span data-testid={`sale-item-sgr-vat-${item.id}`} className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-emerald-50 text-emerald-700 border border-emerald-250">
                                                                {item.sgrVatGroup ?? 'D'} — {(item.sgrVatRate ?? 0)}%
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right text-xs font-black text-gray-900 font-mono" data-testid={`sale-item-sgr-amount-${item.id}`}>
                                                            {(item.sgrTotalAmount ?? (item.quantity * 0.50)).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-900 text-white font-black divide-y divide-gray-800">
                                        {/* VAT Breakdown Rows */}
                                        {vatSum.breakdownList.length > 0 && vatSum.breakdownList.map((bg, idx) => (
                                            <tr key={idx} className="text-xs text-gray-400 font-normal">
                                                <td colSpan={4} className="p-3 text-right">
                                                    Grupa {bg.label} ({bg.rate}%){bg.isFallback ? ' [Estimativ]' : ''} — Bază: {bg.base.toFixed(2)} LEI | TVA:
                                                </td>
                                                <td className="p-3 text-right font-mono text-gray-300">
                                                    {bg.vat.toFixed(2)} LEI
                                                </td>
                                            </tr>
                                        ))}

                                        {/* VAT Totals */}
                                        <tr className="text-xs text-gray-400 font-normal">
                                            <td colSpan={4} className="p-3 text-right uppercase tracking-wider">
                                                Bază totală (fără TVA):
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-200">
                                                {vatSum.totalBase.toFixed(2)} LEI
                                            </td>
                                        </tr>
                                        <tr className="text-xs text-gray-400 font-normal">
                                            <td colSpan={4} className="p-3 text-right uppercase tracking-wider">
                                                TVA inclus total:
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-200">
                                                {vatSum.totalVat.toFixed(2)} LEI
                                            </td>
                                        </tr>

                                        {/* SGR Breakdown in VAT list */}
                                        {sgrTotalSum > 0 && (
                                            <>
                                                <tr className="text-xs text-gray-400 font-normal">
                                                    <td colSpan={4} className="p-3 text-right">
                                                        SGR / Grupa D 0%:
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-gray-300">
                                                        {sgrTotalSum.toFixed(2)} LEI
                                                    </td>
                                                </tr>
                                                <tr className="text-xs text-gray-400 font-normal">
                                                    <td colSpan={4} className="p-3 text-right">
                                                        TVA SGR:
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-gray-300">
                                                        0.00 LEI
                                                    </td>
                                                </tr>
                                            </>
                                        )}

                                        {/* Warnings */}
                                        {(vatSum.hasFallback || vatSum.missingVatCount > 0) && (
                                            <tr className="text-[10px] text-amber-400 font-medium bg-gray-950">
                                                <td colSpan={5} className="p-2 text-center">
                                                    {vatSum.missingVatCount > 0 
                                                        ? `Atenție: Bon legacy. Pentru ${vatSum.missingVatCount} poziții datele TVA sunt indisponibile.` 
                                                        : 'Atenție: Datele TVA pentru bon legacy sunt estimate pe baza cotelor curente.'}
                                                </td>
                                            </tr>
                                        )}

                                        {/* Total Pay Row */}
                                        {sgrTotalSum > 0 ? (
                                            <>
                                                <tr className="text-xs text-gray-400 font-normal border-t border-gray-800" data-testid="sale-sgr-summary">
                                                    <td colSpan={4} className="p-3 text-right uppercase tracking-wider">Total produse:</td>
                                                    <td className="p-3 text-right font-mono text-gray-200" data-testid="sale-products-total">{productsTotal.toFixed(2)} LEI</td>
                                                </tr>
                                                <tr className="text-xs text-gray-400 font-normal">
                                                    <td colSpan={4} className="p-3 text-right uppercase tracking-wider">Total garanții SGR:</td>
                                                    <td className="p-3 text-right font-mono text-gray-200" data-testid="sale-sgr-total">{sgrTotalSum.toFixed(2)} LEI</td>
                                                </tr>
                                                <tr className="bg-gray-950">
                                                    <td colSpan={4} className="p-5 text-right text-sm uppercase tracking-widest text-gray-400">Total de Plată:</td>
                                                    <td className="p-5 text-right text-2xl text-emerald-400 font-mono" data-testid="sale-grand-total">{sale.total.toFixed(2)} <span className="text-xs text-gray-400">LEI</span></td>
                                                </tr>
                                            </>
                                        ) : (
                                            <>
                                                <tr className="text-xs text-gray-400 font-normal border-t border-gray-800">
                                                    <td colSpan={4} className="p-3 text-right uppercase tracking-wider">Total produse:</td>
                                                    <td className="p-3 text-right font-mono text-gray-200" data-testid="sale-products-total">{sale.total.toFixed(2)} LEI</td>
                                                </tr>
                                                <tr className="bg-gray-950">
                                                    <td colSpan={4} className="p-5 text-right text-sm uppercase tracking-widest text-gray-400">Total de Plată:</td>
                                                    <td className="p-5 text-right text-2xl text-emerald-400 font-mono" data-testid="sale-grand-total">{sale.total.toFixed(2)} <span className="text-xs text-gray-400">LEI</span></td>
                                                </tr>
                                            </>
                                        )}
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Plăți */}
                        <div className="px-8 pb-12">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">DETALII PLĂȚI</h4>
                            <div className="flex flex-wrap gap-4">
                                {sale.payments.map((p) => (
                                    <div key={p.id} className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 flex items-center gap-3">
                                        {p.method === 'card' ? <CreditCard size={16} className="text-blue-500" /> : <Banknote size={16} className="text-emerald-500" />}
                                        <div className="font-bold text-sm text-gray-700 uppercase">{p.method}</div>
                                        <div className="font-black text-lg text-gray-900 ml-2">{p.amount.toFixed(2)} <span className="text-[10px] font-normal text-gray-400">LEI</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between gap-4">
                    <button 
                        className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                        onClick={() => alert("Retipărirea bonului va fi implementată separat.")}
                    >
                        <Printer size={18} /> RETIPĂREȘTE BON
                    </button>
                    {sale && sale.status === 'finalized' && onVoidClick && (
                        <button 
                            className="flex-1 py-3 bg-red-50 hover:bg-red-100 border border-red-250 text-red-700 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
                            onClick={() => onVoidClick(sale)}
                        >
                            <AlertTriangle size={18} /> ANULEAZĂ BON
                        </button>
                    )}
                    {sale && (sale.status === 'finalized' || sale.status === 'partially_returned') && onReturnClick && (
                        <button 
                            className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
                            onClick={() => onReturnClick(sale)}
                        >
                            <RefreshCw size={18} /> RETUR PRODUSE
                        </button>
                    )}
                    <button 
                        className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                        onClick={onClose}
                    >
                        ÎNCHIDE
                    </button>
                </div>
            </div>
        </div>
    );
};
