import React from 'react';
import { useExpirations } from './hooks/useExpirations';
import { ExpirationsHeader } from './components/ExpirationsHeader';
import { ExpirationsFilters } from './components/ExpirationsFilters';
import { ExpirationsTable } from './components/ExpirationsTable';

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
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
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
