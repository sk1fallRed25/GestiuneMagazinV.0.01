import React from 'react';
import { ProductPerformanceItem } from '../types';
import { Percent, TrendingUp, BarChart2 } from 'lucide-react';

interface Props {
  products: ProductPerformanceItem[];
}

export const ProductPerformancePanel: React.FC<Props> = ({ products }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(val);
  };

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
        <BarChart2 className="mx-auto text-gray-300 mb-4 animate-bounce" size={48} />
        <h4 className="text-lg font-bold text-gray-700">Niciun produs vândut</h4>
        <p className="text-gray-400 mt-2">Nu s-au înregistrat tranzacții pentru produsele din acest magazin în perioada selectată.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header and Summary stats inside panel */}
      <div className="p-6 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h4 className="text-lg font-bold text-gray-800">Clasament Performanță Produse</h4>
          <p className="text-sm text-gray-400 font-medium">Ordonat descrescător după Venitul Net</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm flex items-center gap-2">
            <TrendingUp size={16} />
            Top {products.length} Produse
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3 px-6">Produs</th>
              <th className="py-3 px-6 text-right">Cod Bare</th>
              <th className="py-3 px-6 text-right">Cant. Brută</th>
              <th className="py-3 px-6 text-right">Retururi</th>
              <th className="py-3 px-6 text-right">Cant. Netă</th>
              <th className="py-3 px-6 text-right">Venit Brut</th>
              <th className="py-3 px-6 text-right">Venit Net</th>
              <th className="py-3 px-6 text-right">Cost (COGS)</th>
              <th className="py-3 px-6 text-right">Profit Est.</th>
              <th className="py-3 px-6 text-right">Marjă %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
            {products.map((item, idx) => {
              const isHighMargin = item.marginPercent >= 30;
              const isNegativeProfit = item.estimatedProfit < 0;

              return (
                <tr key={item.productId || idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">ID: {item.productId?.slice(0, 8)}...</div>
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-xs text-gray-500">
                    {item.barcode || 'N/A'}
                  </td>
                  <td className="py-4 px-6 text-right text-gray-600">
                    {formatNumber(item.quantitySoldGross)}
                  </td>
                  <td className="py-4 px-6 text-right text-red-500">
                    {item.quantityReturned > 0 ? `-${formatNumber(item.quantityReturned)}` : '0'}
                  </td>
                  <td className="py-4 px-6 text-right text-gray-900 font-semibold">
                    {formatNumber(item.quantitySoldNet)}
                  </td>
                  <td className="py-4 px-6 text-right text-gray-600">
                    {formatCurrency(item.grossRevenue)}
                  </td>
                  <td className="py-4 px-6 text-right text-gray-900 font-bold">
                    {formatCurrency(item.netRevenue)}
                  </td>
                  <td className="py-4 px-6 text-right text-gray-500">
                    {formatCurrency(item.estimatedCogs)}
                  </td>
                  <td className={`py-4 px-6 text-right font-bold ${isNegativeProfit ? 'text-red-500' : 'text-emerald-600'}`}>
                    {formatCurrency(item.estimatedProfit)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                      isNegativeProfit ? 'bg-red-50 text-red-600' : (isHighMargin ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')
                    }`}>
                      {formatNumber(item.marginPercent)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
