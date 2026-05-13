import React from 'react';
import { LayoutDashboard, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
    loading: boolean;
    onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ loading, onRefresh }) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
                <h1 className="text-4xl font-black text-gray-900 flex items-center gap-4 tracking-tight">
                    <span className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-100 flex items-center justify-center">
                        <LayoutDashboard size={32} strokeWidth={2.5} />
                    </span>
                    Dashboard
                </h1>
                <p className="text-gray-400 mt-2 font-medium text-lg ml-1">Vedere de ansamblu asupra performanței și stocurilor (v2).</p>
            </div>

            <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 hover:shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                REÎNCARCĂ DATE
            </button>
        </div>
    );
};
