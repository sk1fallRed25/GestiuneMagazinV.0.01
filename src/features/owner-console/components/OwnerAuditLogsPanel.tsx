import React, { useState, useMemo } from 'react';
import { History, Search, Filter, RefreshCw, Eye, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { OwnerAuditLogView, OwnerAuditAction } from '../types';

interface OwnerAuditLogsPanelProps {
  logs: OwnerAuditLogView[];
  loading?: boolean;
  onRefresh: () => void;
}

export const OwnerAuditLogsPanel: React.FC<OwnerAuditLogsPanelProps> = ({
  logs,
  loading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<OwnerAuditLogView | null>(null);

  const uniqueStores = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.storeName)));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch =
        log.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.summary.toLowerCase().includes(searchTerm.toLowerCase());

      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      const matchStore = storeFilter === 'all' || log.storeName === storeFilter;

      return matchSearch && matchAction && matchStore;
    });
  }, [logs, searchTerm, actionFilter, storeFilter]);

  const getActionBadge = (action: OwnerAuditAction) => {
    switch (action) {
      case 'store.create':
        return { label: 'Creare Magazin', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' };
      case 'store.update':
        return { label: 'Editare Magazin', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' };
      case 'member.assign':
        return { label: 'Alocare Membru', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' };
      case 'member.role_update':
        return { label: 'Modificare Rol', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' };
      case 'member.active_update':
        return { label: 'Stare Membru', className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20' };
      default:
        return { label: action, className: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Audit Logs</span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-full">
                {logs.length} Înregistrări
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Trasabilitate completă a acțiunilor administrative critice din Owner Console
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Caută după magazin, actor, detalii..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="pl-8 pr-8 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Toate Acțiunile</option>
              <option value="store.create">Creare Magazin</option>
              <option value="store.update">Editare Magazin</option>
              <option value="member.assign">Alocare Membru</option>
              <option value="member.role_update">Modificare Rol</option>
              <option value="member.active_update">Stare Membru</option>
            </select>
          </div>

          {/* Store Filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="pl-8 pr-8 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Toate Magazinele</option>
              {uniqueStores.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-xl transition-all disabled:opacity-50"
            title="Reîmprospătează audit logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Data & Ora</th>
                <th className="py-3.5 px-6">Acțiune</th>
                <th className="py-3.5 px-6">Magazin / Punct Lucru</th>
                <th className="py-3.5 px-6">Actor (Email)</th>
                <th className="py-3.5 px-6">Rezumat Acțiune</th>
                <th className="py-3.5 px-6 text-right">Detalii</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Se încarcă logurile de audit...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    {logs.length === 0
                      ? "Nu există nicio înregistrare de audit în sistem."
                      : "Niciun log de audit nu corespunde filtrelor selectate."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-4 px-6 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('ro-RO')}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">
                        {log.storeName}
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-gray-600 dark:text-gray-300">
                        {log.actorEmail}
                      </td>
                      <td className="py-4 px-6 text-gray-700 dark:text-gray-200 max-w-md truncate">
                        {log.summary}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-indigo-600 group-hover:text-white text-xs font-bold transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspectează</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detalii Înregistrare Audit</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Magazin / Entitate</div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{selectedLog.storeName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tip entitate: <span className="font-mono font-semibold">{selectedLog.entityType}</span></div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Actor Administrativ</div>
                  <div className="font-bold font-mono text-sm text-indigo-600 dark:text-indigo-400">{selectedLog.actorEmail}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rol: Platform Owner</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data și Ora</div>
                  <div className="font-bold text-sm font-mono text-gray-900 dark:text-white">{new Date(selectedLog.createdAt).toLocaleString('ro-RO')}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                    <span>Acțiune: {selectedLog.action}</span>
                  </div>
                </div>
              </div>

              {/* Summary Banner */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rezumat Acțiune</h4>
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  {selectedLog.summary}
                </div>
              </div>

              {/* Diff / Payload Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Old Data */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date Anterioare (oldData)</h4>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">Înainte de modificare</span>
                  </div>
                  <div className="p-4 bg-gray-900 rounded-2xl font-mono text-xs text-gray-200 overflow-x-auto max-h-80 shadow-inner border border-gray-800">
                    {selectedLog.oldData ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.oldData, null, 2)}</pre>
                    ) : (
                      <div className="text-gray-500 italic py-4 text-center">Nicio dată anterioară (Ex: Creare entitate nouă)</div>
                    )}
                  </div>
                </div>

                {/* New Data */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date Noi (newData)</h4>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-md">După modificare</span>
                  </div>
                  <div className="p-4 bg-gray-900 rounded-2xl font-mono text-xs text-emerald-400 overflow-x-auto max-h-80 shadow-inner border border-gray-800 relative">
                    {selectedLog.newData ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.newData, null, 2)}</pre>
                    ) : (
                      <div className="text-gray-500 italic py-4 text-center">Nicio dată nouă</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all"
              >
                <span>Închide Inspector</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
