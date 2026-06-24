import React from 'react';
import { Link } from 'react-router-dom';
import { 
    Activity, 
    AlertTriangle, 
    Tag, 
    Folder, 
    Percent, 
    Truck 
} from 'lucide-react';
import { StockHealthStats } from '../types';

interface StockHealthCardProps {
    stats: StockHealthStats;
}

export const StockHealthCard: React.FC<StockHealthCardProps> = ({ stats }) => {
    const items = [
        {
            label: "Stoc Critic (<= 5 buc)",
            count: stats.criticalStockCount,
            filter: "critical_stock",
            icon: AlertTriangle,
            color: stats.criticalStockCount > 0 ? "text-red-600 bg-red-50 border-red-100" : "text-slate-400 bg-slate-50 border-slate-100",
            badge: stats.criticalStockCount > 0 ? "bg-red-500 text-white" : "bg-slate-200 text-slate-650"
        },
        {
            label: "Produse Fără Preț",
            count: stats.noPriceCount,
            filter: "no_price",
            icon: Tag,
            color: stats.noPriceCount > 0 ? "text-amber-600 bg-amber-50 border-amber-100" : "text-slate-400 bg-slate-50 border-slate-100",
            badge: stats.noPriceCount > 0 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-650"
        },
        {
            label: "Produse Fără Categorie",
            count: stats.noCategoryCount,
            filter: "no_category",
            icon: Folder,
            color: stats.noCategoryCount > 0 ? "text-indigo-600 bg-indigo-50 border-indigo-100" : "text-slate-400 bg-slate-50 border-slate-100",
            badge: stats.noCategoryCount > 0 ? "bg-indigo-650 text-white" : "bg-slate-200 text-slate-650"
        },
        {
            label: "Fără TVA Configurat",
            count: stats.noVatCount,
            filter: "no_vat",
            icon: Percent,
            color: stats.noVatCount > 0 ? "text-purple-600 bg-purple-50 border-purple-100" : "text-slate-400 bg-slate-50 border-slate-100",
            badge: stats.noVatCount > 0 ? "bg-purple-650 text-white" : "bg-slate-200 text-slate-650"
        },
        {
            label: "Fără Furnizor Asociat",
            count: stats.noSupplierCount,
            filter: "no_supplier",
            icon: Truck,
            color: stats.noSupplierCount > 0 ? "text-blue-600 bg-blue-50 border-blue-100" : "text-slate-400 bg-slate-50 border-slate-100",
            badge: stats.noSupplierCount > 0 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-650"
        }
    ];

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between h-full">
            <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Activity className="text-rose-550" size={20} />
                    Stare Stoc
                </h3>
                <div className="flex flex-col gap-3">
                    {items.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <Link 
                                key={idx}
                                to={`/produse?aiFilter=${item.filter}`}
                                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-xs ${item.color}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={18} />
                                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                                        {item.label}
                                    </span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black min-w-[28px] text-center ${item.badge}`}>
                                    {item.count}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
