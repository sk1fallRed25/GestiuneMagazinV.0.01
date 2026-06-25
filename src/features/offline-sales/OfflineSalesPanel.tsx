import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowLeft, Eye, Trash2, RefreshCw, AlertTriangle, 
    CheckCircle2, Clock, ShieldAlert, BadgeInfo, Store
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../auth/useAuth';
import { useNetworkStatus } from '../../shared/network/useNetworkStatus';
import { supabase } from '../../shared/supabase/supabaseClient';

interface OfflineSale {
    local_sale_id: string;
    store_id: string;
    device_fingerprint: string;
    shift_id: string | null;
    cashier_profile_id: string;
    created_at_local: string;
    updated_at_local: string;
    status: 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict' | 'cancelled';
    cart_items_json: string;
    payments_json: string;
    totals_json: string;
    sgr_totals_json: string | null;
    vat_breakdown_json: string | null;
    payload_hash: string;
    sync_attempts: number;
    last_error: string | null;
    synced_sale_id: string | null;
    fiscal_status: 'not_allowed_offline' | 'pending_after_sync' | 'fiscalized' | 'fiscal_failed';
}

export const OfflineSalesPanel: React.FC = () => {
    const { currentStoreId, role } = useAuth();
    const { isOnline } = useNetworkStatus();
    
    const [sales, setSales] = useState<OfflineSale[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ queuedCount: 0, queuedTotal: 0, lastSale: null as any });
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    
    // Details Modal State
    const [selectedSale, setSelectedSale] = useState<OfflineSale | null>(null);

    const isAuthorizedToCancel = role === 'admin' || role === 'platform_owner' || role === 'manager';

    const loadData = useCallback(async () => {
        if (!currentStoreId || !window.electronAPI?.sqlite) return;
        
        setLoading(true);
        try {
            const list = await window.electronAPI.sqlite.listOfflineSales({ storeId: currentStoreId });
            setSales(list);
            
            const stats = await window.electronAPI.sqlite.getOfflineSalesSummary({ storeId: currentStoreId });
            setSummary(stats);
        } catch (e: any) {
            console.error('[OfflineSalesPanel] Failed to load offline sales:', e);
            toast.error('Eroare la încărcarea vânzărilor offline.');
        } finally {
            setLoading(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCancelLocal = async (localSaleId: string) => {
        if (!isAuthorizedToCancel) {
            toast.error('Nu ai permisiuni suficiente pentru a anula această vânzare.');
            return;
        }

        if (!window.confirm('Sigur vrei să anulezi local această vânzare offline din coada de așteptare?')) {
            return;
        }

        if (!window.electronAPI?.sqlite) {
            toast.error('API-ul SQLite local nu este disponibil.');
            return;
        }

        try {
            const res = await window.electronAPI.sqlite.updateOfflineSaleStatus({
                localSaleId,
                status: 'cancelled',
                errorMsg: 'Anulată manual de administrator.'
            });

            if (res && res.success) {
                toast.success('Vânzarea offline a fost anulată local.');
                await loadData();
            } else {
                throw new Error(res?.error || 'Eroare la anularea vânzării.');
            }
        } catch (e: any) {
            console.error('[OfflineSalesPanel] Failed to cancel offline sale:', e);
            toast.error(`Eroare: ${e.message}`);
        }
    };

    const handleSyncNow = async () => {
        if (isSyncing) return;
        if (!window.electronAPI?.sqlite) {
            toast.error('API-ul SQLite local nu este disponibil.');
            return;
        }
        if (!isOnline) {
            toast.error('Nu te poți sincroniza cât timp ești offline.');
            return;
        }

        const queuedSales = sales.filter(s => s.status === 'queued' || s.status === 'failed');
        if (queuedSales.length === 0) {
            toast.error('Nu există vânzări în așteptare pentru sincronizare.');
            return;
        }

        setIsSyncing(true);
        setSyncProgress({ current: 0, total: queuedSales.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < queuedSales.length; i++) {
            const sale = queuedSales[i];
            
            try {
                // Update local state and sqlite status to 'syncing'
                await window.electronAPI.sqlite.updateOfflineSaleStatus({
                    localSaleId: sale.local_sale_id,
                    status: 'syncing'
                });
                
                const itemsParsed = JSON.parse(sale.cart_items_json);
                const paymentsParsed = JSON.parse(sale.payments_json);

                const itemsForRpc = itemsParsed.map((item: any) => ({
                    product_id: item.product_id || item.id,
                    quantity: item.quantity
                }));

                const paymentsForRpc = paymentsParsed.map((p: any) => ({
                    method: p.method,
                    amount: p.amount
                }));

                // Execute Supabase RPC call
                const { data, error } = await supabase.rpc('finalize_sale', {
                    p_store_id: sale.store_id,
                    p_profile_id: sale.cashier_profile_id,
                    p_items: itemsForRpc,
                    p_payments: paymentsForRpc,
                    p_shift_id: sale.shift_id || null
                });

                if (error) {
                    throw new Error(error.message || 'Eroare RPC.');
                }

                const result = data as { sale_id?: string } | null;
                const syncedSaleId = result?.sale_id || null;

                await window.electronAPI.sqlite.updateOfflineSaleStatus({
                    localSaleId: sale.local_sale_id,
                    status: 'synced',
                    syncedSaleId
                });
                
                successCount++;
            } catch (err: any) {
                console.error(`[Sync] Failed to sync sale ${sale.local_sale_id}:`, err);
                await window.electronAPI.sqlite.updateOfflineSaleStatus({
                    localSaleId: sale.local_sale_id,
                    status: 'failed',
                    errorMsg: err.message || 'Eroare RPC'
                });
                failCount++;
            }

            setSyncProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setIsSyncing(false);
        if (successCount > 0 && failCount === 0) {
            toast.success(`Sincronizare finalizată! ${successCount} vânzări sincronizate.`);
        } else if (successCount > 0 && failCount > 0) {
            toast.success(`Sincronizare parțială: ${successCount} reușite, ${failCount} eșuate.`);
        } else {
            toast.error(`Sincronizarea a eșuat pentru toate cele ${failCount} vânzări.`);
        }

        await loadData();
    };

    const getStatusColor = (status: OfflineSale['status']) => {
        switch (status) {
            case 'queued': return 'bg-amber-50 text-amber-700 border-amber-250';
            case 'syncing': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'synced': return 'bg-green-50 text-green-700 border-green-200';
            case 'cancelled': return 'bg-gray-150 text-gray-600 border-gray-300';
            case 'failed':
            case 'conflict':
            default:
                return 'bg-red-50 text-red-700 border-red-200';
        }
    };

    const getFiscalStatusColor = (fiscal: OfflineSale['fiscal_status']) => {
        switch (fiscal) {
            case 'fiscalized': return 'bg-green-50 text-green-700 border-green-200';
            case 'pending_after_sync': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'not_allowed_offline': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-red-50 text-red-700 border-red-200';
        }
    };

    return (
        <div 
            data-testid="offline-sales-panel"
            className="p-8 max-w-6xl mx-auto font-sans min-h-screen bg-gray-50/20"
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Link 
                        to="/setari-magazin"
                        className="p-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm"
                        title="Înapoi la Setări"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            📦 Coadă Vânzări Offline
                        </h1>
                        <p className="text-gray-400 font-medium mt-1">Monitorizează și gestionează vânzările salvate în modul deconectat.</p>
                    </div>
                </div>
                <button 
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl font-bold transition-all active:scale-95 shadow-sm text-sm"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Actualizează
                </button>
            </div>

            {/* Summary statistics */}
            <div 
                data-testid="offline-sales-summary"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            >
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 font-bold">
                        ⏱️
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 font-bold uppercase">În așteptare (Queued)</span>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">{summary.queuedCount} vânzări</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 font-bold">
                        💰
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Total în așteptare</span>
                        <h3 className="text-2xl font-black text-indigo-600 mt-1">{summary.queuedTotal.toFixed(2)} lei</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 font-bold">
                        🕒
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Ultima vânzare offline</span>
                        <h3 className="text-base font-bold text-slate-800 mt-1 truncate max-w-[200px]">
                            {summary.lastSale 
                                ? `${new Date(summary.lastSale.createdAtLocal).toLocaleTimeString()} (${summary.lastSale.grandTotal.toFixed(2)} lei)`
                                : 'Fără înregistrări'}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Sync Control Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-3.5 items-start">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                        <BadgeInfo size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">Sincronizarea tranzacțiilor offline</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed font-medium">
                            {isSyncing 
                                ? `Sincronizare în curs: se procesează ${syncProgress.current} din ${syncProgress.total} vânzări.`
                                : `Sincronizează vânzările salvate offline cu serverul Supabase. Conexiune: ${isOnline ? 'Online 🟢' : 'Offline 🔴'}`}
                        </p>
                    </div>
                </div>
                
                {isSyncing ? (
                    <button
                        data-testid="offline-sale-sync-now"
                        disabled
                        className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-sm font-bold border border-indigo-100 uppercase tracking-wider flex items-center gap-2"
                    >
                        <RefreshCw size={16} className="animate-spin" />
                        Se sincronizează ({syncProgress.current}/{syncProgress.total})
                    </button>
                ) : (
                    <button
                        data-testid={isOnline && sales.some(s => s.status === 'queued' || s.status === 'failed') ? "offline-sale-sync-now" : "offline-sale-sync-now-disabled"}
                        disabled={!isOnline || !sales.some(s => s.status === 'queued' || s.status === 'failed')}
                        onClick={handleSyncNow}
                        className={`px-6 py-3 rounded-2xl text-sm font-bold border uppercase tracking-wider flex items-center gap-2 transition-all ${
                            isOnline && sales.some(s => s.status === 'queued' || s.status === 'failed')
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                        title={!isOnline ? "Conectează-te la internet" : !sales.some(s => s.status === 'queued' || s.status === 'failed') ? "Nu există vânzări de sincronizat" : "Sincronizează acum"}
                    >
                        <RefreshCw size={16} />
                        Sincronizează acum
                    </button>
                )}
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Lista tranzacțiilor offline</h3>
                    <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-xl">
                        {sales.length} tranzacții salvate local
                    </span>
                </div>

                <div className="overflow-x-auto">
                    {sales.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 opacity-60 flex flex-col items-center justify-center gap-2">
                            <Clock size={40} className="mb-2" />
                            <p className="font-bold uppercase tracking-wider text-sm">Coadă goală</p>
                            <p className="text-xs">Nu există vânzări înregistrate local în coada offline.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/20">
                                    <th className="p-4 pl-6">Data / Ora</th>
                                    <th className="p-4">Hash / ID Local</th>
                                    <th className="p-4">Casier Profile ID</th>
                                    <th className="p-4 text-center">Produse</th>
                                    <th className="p-4 text-right">Total</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Status Fiscal</th>
                                    <th className="p-4 pr-6 text-center">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale) => {
                                    let itemsCount = 0;
                                    let grandTotal = 0;
                                    try {
                                        const items = JSON.parse(sale.cart_items_json);
                                        itemsCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
                                        const totals = JSON.parse(sale.totals_json);
                                        grandTotal = totals.grandTotal || 0;
                                    } catch (e) {
                                        // Ignore
                                    }

                                    return (
                                        <tr 
                                            key={sale.local_sale_id} 
                                            data-testid="offline-sale-row"
                                            className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-sm text-slate-700"
                                        >
                                            <td className="p-4 pl-6 font-medium text-slate-800">
                                                {new Date(sale.created_at_local).toLocaleString()}
                                            </td>
                                            <td className="p-4 font-mono text-xs">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50" title={sale.payload_hash || ''}>
                                                    {(sale.payload_hash || '').substring(0, 8)}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[120px]" title={sale.local_sale_id || ''}>
                                                    {sale.local_sale_id}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-slate-500" title={sale.cashier_profile_id || ''}>
                                                {(sale.cashier_profile_id || '').substring(0, 8)}...
                                            </td>
                                            <td className="p-4 text-center font-semibold text-slate-800">
                                                {itemsCount}
                                            </td>
                                            <td className="p-4 text-right font-black text-slate-900">
                                                {grandTotal.toFixed(2)} lei
                                            </td>
                                            <td className="p-4 text-center">
                                                <span 
                                                    data-testid="offline-sale-status"
                                                    className={`inline-block px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-xl border ${getStatusColor(sale.status)}`}
                                                >
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${getFiscalStatusColor(sale.fiscal_status)}`}>
                                                    {sale.fiscal_status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 pr-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        data-testid="offline-sale-details-button"
                                                        onClick={() => setSelectedSale(sale)}
                                                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                                                        title="Vezi detalii vânzare"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    
                                                    {sale.status === 'queued' && (
                                                        <button
                                                            data-testid="offline-sale-cancel-local-button"
                                                            onClick={() => handleCancelLocal(sale.local_sale_id)}
                                                            disabled={!isAuthorizedToCancel}
                                                            className={`p-1.5 rounded-lg transition-colors ${
                                                                isAuthorizedToCancel 
                                                                    ? 'hover:bg-red-50 text-slate-400 hover:text-red-600' 
                                                                    : 'opacity-30 cursor-not-allowed text-slate-300'
                                                            }`}
                                                            title={isAuthorizedToCancel ? 'Anulează vânzarea local' : 'Doar Manager/Admin poate anula'}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Sale Details Modal */}
            {selectedSale && (() => {
                let items: any[] = [];
                let payments: any[] = [];
                let totals = { productsSubtotal: 0, sgrTotal: 0, grandTotal: 0 };
                let vatBreakdown = {} as any;
                
                try {
                    items = JSON.parse(selectedSale.cart_items_json);
                    payments = JSON.parse(selectedSale.payments_json);
                    totals = JSON.parse(selectedSale.totals_json);
                    vatBreakdown = JSON.parse(selectedSale.vat_breakdown_json || '{}');
                } catch (e) {
                    // Ignore
                }

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto flex flex-col gap-6 animate-in zoom-in-95 duration-200">
                            
                            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Detalii Vânzare Offline</h3>
                                    <p className="text-xs text-slate-400 font-mono mt-1">ID Local: {selectedSale.local_sale_id}</p>
                                </div>
                                <button 
                                    data-testid="close-details-modal"
                                    onClick={() => setSelectedSale(null)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-150 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Închide
                                </button>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl text-xs text-slate-600 leading-relaxed font-semibold">
                                <div>
                                    <span className="text-slate-400 uppercase tracking-wider block font-bold text-[9px] mb-1">Informații Dispozitiv & Tură</span>
                                    <p>Store ID: <span className="font-mono">{selectedSale.store_id}</span></p>
                                    <p>Device Fingerprint: <span className="font-mono">{selectedSale.device_fingerprint}</span></p>
                                    <p>Shift ID: <span className="font-mono">{selectedSale.shift_id || 'Fără tură'}</span></p>
                                </div>
                                <div>
                                    <span className="text-slate-400 uppercase tracking-wider block font-bold text-[9px] mb-1">Înregistrare Locală</span>
                                    <p>Data: <span>{new Date(selectedSale.created_at_local).toLocaleString()}</span></p>
                                    <p>Casier Profile ID: <span className="font-mono">{selectedSale.cashier_profile_id}</span></p>
                                    <p>Hash Payload: <span className="font-mono text-indigo-600" title={selectedSale.payload_hash || ''}>{(selectedSale.payload_hash || '').substring(0, 16)}...</span></p>
                                </div>
                            </div>

                            {/* Items List */}
                            <div>
                                <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px] block mb-3">Produse în coș</span>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                                                <th className="p-3 pl-4">Denumire / Cod bare</th>
                                                <th className="p-3 text-center">Cantitate</th>
                                                <th className="p-3 text-right">Preț Unitar</th>
                                                <th className="p-3 text-right">TVA Rate</th>
                                                <th className="p-3 text-right">SGR Dep.</th>
                                                <th className="p-3 pr-4 text-right">Total Linie</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => {
                                                const unitPrice = item.unit_price_snapshot || 0;
                                                const qty = item.quantity || 0;
                                                const sgrDep = item.sgr_deposit_amount_snapshot || 0;
                                                const itemTotal = (unitPrice * qty) + (sgrDep * qty);

                                                return (
                                                    <tr key={idx} className="border-b border-slate-100 text-slate-700">
                                                        <td className="p-3 pl-4">
                                                            <div className="font-bold text-slate-800">{item.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.barcode || 'Fără barcode'}</div>
                                                        </td>
                                                        <td className="p-3 text-center font-semibold text-slate-800">{qty}</td>
                                                        <td className="p-3 text-right font-mono">{unitPrice.toFixed(2)} lei</td>
                                                        <td className="p-3 text-right font-mono">{item.vat_rate_snapshot}%</td>
                                                        <td className="p-3 text-right font-mono">{sgrDep > 0 ? `${sgrDep.toFixed(2)} lei` : '-'}</td>
                                                        <td className="p-3 pr-4 text-right font-bold text-slate-900">{itemTotal.toFixed(2)} lei</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* VAT breakdown */}
                            {Object.keys(vatBreakdown).length > 0 && (
                                <div>
                                    <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px] block mb-2">Defalcare Taxe (TVA)</span>
                                    <div className="flex flex-wrap gap-3">
                                        {Object.entries(vatBreakdown).map(([key, info]: any) => (
                                            <div key={key} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs flex gap-4">
                                                <span className="font-bold text-indigo-700">{key} ({info.rate}%)</span>
                                                <span className="text-slate-500">Bază: <strong className="text-slate-800 font-mono">{info.base.toFixed(2)}</strong></span>
                                                <span className="text-slate-500">Valoare: <strong className="text-slate-800 font-mono">{info.vat.toFixed(2)}</strong></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payments & Totals */}
                            <div className="grid grid-cols-2 gap-6 mt-2 pt-4 border-t border-slate-100">
                                <div>
                                    <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px] block mb-2.5">Metode de plată</span>
                                    <div className="space-y-2">
                                        {payments.map((p, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded-xl">
                                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">{p.method === 'cash' ? '💵 NUMERAR' : '💳 CARD'}</span>
                                                <span className="font-black text-slate-800 font-mono">{p.amount.toFixed(2)} lei</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2 justify-center">
                                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                                        <span>Subtotal Produse:</span>
                                        <span className="font-mono">{(totals.productsSubtotal || 0).toFixed(2)} lei</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                                        <span>Garanție SGR:</span>
                                        <span className="font-mono">{(totals.sgrTotal || 0).toFixed(2)} lei</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200/60 pt-2 mt-1">
                                        <span>TOTAL:</span>
                                        <span className="font-mono">{(totals.grandTotal || 0).toFixed(2)} lei</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
