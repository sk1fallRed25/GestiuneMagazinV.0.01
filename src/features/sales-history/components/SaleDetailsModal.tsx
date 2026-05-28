import React from 'react';
import { X, Printer, Package, CreditCard, Banknote, Calendar, User, Hash, AlertTriangle, RefreshCw } from 'lucide-react';
import { SaleDetails, SaleSummary, SaleItemDetails } from '../types';
import { SaleStatusBadge } from './SaleStatusBadge';
import { formatSgrReceiptLabel, summarizeSgr } from '../utils/sgrDisplay';
import { toast, Toaster } from 'react-hot-toast';
import { 
  mapSaleDetailsToFiscalNetPayload, 
  formatFiscalNetReceipt, 
  downloadFiscalNetReceiptFile, 
  parseFiscalNetResponse,
  FiscalNetConfig
} from '../../fiscal-net';

interface ElectronAPI {
    isElectron: boolean;
    writeFiscalNetFile: (args: { bonuriPath: string; filename: string; content: string; raspunsPath?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    readFiscalNetResponse: (args: { raspunsPath: string; filename: string }) => Promise<{ success: boolean; content?: string; error?: string }>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

interface SaleDetailsModalProps {
    sale: SaleDetails | null;
    loading: boolean;
    onClose: () => void;
    onVoidClick?: (sale: SaleSummary | SaleDetails) => void;
    onReturnClick?: (sale: SaleSummary | SaleDetails) => void;
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ sale, loading, onClose, onVoidClick, onReturnClick }) => {
    if (!sale && !loading) return null;

    const [fiscalCode, setFiscalCode] = React.useState<string>('');
    const [exportPreview, setExportPreview] = React.useState<string | null>(null);
    const [responseInput, setResponseInput] = React.useState<string>('');
    const [parsedResponse, setParsedResponse] = React.useState<any | null>(null);

    // Pilot Controlled Config State
    const [config, setConfig] = React.useState<FiscalNetConfig>(() => {
        const saved = localStorage.getItem('fiscalnet-pilot-config');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                // ignore
            }
        }
        return {
            enabled: false,
            bonuriPath: '',
            raspunsPath: '',
            realWriteEnabled: false,
            requireConfirmation: true
        };
    });

    const saveConfig = (newConfig: FiscalNetConfig) => {
        setConfig(newConfig);
        localStorage.setItem('fiscalnet-pilot-config', JSON.stringify(newConfig));
    };

    const isElectronAvailable = typeof window !== 'undefined' && !!window.electronAPI;
    console.log("isElectronAvailable:", isElectronAvailable, "window.electronAPI:", window.electronAPI);

    // Double confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
    const [confirmInput, setConfirmInput] = React.useState('');
    const [writeLoading, setWriteLoading] = React.useState(false);
    const [lastWrittenFile, setLastWrittenFile] = React.useState<string | null>(null);
    const [pilotParsedResponse, setPilotParsedResponse] = React.useState<any | null>(null);

    const handleFiscalNetExportClick = () => {
        if (!sale) return;
        try {
            const payload = mapSaleDetailsToFiscalNetPayload(sale, {
                fiscalCode: fiscalCode.trim() || null
            });
            const text = formatFiscalNetReceipt(payload);
            setExportPreview(text);
            toast.success("Preview FiscalNet generat!");
        } catch (err: any) {
            console.error("Export generation failed:", err);
            toast.error(err.message || "Eroare la generarea formatului.");
        }
    };

    const handleCopyToClipboard = () => {
        if (!exportPreview) return;
        navigator.clipboard.writeText(exportPreview);
        toast.success("Conținut copiat în clipboard!");
    };

    const handleDownloadTxtFile = () => {
        if (!sale || !exportPreview) return;
        downloadFiscalNetReceiptFile(`${sale.id}.txt`, exportPreview);
        toast.success(`Fișierul ${sale.id}.txt a fost descărcat!`);
    };

    const handleParseResponse = () => {
        if (!responseInput.trim()) {
            toast.error("Vă rugăm să introduceți răspunsul FiscalNet.");
            return;
        }
        try {
            const result = parseFiscalNetResponse(responseInput);
            setParsedResponse(result);
            if (result.success) {
                toast.success("Răspuns procesat cu succes!");
            } else {
                toast.error(`Eroare raportată: ${result.errorMessage}`);
            }
        } catch (err: any) {
            toast.error("Eroare la procesarea răspunsului.");
        }
    };

    const handleValidateConfig = () => {
        if (!config.bonuriPath.trim() || !config.raspunsPath.trim()) {
            toast.error("Căile pentru folderele Bonuri și Răspuns nu pot fi goale.");
            return;
        }
        const updated = {
            ...config,
            lastValidatedAt: new Date().toISOString()
        };
        saveConfig(updated);
        toast.success("Configurare validată local!");
    };

