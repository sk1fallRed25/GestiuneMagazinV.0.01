import React from 'react';
import { Wifi, RefreshCw } from 'lucide-react';
import { ActiveShift } from '../types';
import { ShiftActiveBadge } from './ShiftActiveBadge';

interface PosHeaderProps {
    isOnline: boolean;
    syncStatus: string;
    loading: boolean;
    activeShift: ActiveShift | null;
    onOpenClick: () => void;
    onCloseClick: () => void;
    onCancelClick: () => void;
    shiftLoading: boolean;
}

export const PosHeader: React.FC<PosHeaderProps> = ({ 
    isOnline, 
    syncStatus, 
    loading,
    activeShift,
    onOpenClick,
    onCloseClick,
    onCancelClick,
    shiftLoading
}) => {
    return (
        <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-5 rounded-2xl shadow-sm border border-blue-100 mb-4 gap-4">
            <div className="flex items-center gap-4 flex-wrap">
                <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full ${isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {isOnline ? <Wifi size={16} /> : <Wifi size={16} className="opacity-50" />}
                    {isOnline ? "ONLINE" : "OFFLINE MODE (V2 Online Only)"}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                    {loading && <RefreshCw size={12} className="animate-spin" />}
                    {syncStatus}
                </div>
            </div>

            {/* Badge Tura POS */}
            <ShiftActiveBadge
                activeShift={activeShift}
                onOpenClick={onOpenClick}
                onCloseClick={onCloseClick}
                onCancelClick={onCancelClick}
                loading={shiftLoading}
            />
        </div>
    );
};
