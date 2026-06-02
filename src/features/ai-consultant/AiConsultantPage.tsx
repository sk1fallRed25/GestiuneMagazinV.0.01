import React from 'react';
import { 
    BrainCircuit, Activity, Package, Store, 
    AlertTriangle, Info, TrendingUp,
    PackageMinus, DollarSign, Loader2, CheckCircle2,
    Clock, RefreshCw, ShieldAlert, StoreIcon, Database,
    AlertOctagon
} from 'lucide-react';
import { useAiConsultant } from './hooks/useAiConsultant';
import { useAuth } from '../auth/useAuth';

// Component Importuri
import { AiConsultantHeader } from './components/AiConsultantHeader';
import { AiKpiCard } from './components/AiKpiCard';
import { AiRecommendationCard } from './components/AiRecommendationCard';
import { AiProductInsightTable } from './components/AiProductInsightTable';

export default function AiConsultantPage() {
    const { data, loading, error, errorType, refresh } = useAiConsultant();
    const { currentStoreName } = useAuth();

    // Loading State Skeleton
    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto font-sans" data-testid="ai-consultant-loading">
                {/* Header Skeleton */}
                <div className="h-44 bg-slate-900 rounded-3xl mb-8 animate-pulse flex flex-col justify-center px-8 gap-3 border border-slate-800">
                    <div className="h-8 bg-slate-800 w-1/4 rounded-xl"></div>
                    <div className="h-4 bg-slate-800 w-1/2 rounded-lg"></div>
                    <div className="h-5 bg-slate-800 w-1/3 rounded-lg mt-2"></div>
                </div>

                {/* 6 KPI Cards Skeleton Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse flex items-center gap-4 h-[94px]">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-slate-100 w-1/2 rounded"></div>
                                <div className="h-5 bg-slate-100 w-3/4 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recommendations and Tables Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-6 bg-slate-200 w-1/4 rounded mb-4"></div>
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse space-y-4">
                                <div className="h-4 bg-slate-100 w-12 rounded"></div>
                                <div className="h-6 bg-slate-100 w-1/2 rounded flex items-center gap-2"></div>
                                <div className="h-4 bg-slate-100 w-3/4 rounded"></div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-6">
                        <div className="h-6 bg-slate-200 w-1/3 rounded mb-4"></div>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-100 w-3/4 rounded"></div>
                                        <div className="h-3 bg-slate-100 w-1/2 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Differentiated error states
    if (error) {
        if (errorType === 'store_missing') {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center" data-testid="ai-consultant-store-missing">
                    <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl border border-amber-100 flex items-center justify-center mb-2 shadow-sm">
                        <StoreIcon size={36} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">{error}</h2>
                    <p className="text-slate-500 font-semibold max-w-md mt-1 leading-relaxed">Selectează un magazin din meniul principal pentru a accesa AI Consultant.</p>
                    <button 
                        onClick={refresh}
                        className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                        data-testid="ai-consultant-retry-button"
                    >
                        Încearcă din nou
                    </button>
                </div>
            );
        }

        if (errorType === 'permission_error') {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center" data-testid="ai-consultant-permission-error">
                    <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-3xl border border-orange-100 flex items-center justify-center mb-2 shadow-sm">
                        <ShieldAlert size={36} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Acces restricționat</h2>
                    <p className="text-slate-500 font-semibold max-w-md mt-1 leading-relaxed">{error}</p>
                    <button 
                        onClick={refresh}
                        className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                        data-testid="ai-consultant-retry-button"
                    >
                        Încearcă din nou
                    </button>
                </div>
            );
        }

        // Technical / data error (default)
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center" data-testid="ai-consultant-error">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl border border-red-100 flex items-center justify-center mb-2 shadow-sm">
                    <AlertTriangle size={36} />
                </div>
                <h2 className="text-2xl font-black text-slate-800">Eroare tehnică</h2>
                <p className="text-slate-500 font-semibold max-w-md mt-1 leading-relaxed">{error}</p>
                <button 
                    onClick={refresh}
                    className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    data-testid="ai-consultant-retry-button"
                >
                    Încearcă din nou
                </button>
            </div>
        );
    }

    const { snapshot, recommendations } = data!;

    // Empty state: no products yet
    if (snapshot.activeProductsCount === 0) {
        return (
            <div className="p-8 max-w-7xl mx-auto font-sans">
                <AiConsultantHeader 
                    generatedAt={snapshot.generatedAt}
                    storeName={currentStoreName || null}
                    onRefresh={refresh}
                    isRefreshing={loading}
                />

                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 p-12 text-center" data-testid="ai-consultant-empty-state">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl border border-indigo-100 flex items-center justify-center shadow-sm">
                        <Database size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Date insuficiente pentru analiză</h2>
                    <p className="text-slate-500 font-semibold max-w-lg text-sm leading-relaxed">
                        AI Consultant este activ, dar nu există încă suficiente date pentru generarea recomandărilor.
                    </p>
                    <p className="text-slate-400 font-semibold max-w-md text-xs leading-normal">
                        Începe prin a adăuga produse, face recepții și înregistra vânzări. Consultantul va genera automat analize și recomandări când datele sunt disponibile.
                    </p>
                    <button 
                        onClick={refresh}
                        className="mt-4 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                        data-testid="ai-consultant-retry-button"
                    >
                        <RefreshCw size={18} /> Verifică din nou
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto font-sans" data-testid="ai-consultant-dashboard">
            {/* Header */}
            <AiConsultantHeader 
                generatedAt={snapshot.generatedAt}
                storeName={currentStoreName || null}
                onRefresh={refresh}
                isRefreshing={loading}
            />

            {/* Disclaimer / Info */}
            <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl flex items-center gap-4 mb-8">
                <Info className="text-indigo-500 shrink-0" size={24} />
                <p className="text-xs font-bold text-indigo-900 leading-normal">
                    Sistem de consultanță operațională bazat pe reguli deterministe v2. Momentan nu se utilizează modele AI externe (LLM/ML). Toate recomandările sunt calculate local pentru maximă siguranță.
                </p>
            </div>

            {/* KPI Cards Grid (6 columns responsive) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                <AiKpiCard 
                    icon={<Package />} 
                    label="Produse Active" 
                    value={snapshot.activeProductsCount.toString()} 
                    color="blue" 
                    testId="ai-kpi-products-active"
                    subtext="nomenclator"
                />
                <AiKpiCard 
                    icon={<DollarSign />} 
                    label="Valoare Stoc" 
                    value={`${snapshot.totalStockValue.toLocaleString('ro-RO')} lei`} 
                    color="indigo" 
                    testId="ai-kpi-stock-value"
                    subtext="estimată achiziție"
                />
                <AiKpiCard 
                    icon={<TrendingUp />} 
                    label="Vânzări (30z)" 
                    value={`${snapshot.sales30dTotal.toLocaleString('ro-RO')} lei`} 
                    color="emerald" 
                    testId="ai-kpi-sales-30d"
                    subtext={`${snapshot.sales30dCount} tranzacții`}
                />
                <AiKpiCard 
                    icon={<AlertOctagon />} 
                    label="Stoc Epuizat" 
                    value={snapshot.noStockCount.toString()} 
                    color="red" 
                    testId="ai-kpi-no-stock"
                    subtext="produse stoc zero"
                />
                <AiKpiCard 
                    icon={<AlertTriangle />} 
                    label="Stoc Scăzut" 
                    value={snapshot.lowStockCount.toString()} 
                    color="orange" 
                    testId="ai-kpi-low-stock"
                    subtext="sub 5 bucăți"
                />
                <AiKpiCard 
                    icon={<Clock />} 
                    label="Risc Expirare" 
                    value={snapshot.expiryRiskCount.toString()} 
                    color="purple" 
                    testId="ai-kpi-expiry-risk"
                    subtext="loturi active"
                />
            </div>

            {/* Main Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Recommendations and Top Selling */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Recommendations Section */}
                    <div data-testid="ai-recommendations-section" className="space-y-4">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-4">
                            <Activity size={24} className="text-indigo-600" /> Recomandări Prioritare
                        </h2>
                        
                        {recommendations.length === 0 ? (
                            <div className="bg-emerald-50/50 border border-emerald-100 p-12 rounded-3xl flex flex-col items-center text-center gap-4">
                                <CheckCircle2 size={64} className="text-emerald-500" />
                                <h3 className="text-xl font-black text-emerald-950">Magazin Optimizat</h3>
                                <p className="text-emerald-700 font-semibold max-w-md leading-relaxed text-sm">
                                    Sistemul nu a detectat anomalii sau riscuri majore în datele operaționale curente. Bravo!
                                </p>
                            </div>
                        ) : (
                            recommendations.map(rec => (
                                <AiRecommendationCard key={rec.id} recommendation={rec} />
                            ))
                        )}
                    </div>

                    {/* Top Selling Products */}
                    <AiProductInsightTable 
                        title="Cele mai vândute produse (30z)"
                        products={snapshot.topSellingProducts}
                        type="top-selling"
                        emptyMessage="Nu s-au înregistrat vânzări în ultimele 30 de zile."
                        testId="ai-top-selling-section"
                    />
                </div>

                {/* Right Side: Low Stock, Expiry Risk and Dead Stock sidebars */}
                <div className="space-y-8">
                    <AiProductInsightTable 
                        title="Alertă Stoc Scăzut / Epuizat"
                        products={snapshot.lowStockProducts}
                        type="low-stock"
                        emptyMessage="Nu există produse cu stoc critic."
                        testId="ai-low-stock-section"
                    />

                    <AiProductInsightTable 
                        title="Risc Expirare Loturi"
                        products={snapshot.expiryRiskProducts}
                        type="expiry"
                        emptyMessage="Nu există riscuri de expirare detectate în depozit sau magazin."
                        testId="ai-expiry-risk-section"
                    />

                    <AiProductInsightTable 
                        title="Dead Stock (Valoare Blocată)"
                        products={snapshot.deadStockProducts}
                        type="dead-stock"
                        emptyMessage="Nu există produse blocate în stoc fără mișcare."
                        testId="ai-dead-stock-section"
                    />
                </div>
            </div>
        </div>
    );
}
