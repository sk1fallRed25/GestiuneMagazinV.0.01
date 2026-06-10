import React from 'react';
import { InventoryValueReport } from '../types';
import { Layers, Database, ShieldAlert, Award, FileWarning, Eye } from 'lucide-react';
import { ReportKpiCard } from './ReportKpiCard';

interface Props {
  data: InventoryValueReport;
}

export const InventoryValuePanel: React.FC<Props> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(val);
  };

  // Estimated gross profit margin of current inventory
  const expectedProfit = data.estimatedSaleValue - data.estimatedPurchaseValue;
  const expectedMarginPercent = data.estimatedSaleValue > 0
    ? (expectedProfit / data.estimatedSaleValue) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Stock Valuations KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportKpiCard
          title="Valoare Achiziție Est."
          value={formatCurrency(data.estimatedPurchaseValue)}
          icon={<Layers size={24} className="text-indigo-600" />}
          bgColor="bg-indigo-50"
          description="Cost total de achiziție al stocului"
        />

        <ReportKpiCard
          title="Valoare Vânzare Est."
          value={formatCurrency(data.estimatedSaleValue)}
          icon={<Award size={24} className="text-emerald-600" />}
          bgColor="bg-emerald-50"
          description="Valoare dacă se vinde tot la preț raft"
        />

        <ReportKpiCard
          title="Marjă Potențială"
          value={`${formatNumber(expectedMarginPercent)}%`}
          icon={<Layers size={24} className="text-teal-600" />}
          bgColor="bg-teal-50"
          description={`Marja estimată: ${formatCurrency(expectedProfit)}`}
        />

        <ReportKpiCard
          title="Alerte Critice Stoc"
          value={data.lowStockCount + data.negativeStockCount}
          icon={<ShieldAlert size={24} className="text-rose-600" />}
          bgColor="bg-rose-50"
          description={`${data.lowStockCount} stoc critic / ${data.negativeStockCount} stoc negativ`}
        />
      </div>

      {/* Stock Divisions (Warehouse vs Store) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
              <Layers size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black text-gray-900">{formatNumber(data.totalStockMagazin)}</h4>
              <p className="text-sm text-slate-500 font-medium">Stoc total aflat pe rafturi (Magazin)</p>
            </div>
          </div>
          <span className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-black uppercase">Zona Magazin</span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
              <Database size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black text-gray-900">{formatNumber(data.totalStockDepozit)}</h4>
              <p className="text-sm text-slate-500 font-medium">Stoc total depozitat în spate (Depozit)</p>
            </div>
          </div>
          <span className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-black uppercase">Zona Depozit</span>
        </div>
      </div>

      {/* Dead Stock Candidates (Slow Movers) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileWarning className="text-amber-500" size={20} />
              Candidați Dead Stock (Slow Movers)
            </h4>
            <p className="text-sm text-slate-500 font-medium">Produse cu stoc pozitiv, fără vânzări în ultimele 30 de zile</p>
          </div>
        </div>

        {!data.deadStockCandidates || data.deadStockCandidates.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">
            Felicitări! Nu există produse inactive (dead stock) cu stoc în acest magazin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table data-testid="reports-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Produs</th>
                  <th className="py-3 px-6">Cod Bare</th>
                  <th className="py-3 px-6 text-right">Stoc Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                {data.deadStockCandidates.map((item, idx) => (
                  <tr key={item.productId || idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900">{item.name}</div>
                      <div className="text-xs text-slate-500">ID: {item.productId}</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-gray-500">
                      {item.barcode || 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right text-gray-900 font-bold">
                      {formatNumber(item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
