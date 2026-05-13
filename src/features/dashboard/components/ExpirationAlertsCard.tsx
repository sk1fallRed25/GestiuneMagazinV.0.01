import React from 'react';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { ExpirationAlert } from '../types';

interface ExpirationAlertsCardProps {
    alerts: ExpirationAlert[];
}

export const ExpirationAlertsCard: React.FC<ExpirationAlertsCardProps> = ({ alerts }) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-orange-50/30">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                    <CalendarClock size={20} className="text-orange-500" />
                    Termene Expirare
                </h3>
                <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 uppercase">
                    LOTURI CRITICE
                </span>
            </div>

            <div className="flex-1">
                {alerts.length === 0 ? (
                    <div className="p-10 text-center text-emerald-500 font-bold bg-emerald-50/20">
                        Niciun lot cu risc de expirare detectat.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {alerts.map((a) => (
                            <div key={a.batchId} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div className="flex gap-3 items-center">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        a.status === 'expired' ? 'bg-red-50 text-red-500' : 
                                        a.status === 'critical' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                                    }`}>
                                        <AlertCircle size={20} />
                                    </div>
                                    <div className="max-w-[150px]">
                                        <h4 className="text-sm font-bold text-gray-800 truncate">{a.productName}</h4>
                                        <p className="text-[10px] text-gray-400 font-mono">Lot: {a.batchNumber || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black ${
                                        a.status === 'expired' ? 'text-red-600' : 
                                        a.status === 'critical' ? 'text-orange-600' : 'text-blue-600'
                                    }`}>
                                        {a.daysUntilExpiry < 0 ? 'EXPIRAT' : (a.daysUntilExpiry === 0 ? 'AZI' : `${a.daysUntilExpiry} zile`)}
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{a.expiryDate}</p>
                                    <p className="text-[9px] font-medium text-gray-400 italic">zona: {a.zone}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
