import React from 'react';
import { 
    TrendingUp, 
    Coins, 
    AlertTriangle, 
    CalendarClock 
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
                title="Profit Azi"
                value={`${stats.todayProfitTotal.toFixed(2)} LEI`}
                icon={Coins}
                color="bg-indigo-600"
                trend={{ isPositive: stats.todayProfitTotal >= 0, value: "Estimare brută" }}
                loading={loading}
            />

            <StatCard
                title="Produse Stoc Mic"
                value={`${stats.lowStockProductsCount} Produse`}
                icon={AlertTriangle}
                color={stats.lowStockProductsCount > 0 ? "bg-amber-500" : "bg-emerald-500"}
                trend={{ isPositive: stats.lowStockProductsCount === 0, value: stats.lowStockProductsCount > 0 ? "Necesită reaprovizionare" : "Stoc optim" }}
                loading={loading}
            />

            <StatCard
                title="Alerte Expirare"
                value={`${stats.expiredBatchesCount + stats.criticalExpiryBatchesCount} Loturi`}
                icon={CalendarClock}
                color={stats.expiredBatchesCount > 0 ? "bg-red-600" : (stats.criticalExpiryBatchesCount > 0 ? "bg-orange-500" : "bg-emerald-500")}
                trend={{ isPositive: stats.expiredBatchesCount === 0, value: stats.expiredBatchesCount > 0 ? "Expirate sau critice" : "Termene sigure" }}
                loading={loading}
            />
        </div>
    );
};

