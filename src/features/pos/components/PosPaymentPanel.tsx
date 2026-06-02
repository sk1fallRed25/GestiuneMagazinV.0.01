import React from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { PaymentMethod } from '../types';

interface PosPaymentPanelProps {
    total: number;
    paymentMethod: PaymentMethod;
    onPaymentMethodChange: (m: PaymentMethod) => void;
    cashAmount: string;
    onCashAmountChange: (a: string) => void;
    cardAmount: string;
    onCardAmountChange: (a: string) => void;
    onCashBlur?: () => void;
    onCardBlur?: () => void;
    onFinalize: () => void;
    loading: boolean;
    disabled: boolean;
}

export const PosPaymentPanel: React.FC<PosPaymentPanelProps> = ({
    total,
    paymentMethod,
    onPaymentMethodChange,
    cashAmount,
    onCashAmountChange,
    cardAmount,
    onCardAmountChange,
    onCashBlur,
    onCardBlur,
    onFinalize,
    loading,
    disabled
}) => {
    return (
        <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {/* Metoda Plată */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => onPaymentMethodChange('cash')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}
                >
                    💵 NUMERAR
                </button>
                <button
                    onClick={() => onPaymentMethodChange('card')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}
                >
                    <CreditCard size={14} /> CARD
                </button>
                <button
                    onClick={() => onPaymentMethodChange('mixed')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all ${paymentMethod === 'mixed' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-400'}`}
                >
                    🔀 MIXT
                </button>
            </div>

            {paymentMethod === 'mixed' && (
                <div className="grid grid-cols-2 gap-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1">SUMĂ CASH</label>
                        <input 
                            type="text" 
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            className="w-full p-2 border-2 border-gray-100 rounded-lg outline-none focus:border-green-500"
                            value={cashAmount}
                            onChange={e => onCashAmountChange(e.target.value)}
                            onBlur={onCashBlur}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 block mb-1">SUMĂ CARD</label>
                        <input 
                            type="text" 
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            className="w-full p-2 border-2 border-gray-100 rounded-lg outline-none focus:border-blue-500"
                            value={cardAmount}
                            onChange={e => onCardAmountChange(e.target.value)}
                            onBlur={onCardBlur}
                        />
                    </div>
                </div>
            )}

            <div className="flex justify-between items-end mb-6">
                <span className="text-gray-500 font-medium">TOTAL DE PLATĂ</span>
                <span className="text-5xl font-black text-gray-900 tracking-tight" data-testid="pos-cart-total">
                    {total.toFixed(2)} <span className="text-lg text-gray-400 font-normal">LEI</span>
                </span>
            </div>

            <button
                onClick={onFinalize}
                disabled={disabled || loading}
                className={`w-full py-5 rounded-2xl text-2xl font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {loading ? <RefreshCw className="animate-spin" /> : 'ÎNCASEAZĂ'}
            </button>
            
            <p className="text-[10px] text-center text-gray-400 mt-4 uppercase tracking-widest">
                Fiscal Bridge va fi conectat ulterior
            </p>
        </div>
    );
};
