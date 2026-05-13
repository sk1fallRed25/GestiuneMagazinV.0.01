import React from 'react';
import { History, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RecentSale } from '../types';

interface RecentSalesCardProps {
    sales: RecentSale[];
}

export const RecentSalesCard: React.FC<RecentSalesCardProps> = ({ sales }) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                    <History size={20} className="text-indigo-600" />
                    Vânzări Recente
                </h3>
                <Link to="/istoric-vanzari" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    VEZI TOT <ChevronRight size={14} />
                </Link>
            </div>
            
            <div className="flex-1">
                {sales.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 font-medium italic">Nicio vânzare înregistrată recent.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                            <tr>
                                <th className="px-6 py-3">Ora</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3">Plată</th>
                                <th className="px-6 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-gray-700">
                                            {new Date(sale.createdAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-black text-gray-900">{sale.total.toFixed(2)}</span>
                                        <span className="text-[10px] text-gray-400 ml-1">LEI</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                            {sale.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-[10px] font-black uppercase ${
                                            sale.status === 'finalized' ? 'text-emerald-600' : 'text-red-500'
                                        }`}>
                                            {sale.status === 'finalized' ? 'OK' : sale.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
