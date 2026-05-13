import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { ExpirationStatus } from '../types';

interface ExpirationStatusBadgeProps {
    status: ExpirationStatus;
    days: number;
}

export const ExpirationStatusBadge: React.FC<ExpirationStatusBadgeProps> = ({ status, days }) => {
    const config = {
        expired: {
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-100',
            icon: <AlertCircle size={14} />,
            label: days < 0 ? `Expirat de ${Math.abs(days)}z` : 'Expiră azi'
        },
        critical: {
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-100',
            icon: <Clock size={14} />,
            label: `Critic: ${days}z`
        },
        warning: {
            bg: 'bg-yellow-50',
            text: 'text-yellow-700',
            border: 'border-yellow-100',
            icon: <Clock size={14} />,
            label: `Atenție: ${days}z`
        },
        ok: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-100',
            icon: <CheckCircle size={14} />,
            label: `Valid: ${days}z`
        }
    };

    const { bg, text, border, icon, label } = config[status];

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${bg} ${text} ${border}`}>
            {icon}
            {label}
        </span>
    );
};