    const handleOpenConfirmDialog = () => {
        if (!exportPreview) {
            toast.error("Vă rugăm să generați mai întâi preview-ul bonului.");
            return;
        }
        if (!config.lastValidatedAt) {
            toast.error("Vă rugăm să validați configurarea înainte de scriere.");
            return;
        }
        setConfirmInput('');
        setShowConfirmDialog(true);
    };

    const handleConfirmWrite = async () => {
        console.log("handleConfirmWrite triggered!", "confirmInput:", confirmInput, "isElectronAvailable:", isElectronAvailable);
        if (confirmInput !== 'SCRIE BON FISCALNET') {
            toast.error("Textul de confirmare nu este corect.");
            return;
        }
        if (!sale || !exportPreview) return;

        setWriteLoading(true);
        try {
            const filename = `${sale.id}.txt`;
            
            if (!isElectronAvailable) {
                toast.error("Scrierea directă este disponibilă doar în aplicația desktop.");
                setWriteLoading(false);
                setShowConfirmDialog(false);
                return;
            }

            const result = await window.electronAPI!.writeFiscalNetFile({
                bonuriPath: config.bonuriPath,
                filename,
                content: exportPreview,
                raspunsPath: config.raspunsPath
            });

            if (result.success) {
                toast.success("Fișierul a fost scris cu succes!");
                setLastWrittenFile(filename);
                setShowConfirmDialog(false);
            } else {
                toast.error(result.error || "Eroare la scrierea fișierului.");
            }
        } catch (err: any) {
            console.error("Write failed:", err);
            toast.error(err.message || "Eroare necunoscută la scriere.");
        } finally {
            setWriteLoading(false);
        }
    };

    const handleReadPilotResponse = async () => {
        if (!sale) return;
        const filename = `${sale.id}.txt`;
        
        if (!isElectronAvailable) {
            toast.error("Citirea răspunsului este disponibilă doar în aplicația desktop.");
            return;
        }

        try {
            const result = await window.electronAPI!.readFiscalNetResponse({
                raspunsPath: config.raspunsPath,
                filename
            });

            if (result.success && result.content) {
                const parsed = parseFiscalNetResponse(result.content);
                setPilotParsedResponse(parsed);
                if (parsed.success) {
                    toast.success("Răspuns citit și procesat cu succes!");
                } else {
                    toast.error(`Eroare în răspuns: ${parsed.errorMessage}`);
                }
            } else {
                toast.error(result.error || "Nu s-a putut citi fișierul de răspuns.");
            }
        } catch (err: any) {
            console.error("Read response failed:", err);
            toast.error(err.message || "Eroare la citirea răspunsului.");
        }
    };

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
            <Toaster position="top-right" />
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

