import React from 'react';
import { AlertTriangle, Clock, RefreshCw, XCircle } from 'lucide-react';

interface Props {
    reason: string;
}

export const LossReasonBadge: React.FC<Props> = ({ reason }) => {
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let Icon = AlertTriangle;

    switch (reason.toLowerCase()) {
        case 'expirat':
            colorClass = 'bg-red-50 text-red-700 border-red-200';
            Icon = Clock;
            break;
        case 'deteriorat':
            colorClass = 'bg-orange-50 text-orange-700 border-orange-200';
            Icon = XCircle;
            break;
        case 'eroare_inventar':
            colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
            Icon = RefreshCw;
            break;
    }

    return (
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 w-fit ${colorClass}`}>
            <Icon size={12} />
            {reason}
        </span>
    );
};
