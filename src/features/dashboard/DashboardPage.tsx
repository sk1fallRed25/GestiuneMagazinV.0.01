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
import { QuickActionsCard } from './components/QuickActionsCard';
import { StockHealthCard } from './components/StockHealthCard';
import { TopProductsCard } from './components/TopProductsCard';
import { SlowMoversCard } from './components/SlowMoversCard';
import { BrainCircuit, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { LoadingState } from '../../shared/components/ui';

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

                    <div className="mb-8">
                        <QuickActionsCard />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        <div className="lg:col-span-2">
                            <SalesChartCard data={data.salesChart} />
                        </div>
                        <WasteSummaryCard waste={data.wasteSummary} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        <StockHealthCard stats={data.stockHealth} />
                        <TopProductsCard today={data.topSellers.today} month={data.topSellers.month} />
                        <SlowMoversCard slowMovers={data.slowMovers} />
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
                <div className="py-40 flex items-center justify-center">
                    <LoadingState message="Se generează sinteza operațională..." size="lg" />
                </div>
            )}
        </div>
    );
};

export default DashboardPage;

