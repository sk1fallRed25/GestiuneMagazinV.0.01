import React from 'react';
import { 
    TrendingUp, 
    ShoppingBag, 
    Package, 
    AlertTriangle, 
    CalendarClock, 
    History, 
    Coins
} from 'lucide-react';
import StatCard from '../../../shared/components/StatCard';
import { DashboardStats } from '../types';

interface DashboardStatsGridProps {
    stats: DashboardStats;
    loading: boolean;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ stats, loading }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard
                title="Vânzări Azi"
                value={`${stats.todaySalesTotal.toFixed(2)} LEI`}
                icon={TrendingUp}
                color="bg-emerald-500"
                trend={{ isPositive: true, value: `${stats.todaySalesCount} bonuri` }}
                loading={loading}
            />

            <StatCard
                title="Vânzări Lună"
                value={`${stats.monthSalesTotal.toFixed(2)} LEI`}
                icon={ShoppingBag}
                color="bg-indigo-600"
                trend={{ isPositive: true, value: "Luna curentă" }}
                loading={loading}
            />

            <StatCard
                title="Stocuri Critice"
                value={`${stats.lowStockProductsCount} Produse`}
                icon={AlertTriangle}
                color={stats.lowStockProductsCount > 0 ? "bg-red-500" : "bg-emerald-500"}
                trend={{ isPositive: stats.lowStockProductsCount === 0, value: stats.lowStockProductsCount > 0 ? "Reaprovizionare" : "Optim" }}
                loading={loading}
            />

            <StatCard
                title="Termene Expirare"
                value={`${stats.expiredBatchesCount + stats.criticalExpiryBatchesCount} Loturi`}
                icon={CalendarClock}
                color={stats.expiredBatchesCount > 0 ? "bg-red-600" : (stats.criticalExpiryBatchesCount > 0 ? "bg-orange-500" : "bg-emerald-500")}
                trend={{ isPositive: stats.expiredBatchesCount === 0, value: stats.expiredBatchesCount > 0 ? "Expirate" : "Sigur" }}
                loading={loading}
            />

            <StatCard
                title="Produse Active"
                value={`${stats.activeProductsCount}`}
                icon={Package}
                color="bg-blue-500"
                loading={loading}
            />

            <StatCard
                title="Pierderi / Casări"
                value={`${stats.wasteEventsThisMonth} Luna aceasta`}
                icon={History}
                color="bg-amber-500"
                loading={loading}
            />

            <StatCard
                title="Valoare Stoc (Est.)"
                value={`${stats.stockValueEstimate.toFixed(0)} LEI`}
                icon={Coins}
                color="bg-slate-700"
                loading={loading}
            />
        </div>
    );
};
