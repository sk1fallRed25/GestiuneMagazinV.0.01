import React from 'react';

interface SaleStatusBadgeProps {
    status: string;
}

export const SaleStatusBadge: React.FC<SaleStatusBadgeProps> = ({ status }) => {
    const config: Record<string, { label: string; classes: string }> = {
        finalized: { label: 'Finalizat', classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        cancelled: { label: 'Anulat', classes: 'bg-red-50 text-red-700 border-red-100' },
        returned: { label: 'Retur', classes: 'bg-orange-50 text-orange-700 border-orange-100' },
        partially_returned: { label: 'Retur Parțial', classes: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
    };

    const s = config[status] || { label: status, classes: 'bg-gray-50 text-gray-700 border-gray-100' };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${s.classes}`}>
            {s.label}
        </span>
    );
};
