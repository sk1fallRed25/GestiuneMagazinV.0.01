import React from 'react';
import { FileText, Building2 } from 'lucide-react';
import { ReceptionDocument } from '../types';

interface ReceptionDocumentFormProps {
    document: ReceptionDocument;
    setDocument: React.Dispatch<React.SetStateAction<ReceptionDocument>>;
    xmlStatus: string;
}

export const ReceptionDocumentForm = ({ document, setDocument, xmlStatus }: ReceptionDocumentFormProps) => {
    const isReadOnly = document.status === 'posted' || document.status === 'cancelled';

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                <FileText className="text-indigo-500 w-5 h-5" /> Informații Document
            </h3>

            {xmlStatus && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${xmlStatus.includes('❌') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                    {xmlStatus}
                </div>
            )}
            
            <div className="space-y-4">
                {/* Furnizor Info Group */}
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                        <Building2 size={14} className="text-slate-400" />
                        Date Furnizor
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nume Furnizor</label>
                            <input
                                type="text"
                                data-testid="reception-supplier-select"
                                value={document.supplierText || ''}
                                onChange={(e) => setDocument({ ...document, supplierText: e.target.value })}
                                disabled={isReadOnly}
                                placeholder="Nume Furnizor..."
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-xs font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CUI Furnizor</label>
                            <input
                                type="text"
                                value={document.supplierCui || ''}
                                onChange={(e) => setDocument({ ...document, supplierCui: e.target.value })}
                                disabled={isReadOnly}
                                placeholder="RO12345678"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-xs font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Numere Document / NIR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nr. Document / Factură</label>
                        <input
                            type="text"
                            data-testid="reception-invoice-number-input"
                            value={document.documentNumber}
                            onChange={(e) => setDocument({ ...document, documentNumber: e.target.value })}
                            disabled={isReadOnly}
                            placeholder="Ex: 123456"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Număr NIR (Opțional)</label>
                        <input
                            type="text"
                            value={document.nirNumber || ''}
                            onChange={(e) => setDocument({ ...document, nirNumber: e.target.value })}
                            disabled={isReadOnly}
                            placeholder="Ex: NIR-001"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>
                </div>

                {/* Date Factură / Recepție */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dată Factură</label>
                        <input
                            type="date"
                            data-testid="reception-invoice-date-input"
                            value={document.documentDate}
                            onChange={(e) => setDocument({ ...document, documentDate: e.target.value })}
                            disabled={isReadOnly}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dată Recepție</label>
                        <input
                            type="date"
                            value={document.receptionDate}
                            onChange={(e) => setDocument({ ...document, receptionDate: e.target.value })}
                            disabled={isReadOnly}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>
                </div>

                {/* Observații */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Observații (Opțional)</label>
                    <textarea
                        rows={2}
                        value={document.observations || ''}
                        onChange={(e) => setDocument({ ...document, observations: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                        placeholder="Detalii suplimentare despre recepție..."
                    />
                </div>
            </div>
        </div>
    );
};
