import React from 'react';
import { DailyCashReport, ShiftReport } from '../types';
import { Calendar, User, Layout, ArrowRight, DollarSign, Wallet, ShieldAlert, CheckCircle2, RefreshCw, X } from 'lucide-react';

interface Props {
  dailyCash: DailyCashReport | null;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedShiftId: string | null;
  shiftReport: ShiftReport | null;
  loadingShift: boolean;
  fetchShiftReport: (shiftId: string) => void;
  clearShiftReport: () => void;
}

export const DailyCashPanel: React.FC<Props> = ({
  dailyCash,
  selectedDate,
  setSelectedDate,
  selectedShiftId,
  shiftReport,
  loadingShift,
  fetchShiftReport,
  clearShiftReport
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long' }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('ro-RO', { dateStyle: 'short', timeStyle: 'short' }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Filter & Control Banner */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-wrap justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-800">Reconciliere Zilnică Casă</h4>
            <p className="text-sm text-gray-400 font-medium">Auditul turelor și verificarea soldurilor monetare</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-500">Dată control:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              clearShiftReport();
              setSelectedDate(e.target.value);
            }}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Control Totals Banner */}
      {dailyCash && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
            <Wallet size={200} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Deschidere Totală</p>
            <h3 className="text-2xl font-black mt-1">{formatCurrency(dailyCash.totalOpeningCash)}</h3>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Așteptat în Sertar</p>
            <h3 className="text-2xl font-black mt-1">{formatCurrency(dailyCash.totalExpectedCash)}</h3>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Declarat la Închidere</p>
            <h3 className="text-2xl font-black mt-1">{formatCurrency(dailyCash.totalDeclaredCash)}</h3>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Diferență Casă</p>
            <h3 className={`text-2xl font-black mt-1 ${dailyCash.totalCashDifference === 0 ? 'text-emerald-400' : (dailyCash.totalCashDifference > 0 ? 'text-amber-400' : 'text-rose-400')}`}>
              {dailyCash.totalCashDifference > 0 ? '+' : ''}{formatCurrency(dailyCash.totalCashDifference)}
            </h3>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Shifts, Right = Selected Shift Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Shifts List (Left) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h5 className="font-bold text-gray-800 mb-4">Ture înregistrate pe {formatDate(selectedDate)}</h5>
            
            {!dailyCash || dailyCash.shifts.length === 0 ? (
              <div className="py-8 text-center text-gray-400 font-medium">
                Nicio tură deschisă în această zi.
              </div>
            ) : (
              <div className="space-y-3">
                {dailyCash.shifts.map((shift) => {
                  const isSelected = selectedShiftId === shift.shiftId;
                  const diff = shift.cashDifference ?? 0;
                  const hasDiscrepancy = diff !== 0;

                  return (
                    <button
                      key={shift.shiftId}
                      onClick={() => fetchShiftReport(shift.shiftId)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' 
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${shift.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          <span className="font-bold text-gray-900">{shift.registerName || 'Casă Fără Nume'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                          <User size={12} />
                          {shift.cashierName || 'Operator'}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400">
                          ID: {shift.shiftId.slice(0, 8)}...
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <div className="font-bold text-gray-900">{formatCurrency(shift.expectedCash)}</div>
                        {shift.status === 'closed' ? (
                          <div className={`text-xs font-black uppercase ${hasDiscrepancy ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {hasDiscrepancy ? `Diff: ${diff > 0 ? '+' : ''}${formatCurrency(diff)}` : 'OK (Fără diferențe)'}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-black uppercase">
                            Activă
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Shift Details (Right) */}
        <div className="lg:col-span-7">
          {loadingShift ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <RefreshCw className="text-indigo-600 animate-spin mb-4" size={36} />
              <p className="text-gray-400 font-black uppercase tracking-wider text-xs">Se încarcă jurnalul de tură...</p>
            </div>
          ) : shiftReport ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Shift details header */}
              <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-black text-gray-900 text-lg">Detalii Tură Casă</h5>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      shiftReport.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-800'
                    }`}>
                      {shiftReport.status === 'open' ? 'Activă' : 'Închisă'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-1">ID: {shiftReport.shiftId}</p>
                </div>
                <button 
                  onClick={clearShiftReport}
                  className="p-2 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Grid of values */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100">
                {/* Control audit information */}
                <div className="space-y-4">
                  <h6 className="text-xs font-black uppercase text-gray-400 tracking-wider">Audit Monetar (Cash)</h6>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-gray-50 font-medium text-gray-600">
                      <span>Fond Sertar (Opening)</span>
                      <span className="font-bold text-gray-900">{formatCurrency(shiftReport.openingCash)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50 font-medium text-gray-600">
                      <span>Vânzări Cash</span>
                      <span className="font-bold text-gray-900">{formatCurrency(shiftReport.cashSales)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50 font-medium text-gray-600">
                      <span>Retururi Cash</span>
                      <span className="font-bold text-red-500">-{formatCurrency(shiftReport.cashReturns)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50 font-semibold text-gray-800">
                      <span>Numerar Așteptat</span>
                      <span className="font-bold text-gray-900">{formatCurrency(shiftReport.expectedCash)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50 font-semibold text-gray-800">
                      <span>Numerar Declarat</span>
                      <span className="font-bold text-gray-900">
                        {shiftReport.declaredCash !== null ? formatCurrency(shiftReport.declaredCash) : 'Nedeclarat'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-gray-900">
                      <span>Diferență Sertar</span>
                      <span className={`${shiftReport.cashDifference === 0 ? 'text-emerald-600' : (shiftReport.cashDifference! > 0 ? 'text-amber-600' : 'text-red-500')}`}>
                        {shiftReport.cashDifference! > 0 ? '+' : ''}{formatCurrency(shiftReport.cashDifference ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card and transaction counts */}
                <div className="space-y-4">
                  <h6 className="text-xs font-black uppercase text-gray-400 tracking-wider">Tranzacții & POS Card</h6>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-gray-50 font-medium text-gray-600">
                      <span>Vânzări Card</span>
                      <span className="font-bold text-gray-900">{formatCurrency(shiftReport.cardSales)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50 font-medium text-gray-600">
                      <span>Retururi Card</span>
                      <span className="font-bold text-red-500">-{formatCurrency(shiftReport.cardReturns)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50 font-medium text-gray-600">
                      <span>Tranzacții Finalizate</span>
                      <span className="font-bold text-gray-900">{shiftReport.transactionsCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-50 font-medium text-gray-600">
                      <span>Anulări (Voids)</span>
                      <span className="font-bold text-amber-600">{shiftReport.voidsCount}</span>
                    </div>
                    <div className="flex justify-between pt-1 font-medium text-gray-600">
                      <span>Retururi totale</span>
                      <span className="font-bold text-gray-900">{shiftReport.returnsCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time logs */}
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-6 text-xs font-medium text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">Deschisă la:</span>
                  <span>{formatDateTime(shiftReport.openedAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">Închisă la:</span>
                  <span>{formatDateTime(shiftReport.closedAt)}</span>
                </div>
              </div>

              {/* Sales List within shift */}
              <div className="p-6 space-y-3">
                <h6 className="text-xs font-black uppercase text-gray-400 tracking-wider">Tranzacții Recente din Tură ({shiftReport.salesList.length})</h6>
                {shiftReport.salesList.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    Nicio vânzare înregistrată în această tură.
                  </div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50">
                    {shiftReport.salesList.map((sale) => (
                      <div key={sale.saleId} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(sale.total)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            ID: {sale.saleId.slice(0, 8)}... | {formatDateTime(sale.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">
                            {sale.paymentMethod || 'cash'}
                          </span>
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            sale.status === 'finalized' ? 'bg-emerald-500' : (sale.status === 'returned' ? 'bg-red-500' : 'bg-amber-500')
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <ArrowRight className="text-gray-300 mb-4 animate-pulse" size={48} />
              <h5 className="font-bold text-gray-700">Audit Tură</h5>
              <p className="text-sm text-gray-400 mt-2 max-w-xs">
                Selectează o tură din lista din stânga pentru a-i vedea auditul monetar, vânzările detaliate și declarările.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
