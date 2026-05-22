import React from 'react';
import { LossesReport } from '../types';
import { Trash2, TrendingDown, Clipboard, AlertCircle } from 'lucide-react';

interface Props {
  data: LossesReport;
}

export const LossesPanel: React.FC<Props> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(val);
  };

  const hasLosses = data.totalWasteQuantity > 0 || (data.byReason && data.byReason.length > 0);

  if (!hasLosses) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
        <Trash2 className="mx-auto text-emerald-300 mb-4" size={48} />
        <h4 className="text-lg font-bold text-gray-700">Fără pierderi înregistrate</h4>
        <p className="text-gray-400 mt-2">Nu s-au înregistrat note de rebut, degradare sau alte pierderi în perioada selectată.</p>
      </div>
    );
  }

  // Find max value in reasons to draw relative progress bars
  const maxReasonValue = data.byReason.reduce((max, r) => Math.max(max, r.value), 0) || 1;

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Trash2 size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Cantitate Totală Casată</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{formatNumber(data.totalWasteQuantity)}</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">Numărul de unități scoase din gestiune</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Valoare Pierderi (Achiziție)</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(data.estimatedWasteValue)}</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">Costul total suportat de magazin</p>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Reasons */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clipboard size={20} />
            </div>
            <h4 className="text-lg font-bold text-gray-800">Distribuție pe Motive Casare</h4>
          </div>

          <div className="space-y-5">
            {data.byReason.map((reasonItem, idx) => {
              const pct = (reasonItem.value / maxReasonValue) * 100;
              return (
                <div key={reasonItem.reason || idx} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-800 font-bold uppercase tracking-wide text-xs">{reasonItem.reason || 'Nespecificat'}</span>
                    <span className="text-gray-900 font-black">{formatCurrency(reasonItem.value)}</span>
                  </div>
                  {/* Progress bar container */}
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400 font-semibold">
                    <span>{reasonItem.count} evenimente înregistrate</span>
                    <span>Cantitate: {formatNumber(reasonItem.quantity)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Top Products Casate */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <h4 className="text-lg font-bold text-gray-800">Top Produse Afectate</h4>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {data.byProduct.map((prod, idx) => (
              <div key={prod.productId || idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-2xl transition-colors border border-gray-50">
                <div className="space-y-0.5">
                  <span className="font-bold text-gray-900 text-sm block">{prod.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {prod.barcode || 'N/A'} | ID: {prod.productId?.slice(0, 8)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-black text-rose-600 text-sm">
                    {formatCurrency(prod.value)}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold">
                    Cant: {formatNumber(prod.quantity)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
