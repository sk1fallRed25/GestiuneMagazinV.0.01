import React from 'react';
import { StoreReportsSettings, StoreAlertsSettings } from '../types';
import { BarChart3, Bell } from 'lucide-react';

interface Props {
  reports: StoreReportsSettings;
  alerts: StoreAlertsSettings;
  disabled: boolean;
  onChangeReports: (updated: StoreReportsSettings) => void;
  onChangeAlerts: (updated: StoreAlertsSettings) => void;
}

export const StoreReportsAlertsPanel: React.FC<Props> = ({ reports, alerts, disabled, onChangeReports, onChangeAlerts }) => {
  const inputCls = `w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;
  const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';
  const toggleCls = (active: boolean) =>
    `flex-1 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`;

  return (
    <div className="space-y-6">
      {/* Reports */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4">
          <div className="w-11 h-11 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center"><BarChart3 size={22} /></div>
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Rapoarte</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Configurare zi de business și fus orar</p>
          </div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Ora Start Zi Business</label>
              <input type="number" value={reports.businessDayStartHour} disabled={disabled} min={0} max={23}
                onChange={(e) => onChangeReports({ ...reports, businessDayStartHour: Math.min(23, Math.max(0, parseInt(e.target.value) || 0)) })}
                className={inputCls} />
              <p className="text-[10px] text-gray-400 font-semibold mt-1 ml-1">Între 0 și 23. Standard: 6 (06:00)</p>
            </div>
            <div>
              <label className={labelCls}>Fus Orar</label>
              <select value={reports.timezone} disabled={disabled}
                onChange={(e) => onChangeReports({ ...reports, timezone: e.target.value })}
                className={inputCls}>
                <option value="Europe/Bucharest">Europe/Bucharest</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center gap-4">
          <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center"><Bell size={22} /></div>
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Alerte Operaționale</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Notificări pentru stocuri, expirări și diferențe casă</p>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label className={labelCls}>Alertă Stoc Scăzut</label>
            <div className="flex gap-3">
              <button type="button" className={toggleCls(alerts.alertLowStockEnabled)} disabled={disabled}
                onClick={() => onChangeAlerts({ ...alerts, alertLowStockEnabled: true })}>Activat</button>
              <button type="button" className={toggleCls(!alerts.alertLowStockEnabled)} disabled={disabled}
                onClick={() => onChangeAlerts({ ...alerts, alertLowStockEnabled: false })}>Dezactivat</button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Alertă Expirare Produse</label>
            <div className="flex gap-3">
              <button type="button" className={toggleCls(alerts.alertExpiryEnabled)} disabled={disabled}
                onClick={() => onChangeAlerts({ ...alerts, alertExpiryEnabled: true })}>Activat</button>
              <button type="button" className={toggleCls(!alerts.alertExpiryEnabled)} disabled={disabled}
                onClick={() => onChangeAlerts({ ...alerts, alertExpiryEnabled: false })}>Dezactivat</button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Limită Diferență Numerar (RON)</label>
            <input type="number" value={alerts.alertCashDifferenceLimit} disabled={disabled} min={0} step={0.5}
              onChange={(e) => onChangeAlerts({ ...alerts, alertCashDifferenceLimit: Math.max(0, parseFloat(e.target.value) || 0) })}
              className={inputCls} />
            <p className="text-[10px] text-gray-400 font-semibold mt-1 ml-1">Diferența maximă acceptată la închiderea turei (RON)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
