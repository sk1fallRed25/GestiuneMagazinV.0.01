import React, { useState } from 'react';
import { useCommercialReports } from './hooks/useCommercialReports';
import { SalesSummaryPanel } from './components/SalesSummaryPanel';
import { ProductPerformancePanel } from './components/ProductPerformancePanel';
import { DailyCashPanel } from './components/DailyCashPanel';
import { InventoryValuePanel } from './components/InventoryValuePanel';
import { LossesPanel } from './components/LossesPanel';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Trash2, 
  Calendar, 
  BrainCircuit, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';

type TabType = 'sales' | 'products' | 'cash' | 'inventory' | 'losses';

export const ReportsPage: React.FC = () => {
  const { role } = useAuth();
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectedDate,
    setSelectedDate,
    selectedShiftId,
    loading,
    error,
    salesSummary,
    productPerformance,
    dailyCash,
    inventoryValue,
    losses,
    shiftReport,
    loadingShift,
    hasAccess,
    fetchAllReports,
    fetchShiftReport,
    clearShiftReport
  } = useCommercialReports();

  const [activeTab, setActiveTab] = useState<TabType>('sales');

  // 1. Permission checks
  if (!hasAccess) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center font-sans">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Acces Interzis</h2>
        <p className="text-gray-600 font-medium max-w-md">Nu ai permisiunea necesară pentru rapoarte comerciale.</p>
      </div>
    );
  }

  if (error && error.includes('Selectează un magazin')) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center font-sans">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-100">
          <BrainCircuit size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Rapoarte Comerciale</h2>
        <p className="text-gray-600 font-medium max-w-md">Selectează un magazin pentru a vedea rapoartele.</p>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'sales', label: 'Vânzări / Finaciar', icon: <TrendingUp size={18} /> },
    { id: 'products', label: 'Performanță Produse', icon: <BarChart3 size={18} /> },
    { id: 'cash', label: 'Reconciliere Casă', icon: <DollarSign size={18} /> },
    { id: 'inventory', label: 'Valoare Inventar', icon: <Layers size={18} /> },
    { id: 'losses', label: 'Pierderi / Casări', icon: <Trash2 size={18} /> },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto pb-20 font-sans bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Rapoarte Comerciale</h1>
          <p className="text-gray-400 font-medium mt-1">Sinteză financiară și operațională completă pentru management</p>
        </div>
        <button
          onClick={fetchAllReports}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-md shadow-indigo-100 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Se încarcă...' : 'Actualizează'}
        </button>
      </div>

      {/* Global Date Filter for tabs (except cash report which has its own daily selector) */}
      {activeTab !== 'cash' && activeTab !== 'inventory' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-wrap items-center gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar size={18} />
            </div>
            <span className="text-sm font-semibold text-gray-600">Interval analiză:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase">De la:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold uppercase">Până la:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-px mb-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-bold border-b-2 transition-all whitespace-nowrap text-sm ${
                isActive 
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' 
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error state display (non-store specific error) */}
      {error && !error.includes('Selectează un magazin') && (
        <div className="bg-red-50 text-red-700 p-6 rounded-3xl mb-8 flex items-start gap-4 border border-red-100">
          <AlertTriangle size={24} className="flex-shrink-0" />
          <div>
            <h5 className="font-bold">Eroare la încărcarea datelor</h5>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Panels content */}
      <div className="transition-all duration-300">
        {loading && !salesSummary && (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Se generează raportul comercial...</p>
          </div>
        )}

        {(!loading || salesSummary) && (
          <>
            {activeTab === 'sales' && salesSummary && (
              <SalesSummaryPanel data={salesSummary} />
            )}

            {activeTab === 'products' && productPerformance && (
              <ProductPerformancePanel products={productPerformance} />
            )}

            {activeTab === 'cash' && (
              <DailyCashPanel
                dailyCash={dailyCash}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedShiftId={selectedShiftId}
                shiftReport={shiftReport}
                loadingShift={loadingShift}
                fetchShiftReport={fetchShiftReport}
                clearShiftReport={clearShiftReport}
              />
            )}

            {activeTab === 'inventory' && inventoryValue && (
              <InventoryValuePanel data={inventoryValue} />
            )}

            {activeTab === 'losses' && losses && (
              <LossesPanel data={losses} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
