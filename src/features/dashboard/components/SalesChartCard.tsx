import React from 'react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { SalesChartPoint } from '../types';

interface SalesChartCardProps {
    data: SalesChartPoint[];
}

export const SalesChartCard: React.FC<SalesChartCardProps> = ({ data }) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-emerald-50/30">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                    <TrendingUp size={20} className="text-emerald-600" />
                    Evoluție Vânzări
                </h3>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase">
                    ULTIMELE 7 ZILE
                </span>
            </div>

            <div className="p-6 flex-1 h-[300px] min-h-[300px]">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 font-medium italic">
                        Date insuficiente pentru grafic.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                dy={10}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return d.toLocaleDateString('ro-RO', { weekday: 'short' });
                                }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    padding: '12px'
                                }}
                                labelStyle={{ fontWeight: 900, marginBottom: '4px', fontSize: '12px' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="total" 
                                stroke="#10b981" 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorTotal)" 
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
