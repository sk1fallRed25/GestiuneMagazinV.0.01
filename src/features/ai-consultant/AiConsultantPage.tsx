import React from 'react';
import { 
    BrainCircuit, Activity, Package, Store, 
    ArrowLeft, AlertTriangle, Info, TrendingUp,
    PackageMinus, DollarSign, Loader2, CheckCircle2,
    Clock, RefreshCw
} from 'lucide-react';
import { useAiConsultant } from './hooks/useAiConsultant';
import { AiRecommendation, AiProductInsight } from './types';

export default function AiConsultantPage() {
    const { data, loading, error, refresh } = useAiConsultant();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-slate-500 font-black animate-pulse">Consultantul AI analizează datele operaționale v2...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-2">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-800">{error}</h2>
                <button 
                    onClick={refresh}
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                >
                    Încearcă din nou
                </button>
            </div>
        );
    }

    const { snapshot, recommendations } = data!;

    return (
        <div className="p-8 max-w-7xl mx-auto font-sans">
            {/* Header */}
            <header className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <button 
                            onClick={() => window.history.back()}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                            <BrainCircuit className="text-indigo-600" size={32} /> AI Consultant
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium ml-12">
                        Analiză operațională v2 bazată pe datele din ultimele 30 de zile.
                        <span className="block text-[10px] uppercase font-black text-slate-400 tracking-tighter mt-1">
                            Generat la: {new Date(snapshot.generatedAt).toLocaleString('ro-RO')}
                        </span>
                    </p>
                </div>
                <button 
                    onClick={refresh}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all"
                >
                    <RefreshCw size={18} /> Re-analizează
                </button>
            </header>

            {/* Disclaimer */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-4 mb-8">
                <Info className="text-indigo-500 shrink-0" size={24} />
                <p className="text-sm font-bold text-indigo-900">
                    Sistem de consultanță operațională bazat pe reguli deterministe v2. Momentan nu se utilizează modele AI externe (LLM/ML). Toate recomandările sunt calculate local pentru maximă siguranță.
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard 
                    icon={<DollarSign />} 
                    label="Valoare Stoc" 
                    value={`${snapshot.totalStockValue.toLocaleString('ro-RO')} lei`} 
                    color="indigo" 
                />
                <StatCard 
                    icon={<TrendingUp />} 
                    label="Vânzări (30z)" 
                    value={`${snapshot.sales30dTotal.toLocaleString('ro-RO')} lei`} 
                    color="emerald" 
                    subtext={`${snapshot.sales30dCount} bonuri`}
                />
                <StatCard 
                    icon={<AlertTriangle />} 
                    label="Stoc Scăzut" 
                    value={snapshot.lowStockCount.toString()} 
                    color="orange" 
                    subtext="sub 5 bucăți"
                />
                <StatCard 
                    icon={<Clock />} 
                    label="Risc Expirare" 
                    value={snapshot.expiryRiskCount.toString()} 
                    color="red" 
                    subtext="loturi afectate"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recommendations List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-4">
                        <Activity size={24} className="text-indigo-600" /> Recomandări Prioritare
                    </h2>
                    
                    {recommendations.length === 0 ? (
                        <div className="bg-emerald-50 border border-emerald-100 p-12 rounded-3xl flex flex-col items-center text-center gap-4">
                            <CheckCircle2 size={64} className="text-emerald-500" />
                            <h3 className="text-xl font-black text-emerald-900">Magazin Optimizat</h3>
                            <p className="text-emerald-700 font-medium max-w-md">Sistemul nu a detectat anomalii sau riscuri majore în datele operaționale curente. Bravo!</p>
                        </div>
                    ) : (
                        recommendations.map(rec => (
                            <RecommendationCard key={rec.id} recommendation={rec} />
                        ))
                    )}

                    {/* Top Selling Products */}
                    <div className="pt-8">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                            <TrendingUp size={24} className="text-emerald-600" /> Cele Mai Vândute (30z)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {snapshot.topSellingProducts.map(p => (
                                <InsightProductCard key={p.productId} product={p} type="sales" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Side Insights */}
                <div className="space-y-8">
                    {/* Low Stock Sidebar */}
                    <div>
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                            <AlertTriangle size={20} className="text-orange-500" /> Alertă Stoc Mic
                        </h2>
                        <div className="space-y-3">
                            {snapshot.lowStockProducts.map(p => (
                                <InsightProductCard key={p.productId} product={p} type="stock" />
                            ))}
                        </div>
                    </div>

                    {/* Expiry Risk Sidebar */}
                    <div>
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                            <Clock size={20} className="text-red-500" /> Risc Expirare Loturi
                        </h2>
                        <div className="space-y-3">
                            {snapshot.expiryRiskProducts.map(p => (
                                <InsightProductCard key={p.productId} product={p} type="expiry" />
                            ))}
                        </div>
                    </div>

                    {/* Dead Stock Sidebar */}
                    <div>
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                            <PackageMinus size={20} className="text-slate-500" /> Dead Stock (Valoare Blocată)
                        </h2>
                        <div className="space-y-3">
                            {snapshot.deadStockProducts.map(p => (
                                <InsightProductCard key={p.productId} product={p} type="dead" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color, subtext }: { icon: React.ReactNode, label: string, value: string, color: string, subtext?: string }) {
    const colors: Record<string, string> = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        red: 'bg-red-50 text-red-600'
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center shrink-0`}>
                {React.cloneElement(icon as React.ReactElement, { size: 28 })}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
                {subtext && <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{subtext}</p>}
            </div>
        </div>
    );
}

function RecommendationCard({ recommendation }: { recommendation: AiRecommendation }) {
    const config = {
        critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600', badge: 'CRITICAL' },
        warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: 'text-orange-600', badge: 'ATENȚIE' },
        info: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600', badge: 'INFO' }
    };

    const style = config[recommendation.severity as keyof typeof config] || config.info;

    return (
        <div className={`${style.bg} border ${style.border} p-6 rounded-3xl shadow-sm transition-all hover:shadow-md`}>
            <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${style.icon} border border-current`}>
                    {style.badge}
                </span>
            </div>
            <h3 className={`text-xl font-black mb-2 ${style.text}`}>{recommendation.title}</h3>
            <p className={`text-sm font-medium ${style.text} opacity-80 mb-6`}>{recommendation.description}</p>
            
            {recommendation.actionLabel && (
                <button className="px-6 py-2 bg-white text-slate-800 font-black text-xs rounded-xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2">
                    {recommendation.actionLabel}
                </button>
            )}
        </div>
    );
}

function InsightProductCard({ product, type }: { product: AiProductInsight, type: 'sales' | 'stock' | 'expiry' | 'dead' }) {

    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate">{product.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{product.barcode}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-4">
                {type === 'sales' && (
                    <>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cantitate Vândută</p>
                            <p className="text-sm font-black text-emerald-600">{product.soldQuantity30d} {product.unit}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Venit Generat</p>
                            <p className="text-sm font-black text-slate-800">{product.soldValue30d.toFixed(2)} lei</p>
                        </div>
                    </>
                )}

                {type === 'stock' && (
                    <>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Stoc Curent</p>
                            <p className="text-sm font-black text-orange-600">{product.stockTotal} {product.unit}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Zonă</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase">
                                {product.stockMagazin > 0 ? 'Magazin' : 'Depozit'}
                            </p>
                        </div>
                    </>
                )}

                {type === 'expiry' && (
                    <>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Nivel Risc</p>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                                product.expiryRisk === 'expired' ? 'bg-red-50 text-red-600 border-red-200' : 
                                product.expiryRisk === 'critical' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                                'bg-yellow-50 text-yellow-600 border-yellow-200'
                            }`}>
                                {product.expiryRisk.toUpperCase()}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Loturi Afectate</p>
                            <p className="text-sm font-black text-slate-800">{product.stockTotal} {product.unit}</p>
                        </div>
                    </>
                )}

                {type === 'dead' && (
                    <>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ultima Vânzare</p>
                            <p className="text-[10px] font-black text-slate-500">
                                {product.lastSaleAt ? new Date(product.lastSaleAt).toLocaleDateString('ro-RO') : 'NICIODATĂ'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Valoare Blocată</p>
                            <p className="text-sm font-black text-red-600">{product.stockValueEstimate.toFixed(2)} lei</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
