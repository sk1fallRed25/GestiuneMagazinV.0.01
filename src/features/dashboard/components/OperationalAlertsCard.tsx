import React from 'react';
import { AlertCircle, ShieldAlert, Tag, PackageX, ThermometerSnowflake } from 'lucide-react';
import { DashboardStats } from '../types';

interface OperationalAlertsCardProps {
    stats: DashboardStats;
}

export const OperationalAlertsCard: React.FC<OperationalAlertsCardProps> = ({ stats }) => {
    const alerts = [
        {
            id: 'expired',
            title: 'Loturi Expirate',
            value: stats.expiredBatchesCount,
            description: 'Necesită retragere imediată de la raft',
            icon: PackageX,
            colorClass: stats.expiredBatchesCount > 0 ? 'text-rose-500 bg-rose-50 border-rose-100' : 'text-gray-400 bg-gray-50 border-gray-100',
            badgeText: 'URGENT',
            badgeColor: 'bg-rose-100 text-rose-700'
        },
        {
            id: 'missing-price',
            title: 'Produse fără preț',
            value: stats.missingPricesCount,
            description: 'Nu pot fi vândute la POS',
            icon: Tag,
            colorClass: stats.missingPricesCount > 0 ? 'text-amber-500 bg-amber-50 border-amber-100' : 'text-gray-400 bg-gray-50 border-gray-100',
            badgeText: 'PREȚ RAFT',
            badgeColor: 'bg-amber-100 text-amber-700'
        },
        {
            id: 'zero-stock',
            title: 'Stoc Epuizat (Zero)',
            value: stats.zeroStockProductsCount,
            description: 'Produse active cu stoc total zero',
            icon: ShieldAlert,
            colorClass: stats.zeroStockProductsCount > 0 ? 'text-rose-500 bg-rose-50 border-rose-100' : 'text-gray-400 bg-gray-50 border-gray-100',
            badgeText: 'OUT OF STOCK',
            badgeColor: 'bg-red-100 text-red-700'
        },
        {
            id: 'critical-expiry',
            title: 'Expirare Critică (<7 zile)',
            value: stats.criticalExpiryBatchesCount,
            description: 'Loturi ce trebuie vândute rapid',
            icon: ThermometerSnowflake,
            colorClass: stats.criticalExpiryBatchesCount > 0 ? 'text-orange-500 bg-orange-50 border-orange-100' : 'text-gray-400 bg-gray-50 border-gray-100',
            badgeText: 'PROMOȚIE',
            badgeColor: 'bg-orange-100 text-orange-700'
        }
    ];

    const activeAlertsCount = alerts.filter(a => a.value > 0).length;

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-rose-50/20">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                    <AlertCircle size={20} className="text-rose-500" />
                    Centru Alerte Operaționale
                </h3>
                {activeAlertsCount > 0 ? (
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 animate-pulse">
                        {activeAlertsCount} ALERTE ACTIVE
                    </span>
                ) : (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        STATUS NOMINAL
                    </span>
                )}
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                {alerts.map((alert) => {
                    const Icon = alert.icon;
                    return (
                        <div 
                            key={alert.id} 
                            className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${
                                alert.value > 0 
                                    ? 'bg-gradient-to-br from-white to-slate-50/30 border-slate-150 shadow-sm' 
                                    : 'bg-gray-50/50 border-gray-100 opacity-60'
                            }`}
                        >
                            <div className="flex gap-3 items-center">
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${alert.colorClass}`}>
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800">{alert.title}</h4>
                                    <p className="text-[10px] text-gray-400 font-semibold">{alert.description}</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                                {alert.value > 0 && (
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${alert.badgeColor}`}>
                                        {alert.badgeText}
                                    </span>
                                )}
                                <span className={`text-xl font-black font-mono ${alert.value > 0 ? 'text-slate-800' : 'text-gray-400'}`}>
                                    {alert.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
