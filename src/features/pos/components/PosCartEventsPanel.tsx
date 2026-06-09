import React, { useState, useEffect } from 'react';
import { listCartEvents } from '../services/posCartEventService';
import { ClipboardList, RefreshCw, Trash2, ArrowUpDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PosCartEventsPanelProps {
  storeId: string;
}

export const PosCartEventsPanel: React.FC<PosCartEventsPanelProps> = ({ storeId }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const loadEvents = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const logs = await listCartEvents(storeId);
      setEvents(logs);
    } catch (err) {
      console.error('[CartEventsPanel] Failed to load events:', err);
      toast.error('Eroare la încărcarea jurnalului de evenimente coș.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [storeId]);

  const filteredEvents = events.filter(e => {
    if (filterType === 'all') return true;
    return e.event_type === filterType;
  });

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'item_added':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'item_quantity_changed':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'item_removed':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'cart_cleared':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'cart_restored':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'cart_discarded':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'item_added': return 'Adăugare produs';
      case 'item_quantity_changed': return 'Actualizare cantitate';
      case 'item_removed': return 'Ștergere produs';
      case 'cart_cleared': return 'Golire coș';
      case 'cart_restored': return 'Recuperare coș';
      case 'cart_discarded': return 'Anulare coș recuperat';
      default: return type;
    }
  };

  return (
    <div 
      data-testid="pos-cart-events-panel" 
      className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6"
    >
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={22} className="text-indigo-600" />
            Evenimente Coș POS (Audit local)
          </h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mt-1">
            Jurnal de securitate local pentru acțiunile efectuate asupra produselor din coș (adăugări, ștergeri, goliri).
          </p>
        </div>
        <button 
          onClick={loadEvents} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Se încarcă...' : 'Actualizează'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center text-xs font-semibold">
        <span className="text-gray-400 uppercase tracking-wider text-[10px]">Filtrează după acțiune:</span>
        <button 
          onClick={() => setFilterType('all')} 
          className={`px-3 py-1.5 rounded-lg border transition-all ${filterType === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'}`}
        >
          Toate ({events.length})
        </button>
        <button 
          onClick={() => setFilterType('item_removed')} 
          className={`px-3 py-1.5 rounded-lg border transition-all ${filterType === 'item_removed' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-gray-200 hover:bg-red-50'}`}
        >
          Ștergeri ({events.filter(e => e.event_type === 'item_removed').length})
        </button>
        <button 
          onClick={() => setFilterType('cart_cleared')} 
          className={`px-3 py-1.5 rounded-lg border transition-all ${filterType === 'cart_cleared' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-600 border-gray-200 hover:bg-rose-50'}`}
        >
          Goliri ({events.filter(e => e.event_type === 'cart_cleared').length})
        </button>
        <button 
          onClick={() => setFilterType('item_quantity_changed')} 
          className={`px-3 py-1.5 rounded-lg border transition-all ${filterType === 'item_quantity_changed' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-600 border-gray-200 hover:bg-amber-50'}`}
        >
          Modificări cantitate ({events.filter(e => e.event_type === 'item_quantity_changed').length})
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left text-sm text-gray-600 border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100">
              <th className="py-3.5 px-4">Dată &amp; Oră</th>
              <th className="py-3.5 px-4">Casier</th>
              <th className="py-3.5 px-4">Acțiune</th>
              <th className="py-3.5 px-4">Detalii produs / cantitate</th>
              <th className="py-3.5 px-4">Dispozitiv (FP)</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
                  Nu s-au găsit evenimente de coș care să se potrivească criteriilor.
                </td>
              </tr>
            ) : (
              filteredEvents.map(e => (
                <tr 
                  key={e.id} 
                  data-testid="pos-cart-event-row" 
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono text-xs">
                    {new Date(e.created_at_local).toLocaleString('ro-RO')}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-700 max-w-[120px] truncate" title={e.cashier_profile_id}>
                    {e.cashier_profile_id.substring(0, 8)}...
                  </td>
                  <td className="py-3.5 px-4">
                    <span 
                      data-testid="pos-cart-event-type"
                      className={`inline-block px-2.5 py-1 rounded-lg border text-xs font-bold ${getEventBadgeClass(e.event_type)}`}
                    >
                      {getEventLabel(e.event_type)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4" data-testid="pos-cart-event-product">
                    {e.product_name ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">{e.product_name}</span>
                        <span className="text-xs text-gray-400 font-mono">
                          Cod: {e.barcode || 'N/A'} | Cant: {e.quantity_before} &rarr; {e.quantity_after}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">
                        Acțiune globală coș (Cant: {e.quantity_before} &rarr; {e.quantity_after})
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-gray-400">
                    {e.device_fingerprint ? e.device_fingerprint.substring(0, 12) : 'unknown'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
