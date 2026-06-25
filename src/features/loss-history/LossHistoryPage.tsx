import React from 'react';
import { useLossHistory } from './hooks/useLossHistory';
import { LossHistoryHeader } from './components/LossHistoryHeader';
import { LossHistoryFilters } from './components/LossHistoryFilters';
import { LossHistoryTable } from './components/LossHistoryTable';
import { LossDetailsModal } from './components/LossDetailsModal';

export default function LossHistoryPage() {
    const {
        items,
        summary,
        filters,
        loading,
        selectedLoss,
        showDetailsModal,
        updateFilter,
        refreshLossHistory,
        openLossDetails,
        closeDetailsModal
    } = useLossHistory();

    return (
        <div className="p-8 max-w-7xl mx-auto font-sans">
            <LossHistoryHeader summary={summary} />
            
            <LossHistoryFilters 
                filters={filters} 
                onFilterChange={updateFilter} 
                onRefresh={refreshLossHistory} 
            />

            <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {items.length} {items.length === 1 ? 'înregistrare găsită' : 'înregistrări găsite'}
                </span>
            </div>
            
            <LossHistoryTable 
                items={items} 
                loading={loading} 
                onViewDetails={openLossDetails} 
                searchTerm={filters.search}
                onClearFilters={() => {
                    updateFilter('search', '');
                    updateFilter('zone', 'all');
                    updateFilter('reason', 'all');
                    updateFilter('dateFrom', '');
                    updateFilter('dateTo', '');
                }}
            />

            {showDetailsModal && (
                <LossDetailsModal 
                    details={selectedLoss} 
                    onClose={closeDetailsModal} 
                />
            )}
        </div>
    );
}
