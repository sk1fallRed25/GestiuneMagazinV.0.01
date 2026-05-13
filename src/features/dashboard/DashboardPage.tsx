import React from 'react';
import { useDashboard } from './hooks/useDashboard';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardStatsGrid } from './components/DashboardStatsGrid';
import { RecentSalesCard } from './components/RecentSalesCard';
import { LowStockCard } from './components/LowStockCard';
import { ExpirationAlertsCard } from './components/ExpirationAlertsCard';
import { WasteSummaryCard } from './components/WasteSummaryCard';
import { SalesChartCard } from './components/SalesChartCard';
import { BrainCircuit, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC<{ userRole?: string }> = ({ userRole }) => {
    const { data, loading, error, refreshDashboard } = useDashboard();

    if (error) {
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        <div className="lg:col-span-2">
                            <SalesChartCard data={data.salesChart} />
                        </div>
                        <WasteSummaryCard waste={data.wasteSummary} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                        <RecentSalesCard sales={data.recentSales} />
                        <LowStockCard products={data.lowStockProducts} />
                        <ExpirationAlertsCard alerts={data.expirationAlerts} />
                    </div>

                    {/* Promo/Protocol Section (Păstrată din designul vechi dar stilizată) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                            <BrainCircuit size={48} className="text-indigo-600 mb-4 animate-pulse" />
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Sistem de Trasabilitate v2</h3>
                            <p className="text-gray-400 mt-2 max-w-xs font-medium italic">Fiecare mișcare de stoc și vânzare este acum atribuită nominal și legată de un lot specific.</p>
                        </div>
                        <div className="bg-[#0f172a] rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden flex flex-col justify-center">
                            <AlertTriangle size={120} className="absolute -right-10 -bottom-10 opacity-10" />
                            <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">Protocol de Gestiune v2</h3>
                            <p className="text-slate-400 mb-6 font-medium">Administratorul poate audita acum întregul lanț valoric, de la recepție până la vânzare sau casare.</p>
                            <div className="flex flex-wrap gap-4">
                                <Link to="/pierderi" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-center w-fit hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900">RAPORT PIERDERI</Link>
                                <Link to="/istoric-vanzari" className="bg-slate-800 text-white px-8 py-3 rounded-xl font-black text-center w-fit hover:bg-slate-700 transition-all border border-slate-700">ISTORIC COMPLET</Link>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {loading && !data && (
                <div className="flex flex-col items-center justify-center py-40">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Se generează sinteza operațională...</p>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
