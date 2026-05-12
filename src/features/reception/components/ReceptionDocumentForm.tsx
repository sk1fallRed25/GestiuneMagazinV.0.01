import React from 'react';
import { FileText } from 'lucide-react';
import { ReceptionDocument } from '../types';

interface ReceptionDocumentFormProps {
    document: ReceptionDocument;
    setDocument: React.Dispatch<React.SetStateAction<ReceptionDocument>>;
    xmlStatus: string;
}

export const ReceptionDocumentForm = ({ document, setDocument, xmlStatus }: ReceptionDocumentFormProps) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
            <FileText className="text-indigo-500 w-5 h-5" /> Informații Document
        </h3>

        {xmlStatus && (
            <div className={`p-3 rounded-xl border text-xs font-bold ${xmlStatus.includes('❌') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                {xmlStatus}
            </div>
        )}
        
        <div className="space-y-4">
            {document.supplierText && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Furnizor (identificat)</p>
                    <p className="text-sm font-bold text-indigo-900">{document.supplierText}</p>
                    {document.supplierCui && <p className="text-[10px] text-indigo-600">CUI: {document.supplierCui}</p>}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nr. Document / Factură</label>
                    <input
                        type="text"
                        value={document.documentNumber}
                        onChange={(e) => setDocument({ ...document, documentNumber: e.target.value })}
                        placeholder="Ex: 123456"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-bold"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Document</label>
                    <input
                        type="date"
                        value={document.documentDate}
                        onChange={(e) => setDocument({ ...document, documentDate: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-bold"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Observații (Opțional)</label>
                <textarea
                    rows={2}
                    value={document.observations}
                    onChange={(e) => setDocument({ ...document, observations: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                    placeholder="Detalii suplimentare..."
                />
            </div>
        </div>
    </div>
);
