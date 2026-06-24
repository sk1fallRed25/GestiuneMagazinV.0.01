import React, { useState, useMemo } from 'react';
import { ProfitabilityProduct } from '../types';
import { Search, ShieldAlert, Award, AlertCircle, Sparkles, AlertOctagon } from 'lucide-react';
import { EmptyState, Button } from '../../../shared/components/ui';

interface ProfitabilityReportProps {
    products: ProfitabilityProduct[];
    loading?: boolean;
}

export const ProfitabilityReport: React.FC<ProfitabilityReportProps> = ({ products, loading }) => {
    const [classFilter, setClassFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(value);
    };

    // Calculate class counts
    const classCounts = useMemo(() => {
        const counts = { A: 0, B: 0, C: 0, total: 0 };
        products.forEach(p => {
            counts.total++;
            counts[p.profitClass]++;
        });
        return counts;
    }, [products]);

    // Filter and search
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesClass = classFilter === 'ALL' || p.profitClass === classFilter;
            const matchesSearch = 
                p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.barcode.includes(searchTerm);
            return matchesClass && matchesSearch;
        });
    }, [products, classFilter, searchTerm]);

    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-pulse h-96" />
        );
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col font-sans">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-50">
                <div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Analiză Profitabilitate (ABC)</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Clasificarea produselor în funcție de marja comercială practicată</p>
                </div>

                {/* Class Counts Summary */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setClassFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            classFilter === 'ALL'
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        Toate ({classCounts.total})
                    </button>
                    <button
                        onClick={() => setClassFilter('A')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            classFilter === 'A'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Clasa A (≥25%): {classCounts.A}
                    </button>
                    <button
                        onClick={() => setClassFilter('B')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            classFilter === 'B'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50'
                        }`}
                    >
                        <Award className="w-3.5 h-3.5" />
                        Clasa B (10-25%): {classCounts.B}
                    </button>
                    <button
                        onClick={() => setClassFilter('C')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            classFilter === 'C'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50'
                        }`}
                    >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Clasa C (&lt;10%): {classCounts.C}
                    </button>
                </div>
            </div>

            {/* Info Alerts */}
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2.5 text-[11px] text-gray-500 font-medium">
                <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                    <strong>Clasa A:</strong> Produse cu profitabilitate mare, motorul principal al profitului. 
                    <strong> Clasa B:</strong> Profitabilitate medie, necesită monitorizarea volumelor. 
                    <strong> Clasa C:</strong> Adaos redus, se recomandă renegocierea prețurilor de achiziție.
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Caută produs după nume sau cod bare..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 font-medium"
                />
            </div>

            {/* Data Table */}
            {filteredProducts.length === 0 ? (
                <div className="py-12 border border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
                    <EmptyState
                        title="Niciun produs găsit"
                        description={
                            searchTerm 
                                ? 'Niciun produs nu corespunde căutării tale.' 
                                : 'Nu există produse în această clasă de profitabilitate.'
                        }
                        icon={<AlertOctagon size={36} className="text-gray-400" />}
                        action={searchTerm ? (
                            <Button variant="secondary" onClick={() => setSearchTerm('')}>
                                Resetează căutarea
                            </Button>
                        ) : undefined}
                    />
                </div>
            ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider border-b border-gray-100">
                                <th className="p-4">Produs</th>
                                <th className="p-4">Cod Bare</th>
                                <th className="p-4 text-center">Clasă</th>
                                <th className="p-4 text-right">Cost Achiziție</th>
                                <th className="p-4 text-right">Preț Vânzare</th>
                                <th className="p-4 text-right">Marjă Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                            {filteredProducts.map((p) => (
                                <tr key={p.productId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 font-bold text-gray-900">{p.productName}</td>
                                    <td className="p-4 text-gray-400 font-mono">{p.barcode}</td>
                                    <td className="p-4 text-center">
                                        {p.profitClass === 'A' && (
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded border border-emerald-100">
                                                A
                                            </span>
                                        )}
                                        {p.profitClass === 'B' && (
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded border border-indigo-100">
                                                B
                                            </span>
                                        )}
                                        {p.profitClass === 'C' && (
                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded border border-amber-100">
                                                C
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">{formatCurrency(p.pricePurchase)}</td>
                                    <td className="p-4 text-right">{formatCurrency(p.priceSale)}</td>
                                    <td className={`p-4 text-right font-black ${p.margin < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                                        {p.margin.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
