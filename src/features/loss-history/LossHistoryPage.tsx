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
            
            <LossHistoryTable 
                items={items} 
                loading={loading} 
                onViewDetails={openLossDetails} 
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
