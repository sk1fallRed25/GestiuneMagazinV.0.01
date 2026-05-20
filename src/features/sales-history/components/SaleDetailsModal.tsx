import React from 'react';
import { X, Printer, Package, CreditCard, Banknote, Calendar, User, Hash, AlertTriangle } from 'lucide-react';
import { SaleDetails, SaleSummary } from '../types';
import { SaleStatusBadge } from './SaleStatusBadge';

interface SaleDetailsModalProps {
    sale: SaleDetails | null;
    loading: boolean;
    onClose: () => void;
    onVoidClick?: (sale: SaleSummary | SaleDetails) => void;
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ sale, loading, onClose, onVoidClick }) => {
    if (!sale && !loading) return null;

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
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
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
                                            <th className="p-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {sale.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50">
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
                                                <td className="p-4 text-right font-black text-gray-900">{item.totalItem.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-900 text-white font-black">
                                        <tr>
                                            <td colSpan={3} className="p-5 text-right text-sm uppercase tracking-widest text-gray-400">Total de Plată:</td>
                                            <td className="p-5 text-right text-2xl">{sale.total.toFixed(2)} <span className="text-xs text-gray-400">LEI</span></td>
                                        </tr>
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
