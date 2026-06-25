import React, { useState } from 'react';
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
import { QuickActionsCard } from './components/QuickActionsCard';
import { StockHealthCard } from './components/StockHealthCard';
import { TopProductsCard } from './components/TopProductsCard';
import { SlowMoversCard } from './components/SlowMoversCard';
import { BrainCircuit, AlertTriangle, LayoutDashboard, BarChart3, Sparkles } from 'lucide-react';
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

// New Components
import { KpiGrid } from './components/KpiGrid';
import { AttentionAlertsCard } from './components/AttentionAlertsCard';
import { HighMarginCard } from './components/HighMarginCard';
import { NegativeProfitCard } from './components/NegativeProfitCard';
import { DeadStockReport } from './components/DeadStockReport';
import { ProfitabilityReport } from './components/ProfitabilityReport';
import { BusinessScoreCard } from './components/BusinessScoreCard';
import { RestockRecommendationsCard } from './components/RestockRecommendationsCard';
import { OverstockDetectionCard } from './components/OverstockDetectionCard';
import { SmartInsightsCard } from './components/SmartInsightsCard';
import { TopOpportunitiesCard } from './components/TopOpportunitiesCard';

const DashboardPage: React.FC = () => {
    const { data, loading, error, refreshDashboard } = useDashboard();
    const { role } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'profitability' | 'intelligence'>('overview');

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
                    {/* Tabs navigation */}
                    <div className="flex border-b border-gray-200 mb-8 gap-6 font-sans overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'overview'
                                    ? 'text-indigo-600'
                                    : 'text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Sinteză Generală
                            {activeTab === 'overview' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'alerts'
                                    ? 'text-indigo-600'
                                    : 'text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Alerte & Stoc Mort
                            {activeTab === 'alerts' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('profitability')}
                            className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'profitability'
                                    ? 'text-indigo-600'
                                    : 'text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Analiză Profitabilitate & KPIs
                            {activeTab === 'profitability' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('intelligence')}
                            className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'intelligence'
                                    ? 'text-indigo-600'
                                    : 'text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            Inteligență Stocuri & Recomandări
                            {activeTab === 'intelligence' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* Tab contents */}
                    {activeTab === 'overview' && (
                        <>
                            <DashboardStatsGrid stats={data.stats} loading={loading} />

                            <div className="mb-8 mt-6">
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

                    {activeTab === 'alerts' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <OperationalAlertsCard stats={data.stats} />
                                <ProductsWithoutPriceCard products={data.productsWithoutPrice} />
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <AttentionAlertsCard stats={data.stats} loading={loading} />
                                </div>
                                <div className="lg:col-span-2">
                                    <DeadStockReport slowMovers={data.slowMovers} loading={loading} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profitability' && (
                        <div className="space-y-8">
                            {/* KPI Grid */}
                            <KpiGrid stats={data.stats} loading={loading} />

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <ProfitabilityReport products={data.profitabilityProducts} loading={loading} />
                                </div>
                                <div className="lg:col-span-1 space-y-8">
                                    <HighMarginCard products={data.highMarginProducts} loading={loading} />
                                    <NegativeProfitCard products={data.negativeProfitProducts} loading={loading} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'intelligence' && (
                        <div className="space-y-8">
                            {/* Score Card & Insights */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                <div className="lg:col-span-2">
                                    <BusinessScoreCard score={data.healthScore} loading={loading} />
                                </div>
                                <div className="lg:col-span-3">
                                    <SmartInsightsCard insights={data.smartInsights} loading={loading} />
                                </div>
                            </div>

                            {/* Recommendations & Overstock */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <RestockRecommendationsCard recommendations={data.restockRecommendations} loading={loading} />
                                <OverstockDetectionCard items={data.overstockItems} loading={loading} />
                                <TopOpportunitiesCard opportunities={data.topOpportunities} loading={loading} />
                            </div>
                        </div>
                    )}
                </>
            )}

            {loading && !data && (
                <DashboardSkeleton />
            )}
        </div>
    );
};

export default DashboardPage;
