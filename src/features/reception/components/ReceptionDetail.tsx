import React from 'react';
import { FileText, Calendar, Building2, User, ArrowLeft, Send, Edit, Trash2 } from 'lucide-react';

interface ReceptionDetailProps {
    reception: any;
    onBack: () => void;
    onEdit: (id: string) => void;
    onConfirm: (id: string) => void;
    onCancel: (id: string) => void;
    submitting: boolean;
}

export const ReceptionDetail = ({
    reception,
    onBack,
    onEdit,
    onConfirm,
    onCancel,
    submitting
}: ReceptionDetailProps) => {
    if (!reception) return null;

    const displayNir = reception.nir_number ? `NIR: ${reception.nir_number}` : 'Fără NIR';
    const creatorEmail = reception.profiles?.email || 'Sistem';
    const isDraft = reception.status === 'draft';
    const isPosted = reception.status === 'posted';
    const isCancelled = reception.status === 'cancelled';

    return (
        <div data-testid="reception-detail-page" className="space-y-8 animate-fade-in">
            {/* Header / Navigare înapoi */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-all text-sm self-start"
                >
                    <ArrowLeft size={16} /> Înapoi la Istoric
                </button>
                
                {isDraft && (
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => onCancel(reception.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-650 px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] flex items-center gap-1.5"
                        >
                            <Trash2 size={14} /> Anulează Draft
                        </button>
                        <button
                            onClick={() => onEdit(reception.id)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-650 px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] flex items-center gap-1.5"
                        >
                            <Edit size={14} /> Editează Draft
                        </button>
                        <button
                            data-testid="reception-confirm-button"
                            onClick={() => onConfirm(reception.id)}
                            disabled={submitting}
                            className="bg-slate-900 hover:bg-black disabled:bg-slate-350 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] flex items-center gap-1.5 uppercase tracking-wide"
                        >
                            <Send size={14} /> Confirmă Recepția
                        </button>
                    </div>
                )}
            </div>

            {/* Document Info */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Meta-Date Document */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={14} /> Detalii Recepție
                    </h4>
                    <div className="text-slate-800 space-y-1 text-sm font-semibold">
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">Factură/Document:</span>
                            <span>{reception.document_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">NIR:</span>
                            <span>{displayNir}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">Status:</span>
                            <div>
                                {isDraft && (
                                    <span data-testid="reception-status-draft" className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-amber-50 text-amber-600 border border-amber-100">
                                        Draft
                                    </span>
                                )}
                                {isPosted && (
                                    <span data-testid="reception-status-posted" className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-green-50 text-green-600 border border-green-100">
                                        Confirmată
                                    </span>
                                )}
                                {isCancelled && (
                                    <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-rose-50 text-rose-600 border border-rose-100">
                                        Anulată
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date Calendaristice */}
                <div className="space-y-3 border-t md:border-t-0 md:border-x border-slate-100 md:px-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={14} /> Date Calendaristice
                    </h4>
                    <div className="text-slate-800 space-y-1 text-sm font-semibold">
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">Dată Factură:</span>
                            <span>{reception.document_date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">Dată Recepție:</span>
                            <span>{reception.reception_date || reception.document_date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">Operat de:</span>
                            <span className="truncate max-w-[150px] font-normal flex items-center gap-1">
                                <User size={12} className="text-slate-400" />
                                {creatorEmail}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Informații Furnizor */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={14} /> Furnizor
                    </h4>
                    <div className="text-slate-800 space-y-1 text-sm font-semibold">
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">Nume Furnizor:</span>
                            <span className="truncate max-w-[180px]">{reception.supplier_text || 'Nespecificat'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">CUI:</span>
                            <span>{reception.supplier_cui || 'Nespecificat'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 font-normal">Valoare Totală:</span>
                            <span className="font-black text-slate-900 font-mono">{Number(reception.total_value).toFixed(2)} LEI</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Avertisment Read-Only */}
            {!isDraft && (
                <div 
                    data-testid="reception-posted-readonly-warning"
                    className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-2xl flex items-center gap-3"
                >
                    <span data-testid="reception-readonly-badge" className="px-2 py-0.5 bg-amber-600 text-white rounded text-[9px] font-black uppercase">
                        READ-ONLY
                    </span>
                    <span>Recepțiile confirmate nu pot fi editate direct. Creează o corecție de stoc sau o recepție storno.</span>
                </div>
            )}

            {/* Tabel Linii Recepție */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Linii NIR înregistrate ({reception.items?.length || 0})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/20 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                                <th className="p-4 pl-6">Produs</th>
                                <th className="p-4">Categorie / Subcategorie</th>
                                <th className="p-4 text-center">Cantitate</th>
                                <th className="p-4 text-right">Cost Unitar</th>
                                <th className="p-4 text-right">Preț Vânzare</th>
                                <th className="p-4 text-center">TVA</th>
                                <th className="p-4 text-center">Lot / Expirare</th>
                                <th className="p-4 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {reception.items?.map((it: any) => {
                                const prodName = it.products?.name || 'Produs';
                                const prodBarcode = it.products?.barcode || '';
                                const prodUnit = it.products?.unit || 'buc';
                                const categoryObj = it.products?.category;
                                const categoryName = categoryObj?.name || 'Necategorizat';

                                return (
                                    <tr key={it.id} data-testid="reception-detail-item-row" className="hover:bg-slate-55/20 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-slate-800">{prodName}</div>
                                            <div className="text-[10px] font-mono text-slate-400">{prodBarcode}</div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-500">
                                            {categoryName}
                                        </td>
                                        <td className="p-4 text-center font-bold text-slate-700">
                                            {it.quantity} {prodUnit}
                                        </td>
                                        <td className="p-4 text-right font-bold font-mono text-slate-650">
                                            {Number(it.purchase_price).toFixed(4)}
                                        </td>
                                        <td className="p-4 text-right font-black text-green-600">
                                            {it.sale_price_new ? Number(it.sale_price_new).toFixed(2) : '-'}
                                        </td>
                                        <td className="p-4 text-center font-semibold text-slate-500">
                                            {it.vat_percent}%
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col gap-0.5">
                                                {it.batch_number && (
                                                    <span className="inline-block bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded text-[9px] max-w-max mx-auto">
                                                        L: {it.batch_number}
                                                    </span>
                                                )}
                                                {it.expiry_date && (
                                                    <span className="inline-block bg-amber-50 text-amber-600 font-bold px-1.5 py-0.5 rounded text-[9px] max-w-max mx-auto">
                                                        E: {it.expiry_date}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-black font-mono text-slate-900">
                                            {(Number(it.quantity) * Number(it.purchase_price)).toFixed(2)} LEI
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
