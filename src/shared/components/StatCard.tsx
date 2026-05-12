import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    valueColor?: string;
    trend?: {
        isPositive: boolean;
        value: string;
        label?: string;
    };
    loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, color, valueColor, trend, loading }: StatCardProps) => (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-300 border border-gray-100 group relative overflow-hidden">
        {loading && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className={`text-3xl font-bold transition-colors ${valueColor || 'text-gray-800 group-hover:text-indigo-600'}`}>
                    {value}
                </h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center text-xs font-medium">
                <span className={`${trend.isPositive ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'} flex items-center font-bold px-2 py-1 rounded-md`}>
                    {trend.isPositive ? <TrendingUp size={14} className="mr-1"/> : <AlertTriangle size={14} className="mr-1"/>}
                    {trend.value}
                </span>
                <span className="text-gray-400 ml-2">{trend.label || "față de perioada trecută"}</span>
            </div>
        )}
    </div>
);

export default StatCard;
