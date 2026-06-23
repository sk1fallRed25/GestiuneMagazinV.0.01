import React from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { PaymentMethod } from '../types';
import { useNetworkStatus } from '../../../shared/network/useNetworkStatus';
import { isFiscalNetDesktopRuntime } from '../../fiscal-net';

interface PosPaymentPanelProps {
    total: number;
    productsSubtotal?: number;
    sgrTotal?: number;
    vatTotal?: number;
    paymentMethod: PaymentMethod;
    onPaymentMethodChange: (m: PaymentMethod) => void;
    cashAmount: string;
    onCashAmountChange: (a: string) => void;
    cardAmount: string;
    onCardAmountChange: (a: string) => void;
    onCashBlur?: () => void;
    onCardBlur?: () => void;
    onFinalize: () => void;
    onClearCart?: () => void;
    loading: boolean;
    disabled: boolean;
}

export const PosPaymentPanel: React.FC<PosPaymentPanelProps> = ({
    total,
    productsSubtotal,
    sgrTotal,
    vatTotal,
    paymentMethod,
    onPaymentMethodChange,
    cashAmount,
    onCashAmountChange,
    cardAmount,
    onCardAmountChange,
    onCashBlur,
    onCardBlur,
    onFinalize,
    onClearCart,
    loading,
    disabled
}) => {
    const { isOnline } = useNetworkStatus();

    const cashNum = parseFloat(cashAmount) || 0;
    const cardNum = parseFloat(cardAmount) || 0;
    const remainingVal = Math.max(0, total - cashNum - cardNum);

    return (
        <div data-testid="pos-payment-panel" className="p-6 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {/* Metoda Plată */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => onPaymentMethodChange('cash')}
                    data-testid="pos-payment-cash-button"
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98] focus:ring-2 focus:ring-green-500/20 ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                    💵 NUMERAR
                </button>
                <button
                    onClick={() => onPaymentMethodChange('card')}
                    data-testid="pos-payment-card-button"
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 active:scale-[0.98] focus:ring-2 focus:ring-blue-500/20 ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                    <CreditCard size={14} /> CARD
                </button>
                <button
                    onClick={() => onPaymentMethodChange('mixed')}
                    data-testid="pos-payment-mixed-button"
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98] focus:ring-2 focus:ring-purple-500/20 ${paymentMethod === 'mixed' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                    🔀 MIXT
                </button>
            </div>

            {paymentMethod === 'mixed' && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">SUMĂ CASH</label>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                                className="w-full p-2.5 border-2 border-gray-100 rounded-lg outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                value={cashAmount}
                                onChange={e => onCashAmountChange(e.target.value)}
                                onBlur={onCashBlur}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">SUMĂ CARD</label>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                                className="w-full p-2.5 border-2 border-gray-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                value={cardAmount}
                                onChange={e => onCardAmountChange(e.target.value)}
                                onBlur={onCardBlur}
                            />
                        </div>
                    </div>
                    <div className="mt-3.5 text-right text-xs font-black text-purple-700 uppercase tracking-wider" data-testid="pos-payment-remaining-display">
                        Rămas de plată: {remainingVal.toFixed(2)} LEI
                    </div>
                </div>
            )}

            {productsSubtotal !== undefined && productsSubtotal > 0 && (
                <div className="space-y-2 border-t border-gray-100 pt-4 mb-4 text-xs text-slate-650 font-medium">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal produse (TVA inclus):</span>
                        <span className="font-bold text-gray-800" data-testid="pos-subtotal-display">
                            {productsSubtotal.toFixed(2)} lei
                        </span>
                    </div>
                    {vatTotal !== undefined && vatTotal > 0 && (
                        <div className="flex justify-between text-indigo-500 bg-indigo-50/30 px-1 rounded">
                            <span>Din care TVA inclus:</span>
                            <span className="font-bold" data-testid="pos-vat-display">
                                {vatTotal.toFixed(2)} lei
                            </span>
                        </div>
                    )}
                    {sgrTotal !== undefined && sgrTotal > 0 && (
                        <div className="flex justify-between text-indigo-600">
                            <span>Garanții SGR (D - 0%):</span>
                            <span className="font-bold" data-testid="pos-sgr-display">
                                {sgrTotal.toFixed(2)} lei
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner" data-testid="pos-total-display">
                <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">TOTAL DE PLATĂ</span>
                <span className="text-4xl font-black text-slate-900 tracking-tight" data-testid="pos-cart-total">
                    {total.toFixed(2)} <span className="text-sm text-slate-400 font-bold">LEI</span>
                </span>
            </div>

            {!isOnline && (
                <div data-testid="pos-payment-offline-warning" className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-start gap-2 shadow-sm">
                    <span>⚠️</span>
                    <span>Sistem offline. Vânzarea va fi salvată local în coadă și sincronizată ulterior.</span>
                </div>
            )}

            <div className="flex gap-3 mt-4">
                <button
                    onClick={onClearCart}
                    disabled={disabled || loading}
                    data-testid="pos-clear-cart-button"
                    className="flex-1 py-4 border-2 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:ring-2 focus:ring-red-500/20"
                >
                    ❌ Anulează Coș
                </button>
                <button
                    onClick={onFinalize}
                    disabled={disabled || loading || (!isOnline && !window.electronAPI?.sqlite)}
                    data-testid="pos-checkout-button"
                    className="flex-[2] py-4 rounded-xl text-lg font-black shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500/20"
                >
                    {loading ? <RefreshCw className="animate-spin" /> : (isOnline ? 'ÎNCASEAZĂ' : 'Salvează offline')}
                </button>
            </div>
            
            {!isOnline && window.electronAPI?.sqlite && (
                <p className="text-xs text-center text-amber-600 mt-2.5 font-semibold">
                    Bonul fiscal se va emite doar după sincronizare.
                </p>
            )}
            
            {/* FiscalNet Status Badge */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3.5 text-xs">
                <span className="text-gray-400 font-medium tracking-wide uppercase text-[10px]">Fiscal Bridge</span>
                <span 
                    data-testid="pos-fiscalnet-status-badge"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                        isFiscalNetDesktopRuntime() 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${isFiscalNetDesktopRuntime() ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    {isFiscalNetDesktopRuntime() ? 'Conectat (Desktop)' : 'Browser (Fără Terminal)'}
                </span>
            </div>
        </div>
    );
};
