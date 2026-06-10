import React from 'react';
import { SalesSummaryReport } from '../types';
import { TrendingUp, ShoppingBag, AlertCircle, RotateCcw, DollarSign, CreditCard, Ticket, Activity } from 'lucide-react';
import { ReportKpiCard } from './ReportKpiCard';

interface Props {
  data: SalesSummaryReport;
}

export const SalesSummaryPanel: React.FC<Props> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val);
  };

  const stats = [
    {
      title: 'Vânzări Brute',
      value: formatCurrency(data.grossSales),
      icon: <TrendingUp className="text-emerald-600" size={24} />,
      bgColor: 'bg-emerald-50',
      description: 'Total vânzări brute înregistrate',
    },
    {
      title: 'Vânzări Nete',
      value: formatCurrency(data.netSales),
      icon: <ShoppingBag className="text-indigo-600" size={24} />,
      bgColor: 'bg-indigo-50',
      description: 'Brut minus retururi finalizate',
    },
    {
      title: 'Anulări (Voids)',
      value: formatCurrency(data.voidAmount),
      icon: <AlertCircle className="text-amber-600" size={24} />,
      bgColor: 'bg-amber-50',
      description: `${data.voidCount} bonuri anulate complet`,
    },
    {
      title: 'Retururi (Returns)',
      value: formatCurrency(data.returnAmount),
      icon: <RotateCcw className="text-red-600" size={24} />,
      bgColor: 'bg-red-50',
      description: `${data.returnCount} retururi de produse`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Primary KPI Grid */}
      <div data-testid="reports-kpi-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <ReportKpiCard
            key={idx}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            bgColor={stat.bgColor}
            description={stat.description}
          />
        ))}
      </div>

      {/* Payment Splits & Operational KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Breakdown */}
        <div data-testid="reports-chart-card" className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <h4 className="text-lg font-bold text-gray-800">Sinteză Cash (Numerar)</h4>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Cash Brut</span>
              <span className="font-bold text-gray-800">{formatCurrency(data.cashGross)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Rambursări Cash</span>
              <span className="font-bold text-red-500">-{formatCurrency(data.cashRefunds)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold text-lg">
              <span className="text-gray-900">Cash Net</span>
              <span className="text-emerald-600">{formatCurrency(data.netCash)}</span>
            </div>
          </div>
        </div>

        {/* Card Breakdown */}
        <div data-testid="reports-chart-card" className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <CreditCard size={20} />
            </div>
            <h4 className="text-lg font-bold text-gray-800">Sinteză Card (POS)</h4>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Card Brut</span>
              <span className="font-bold text-gray-800">{formatCurrency(data.cardGross)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Rambursări Card</span>
              <span className="font-bold text-red-500">-{formatCurrency(data.cardRefunds)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold text-lg">
              <span className="text-gray-900">Card Net</span>
              <span className="text-indigo-600">{formatCurrency(data.netCard)}</span>
            </div>
          </div>
        </div>

        {/* Coș Mediu & Alte Info */}
        <div data-testid="reports-chart-card" className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Activity size={20} />
            </div>
            <h4 className="text-lg font-bold text-gray-800">Indicatori de Control</h4>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Valoare Medie Coș</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.averageBasket)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Ture active în sistem</span>
              <span className="font-bold text-gray-900">{data.activeShiftCount}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-500 font-medium">Retururi pe Vouchere</span>
              <span className="font-bold text-amber-600">{formatCurrency(data.voucherRefunds)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
