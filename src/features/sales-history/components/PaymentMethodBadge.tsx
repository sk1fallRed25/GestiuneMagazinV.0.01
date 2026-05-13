import React from 'react';
import { CreditCard, Banknote, RefreshCcw } from 'lucide-react';

interface PaymentMethodBadgeProps {
    method: string;
}

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({ method }) => {
    if (method === 'card') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-100">
                <CreditCard size={12} /> CARD
            </span>
        );
    }
    if (method === 'mixed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-purple-50 text-purple-700 border-purple-100">
                <RefreshCcw size={12} /> MIXT
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-100">
            <Banknote size={12} /> CASH
        </span>
    );
};
