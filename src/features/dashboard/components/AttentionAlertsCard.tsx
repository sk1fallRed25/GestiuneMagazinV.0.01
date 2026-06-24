import React from 'react';
import { DashboardStats } from '../types';
import { AlertCircle, FileText, Ban, AlertTriangle, ArrowRightLeft, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AttentionAlertsCardProps {
    stats: DashboardStats;
    loading?: boolean;
}

export const AttentionAlertsCard: React.FC<AttentionAlertsCardProps> = ({ stats, loading }) => {
    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
        );
    }

    const alerts = [
        {
            title: 'Produse fără preț de vânzare',
            count: stats.noPriceProductsCount,
            link: '/produse?aiFilter=no_price',
            color: 'text-rose-600 bg-rose-50 border-rose-100',
            icon: <Ban className="w-5 h-5" />,
            severity: 'critical'
        },
        {
            title: 'Produse fără stoc disponibil',
            count: stats.noStockProductsCount,
            link: '/produse?aiFilter=no_stock',
            color: 'text-amber-600 bg-amber-50 border-amber-100',
            icon: <AlertCircle className="w-5 h-5" />,
            severity: 'high'
        },
        {
            title: 'Loturi de produse expirate',
            count: stats.expiredProductsCount,
            link: '/expirari',
            color: 'text-red-700 bg-red-50 border-red-100',
            icon: <AlertTriangle className="w-5 h-5" />,
            severity: 'critical'
        },
        {
            title: 'Loturi aproape expirate (≤ 7 zile)',
            count: stats.almostExpiredProductsCount,
            link: '/expirari',
            color: 'text-amber-700 bg-amber-50/55 border-amber-100/70',
            icon: <AlertCircle className="w-5 h-5" />,
            severity: 'medium'
        },
        {
            title: 'Recepții neterminate (Draft)',
            count: stats.draftReceptionsCount,
            link: '/receptie',
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            icon: <FileText className="w-5 h-5" />,
            severity: 'medium'
        },
        {
            title: 'Transferuri neconfirmate',
            count: stats.unconfirmedTransfersCount,
            link: '/transfer',
            color: 'text-gray-600 bg-gray-50 border-gray-100',
            icon: <ArrowRightLeft className="w-5 h-5" />,
            severity: 'low'
        }
    ];

    // Filter to show only active alerts (count > 0)
    const activeAlerts = alerts.filter(a => a.count > 0);

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col h-full font-sans">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Necesită Atenție</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Alerte operaționale și manageriale active</p>
                </div>
                {activeAlerts.length > 0 ? (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-100 animate-pulse">
                        {activeAlerts.length} ALERTE
                    </span>
                ) : (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100">
                        OK
                    </span>
                )}
            </div>

            {activeAlerts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-3">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-950">Toate sistemele sunt în regulă</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-[240px]">Nu există alerte active sau stocuri critice nesoluționate.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                    {activeAlerts.map((alert, index) => (
                        <Link 
                            key={index} 
                            to={alert.link}
                            className={`flex items-center justify-between p-3.5 rounded-xl border ${alert.color} hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="shrink-0">{alert.icon}</div>
                                <span className="text-xs font-bold tracking-tight">{alert.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black tracking-tight">{alert.count}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};
