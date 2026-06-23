import React from 'react';
import { useDashboard } from './hooks/useDashboard';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardStatsGrid } from './components/DashboardStatsGrid';
import { RecentSalesCard } from './components/RecentSalesCard';
import { RecentReceptionsCard } from './components/RecentReceptionsCard';
import { LowStockCard } from './components/LowStockCard';
import { ExpirationAlertsCard } from './components/ExpirationAlertsCard';
import { WasteSummaryCard } from './components/WasteSummaryCard';
import { SalesChartCard } from './components/SalesChartCard';
import { OperationalAlertsCard } from './components/OperationalAlertsCard';
import { ProductsWithoutPriceCard } from './components/ProductsWithoutPriceCard';
import { BrainCircuit, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { LoadingState } from '../../shared/components/ui';

const DashboardSkeleton: React.FC = () => {
    return (
        <div className="p-8 max-w-7xl mx-auto pb-20 font-sans bg-gray-50/30 min-h-screen space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-8">
                <div className="space-y-2">
                    <div className="h-8 bg-slate-200 rounded-xl w-64" />
                    <div className="h-4 bg-slate-200 rounded-lg w-96" />
                </div>
                <div className="h-10 bg-slate-200 rounded-xl w-32" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-32 flex flex-col justify-between">
                        <div className="flex justify-between">
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-slate-200 rounded w-1/2" />
                                <div className="h-7 bg-slate-200 rounded-lg w-3/4" />
                            </div>
                            <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
                        </div>
                        <div className="h-4 bg-slate-150 rounded w-2/3" />
                    </div>
                ))}
            </div>

            {/* Main Section Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm h-80" />
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm h-80" />
            </div>

            {/* Lists Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm h-72" />
                ))}
            </div>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const { data, loading, error, refreshDashboard } = useDashboard();
    const { role } = useAuth();

    if (error) {
        if (role === 'platform_owner' && error === "Selectează un magazin pentru a vedea dashboard-ul.") {
            return (
                <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center font-sans">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-100">
                        <BrainCircuit size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Administrare Globală Platformă</h2>
                    <p className="text-gray-600 font-medium max-w-md mb-1">Dashboard-ul este disponibil după selectarea unui magazin.</p>
                    <p className="text-gray-400 font-medium max-w-md mb-8">Pentru administrarea globală, folosește Owner Console.</p>
                    <Link 
                        to="/owner"
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 uppercase tracking-wider text-sm"
                    >
                        Mergi la Owner Console
                    </Link>
                </div>
            );
        }

        return (
            <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-100">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Eroare Dashboard</h2>
                <p className="text-gray-400 font-medium max-w-md">{error}</p>
                <button 
                    onClick={refreshDashboard}
                    className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                >
                    ÎNCEARCĂ DIN NOU
                </button>
            </div>
        );
    }


    return (
        <div className="p-8 max-w-7xl mx-auto pb-20 font-sans bg-gray-50/30 min-h-screen">
            <DashboardHeader loading={loading} onRefresh={refreshDashboard} />

            {data && (
                <>
                    <DashboardStatsGrid stats={data.stats} loading={loading} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <OperationalAlertsCard stats={data.stats} />
                        <ProductsWithoutPriceCard products={data.productsWithoutPrice} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        <div className="lg:col-span-2">
                            <SalesChartCard data={data.salesChart} />
                        </div>
                        <WasteSummaryCard waste={data.wasteSummary} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                        <RecentSalesCard sales={data.recentSales} />
                        <RecentReceptionsCard receptions={data.recentReceptions} />
                        <LowStockCard products={data.lowStockProducts} />
                        <ExpirationAlertsCard alerts={data.expirationAlerts} />
                    </div>
                </>
            )}

            {loading && !data && (
                <DashboardSkeleton />
            )}
        </div>
    );
};

export default DashboardPage;