                        {/* FiscalNet Manual Export Section */}
                        {sale && (sale.status === 'finalized' || sale.status === 'partially_returned') && (
                            <div className="px-8 pb-12 border-t border-gray-100 pt-6">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">INTEGRARE FISCALNET (MANUAL)</h4>
                                        <p className="text-xs text-gray-400">Generează fișierul de comenzi text în format Caret-separated pentru testarea casei de marcat.</p>
                                    </div>
                                    <button
                                        data-testid="fiscalnet-export-button"
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all duration-155 flex items-center gap-2"
                                        onClick={handleFiscalNetExportClick}
                                    >
                                        <Printer size={14} /> EXPORT FISCALNET
                                    </button>
                                </div>

                                {/* Warning Banner */}
                                <div data-testid="fiscalnet-export-warning" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-800 flex items-start gap-3">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                                    <div>
                                        <span className="font-extrabold uppercase tracking-wide block mb-0.5 text-amber-900">Atenție — Export Manual:</span>
                                        Această acțiune nu emite bon fiscal automat în casa de marcat fizică. Fișierul descărcat trebuie copiat manual în directorul de test <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-bold text-amber-900">FiscalNet\Bonuri</code> pentru simulare.
                                    </div>
                                </div>

                                {/* Optional CIF Input */}
                                <div className="mb-6 max-w-xs">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">CIF / CUI Client (Opțional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: RO12345678"
                                        value={fiscalCode}
                                        onChange={(e) => setFiscalCode(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                    />
                                </div>

                                {/* Preview & Action Panel */}
                                {exportPreview !== null && (
                                    <div className="bg-gray-900 rounded-3xl p-5 text-white font-mono text-xs mb-8 relative border border-gray-800 shadow-inner">
                                        <div className="flex justify-between items-center mb-3 border-b border-gray-850 pb-3 text-[10px] text-gray-400 uppercase tracking-widest font-sans font-bold">
                                            <span data-testid="fiscalnet-download-filename" className="text-gray-300 font-mono font-normal normal-case">{sale.id}.txt</span>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={handleCopyToClipboard}
                                                    className="hover:text-white transition-colors flex items-center gap-1 font-bold text-gray-400"
                                                >
                                                    Copiază conținut
                                                </button>
                                                <span className="text-gray-700">|</span>
                                                <button
                                                    onClick={handleDownloadTxtFile}
                                                    className="hover:text-indigo-300 transition-colors flex items-center gap-1 font-black text-indigo-400"
                                                >
                                                    Descarcă .txt
                                                </button>
                                            </div>
                                        </div>
                                        <pre data-testid="fiscalnet-export-preview" className="overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed font-mono select-all scrollbar-thin text-indigo-100">{exportPreview}</pre>
                                    </div>
                                )}

                                {/* Pilot Section */}
                                {exportPreview !== null && (
                                    <div data-testid="fiscalnet-pilot-section" className="bg-gray-50 border border-gray-250 rounded-2xl p-6 mb-8 text-gray-800">
                                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">6G.FN.2: Pilot Folder Controlat</h5>
                                        
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                                            <span className="text-xs font-bold text-gray-700">Status Runtime:</span>
                                            <span 
                                                data-testid="fiscalnet-runtime-status" 
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                    isElectronAvailable 
                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}
                                            >
                                                {isElectronAvailable ? 'Desktop Bridge Activ (Electron)' : 'Browser Sandbox (Scriere dezactivată)'}
                                            </span>
                                        </div>

                                        {/* Configuration Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Cale Folder Bonuri</label>
                                                <input
                                                    type="text"
                                                    data-testid="fiscalnet-bonuri-path-input"
                                                    placeholder="Ex: C:\PilotFiscal\Bonuri"
                                                    value={config.bonuriPath}
                                                    onChange={(e) => saveConfig({ ...config, bonuriPath: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Cale Folder Răspuns</label>
                                                <input
                                                    type="text"
                                                    data-testid="fiscalnet-raspuns-path-input"
                                                    placeholder="Ex: C:\PilotFiscal\Raspuns"
                                                    value={config.raspunsPath}
                                                    onChange={(e) => saveConfig({ ...config, raspunsPath: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                        </div>

                                        {/* Pilot Toggle */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <input
                                                type="checkbox"
                                                id="fiscalnet-real-write-toggle"
                                                data-testid="fiscalnet-real-write-toggle"
                                                checked={config.realWriteEnabled}
                                                onChange={(e) => saveConfig({ ...config, realWriteEnabled: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <label htmlFor="fiscalnet-real-write-toggle" className="text-xs font-bold text-gray-700 cursor-pointer">
                                                Activez pilotul de scriere locală FiscalNet
                                            </label>
                                        </div>

                                        {/* Warning message */}
                                        {config.realWriteEnabled && (
                                            <div data-testid="fiscalnet-real-write-warning" className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 text-xs text-red-800 flex items-start gap-2.5">
                                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-655" />
                                                <div>
                                                    <span className="font-extrabold uppercase tracking-wide block mb-0.5 text-red-900">Atenție real write:</span>
                                                    Atenție: dacă folderul este cel real monitorizat de FiscalNet, fișierul poate declanșa emiterea bonului fiscal.
                                                </div>
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                data-testid="fiscalnet-validate-config-button"
                                                onClick={handleValidateConfig}
                                                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 rounded-xl text-xs font-extrabold text-gray-600 transition-colors"
                                            >
                                                Validează configurarea
                                            </button>
                                            <button
                                                type="button"
                                                data-testid="fiscalnet-write-real-folder-button"
                                                disabled={
                                                    !config.realWriteEnabled ||
                                                    !config.bonuriPath.trim() ||
                                                    !config.raspunsPath.trim() ||
                                                    !config.lastValidatedAt ||
                                                    !isElectronAvailable ||
                                                    !exportPreview ||
                                                    writeLoading
                                                }
                                                onClick={handleOpenConfirmDialog}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-black transition-all"
                                            >
                                                Scrie fișier în folderul configurat
                                            </button>
                                        </div>

                                        {/* File written indicator & response reader */}
                                        {lastWrittenFile && (
                                            <div className="mt-5 pt-4 border-t border-dashed border-gray-200 flex flex-col gap-3">
                                                <p className="text-xs text-gray-600 font-bold">
                                                    Fișier scris: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">{lastWrittenFile}</code>
                                                </p>
                                                <button
                                                    type="button"
                                                    data-testid="fiscalnet-read-response-button"
                                                    onClick={handleReadPilotResponse}
                                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-colors w-fit"
                                                >
                                                    Citește răspuns pentru acest bon
                                                </button>

                                                {pilotParsedResponse && (
                                                    <div data-testid="fiscalnet-response-file-result" className={`p-4 rounded-xl border text-xs ${
                                                        pilotParsedResponse.success
                                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                                            : 'bg-red-50 border-red-100 text-red-800'
                                                    }`}>
                                                        {pilotParsedResponse.success ? (
                                                            <div>
                                                                <p className="font-bold">BONOK=1 (Tipărit cu succes)</p>
                                                                {pilotParsedResponse.receiptNumber && (
                                                                    <p>Număr bon: <span className="font-mono font-black">{pilotParsedResponse.receiptNumber}</span></p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p className="font-bold">Eroare răspuns (BONOK=0)</p>
                                                                {pilotParsedResponse.errorCode && <p>Cod: {pilotParsedResponse.errorCode}</p>}
                                                                {pilotParsedResponse.errorMessage && <p>Mesaj: {pilotParsedResponse.errorMessage}</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Response Parser Section */}
                                <div className="border-t border-dashed border-gray-200 pt-6">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PARSARE RĂSPUNS FISCALNET</h5>
                                    <p className="text-xs text-gray-400 mb-4">Lipește conținutul fișierului text returnat în folderul <code className="bg-gray-100 px-1 rounded font-mono">Raspuns</code> pentru a valida rezultatul.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <textarea
                                                data-testid="fiscalnet-response-input"
                                                rows={3}
                                                placeholder="Lipește conținutul (de ex: BONOK=1\r\nNUMARBON=1024)"
                                                value={responseInput}
                                                onChange={(e) => setResponseInput(e.target.value)}
                                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono placeholder:text-gray-300"
                                            />
                                            <button
                                                data-testid="fiscalnet-response-parse-button"
                                                onClick={handleParseResponse}
                                                className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-black tracking-wider transition-colors uppercase shadow-sm"
                                            >
                                                PARSEAZĂ RĂSPUNS
                                            </button>
                                        </div>

                                        {parsedResponse && (
                                            <div data-testid="fiscalnet-response-result" className={`p-5 rounded-2xl border text-xs flex flex-col justify-center ${
                                                parsedResponse.success 
                                                    ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                                                    : 'bg-red-50/50 border-red-100 text-red-800'
                                            }`}>
                                                {parsedResponse.success ? (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="font-black text-emerald-950 uppercase tracking-widest text-[10px]">EMIS CU SUCCES</span>
                                                        </div>
                                                        <p className="text-gray-600 mb-1">Bonul fiscal a fost tipărit corect.</p>
                                                        <p className="font-bold text-sm text-emerald-950">Număr Bon Fiscal: <span className="font-mono font-black">{parsedResponse.receiptNumber || 'N/A'}</span></p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                                            <span className="font-black text-red-950 uppercase tracking-widest text-[10px]">ERORI SEMNALATE</span>
                                                        </div>
                                                        <p className="text-gray-600 mb-2">S-a detectat o eroare la generare.</p>
                                                        {parsedResponse.errorCode && <p className="mb-1 text-red-900">Cod eroare: <span className="font-mono font-bold bg-red-100/50 px-1.5 py-0.5 rounded">{parsedResponse.errorCode}</span></p>}
                                                        <p className="font-extrabold text-red-950">Detalii: <span className="font-medium text-red-900">{parsedResponse.errorMessage || 'Eroare necunoscută'}</span></p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
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

            {/* Double Confirmation Dialog */}
            {showConfirmDialog && (
                <div data-testid="fiscalnet-real-write-confirm-dialog" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 text-gray-800">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 uppercase">Confirmare Scriere FiscalNet</h4>
                                <p className="text-xs text-gray-500 mt-1">
                                    Confirm că doresc să scriu fișierul FiscalNet în folderul configurat.
                                    Dacă folderul este monitorizat de FiscalNet, se poate emite bon fiscal real.
                                </p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Tastați textul de confirmare exact:</label>
                            <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-gray-800 select-none w-fit mb-2">
                                SCRIE BON FISCALNET
                            </div>
                            <input
                                type="text"
                                data-testid="fiscalnet-real-write-confirm-input"
                                placeholder="Tastați confirmarea aici..."
                                value={confirmInput}
                                onChange={(e) => setConfirmInput(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                data-testid="fiscalnet-real-write-confirm-cancel-button"
                                onClick={() => setShowConfirmDialog(false)}
                                className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-500 transition-colors"
                            >
                                Anulează
                            </button>
                            <button
                                type="button"
                                data-testid="fiscalnet-real-write-confirm-button"
                                disabled={confirmInput !== 'SCRIE BON FISCALNET' || writeLoading}
                                onClick={handleConfirmWrite}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-black transition-colors"
                            >
                                {writeLoading ? 'Se scrie...' : 'Confirmă și Scrie'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
