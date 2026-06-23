import React from 'react';
import { useExpirations } from './hooks/useExpirations';
import { ExpirationsHeader } from './components/ExpirationsHeader';
import { ExpirationsFilters } from './components/ExpirationsFilters';
import { ExpirationsTable } from './components/ExpirationsTable';

const ExpirationsSkeleton: React.FC = () => {
    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-pulse">
            <div className="bg-gray-50/50 h-16 border-b border-gray-100 flex items-center px-6">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
            <div className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-6 py-5 flex justify-between items-center">
                        <div className="space-y-2 w-1/3">
                            <div className="h-5 bg-slate-200 rounded w-3/4" />
                            <div className="h-3 bg-slate-200 rounded w-1/2" />
                        </div>
                        <div className="h-5 bg-slate-200 rounded w-16" />
                        <div className="h-5 bg-slate-200 rounded w-20" />
                        <div className="h-8 bg-slate-200 rounded-xl w-24" />
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExpirationsPage: React.FC = () => {
    const {
        loading,
        filters,
        filteredItems,
        summary,
        setFilter,
        goToLossReport
    } = useExpirations();

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="mb-10">
                    <ExpirationsHeader summary={summary} />
                </div>

                <div className="mb-8">
                    <ExpirationsFilters 
                        filters={filters} 
                        onFilterChange={setFilter} 
                    />
                </div>

                {loading ? (
                    <ExpirationsSkeleton />
                ) : (
                    <ExpirationsTable 
                        items={filteredItems} 
                        onReportLoss={goToLossReport} 
                    />
                )}
            </div>
        </div>
    );
};

export default ExpirationsPage;
