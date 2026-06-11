import React, { useState, useRef, useEffect } from 'react';
import { StoreMembership } from '../../features/auth/types';
import { Store, ChevronDown, Check, Building2, ShieldCheck } from 'lucide-react';

interface StoreContextSwitcherProps {
  availableStores: StoreMembership[];
  currentStoreId: string | null;
  onSelectStore: (storeId: string) => Promise<void>;
  isOwner?: boolean;
}

export const StoreContextSwitcher: React.FC<StoreContextSwitcherProps> = ({
  availableStores,
  currentStoreId,
  onSelectStore,
  isOwner = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOwner) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOwner]);

  // 1. Platform Owner static badge early return (safe context lockdown)
  if (isOwner) {
    return (
      <div 
        className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm select-none"
        title="Platform Owner nu operează direct într-un magazin. Alege magazinul din panourile dedicate din Consolă Proprietar."
        aria-label="Platform Owner activează administrarea globală. Selectarea magazinelor se face din Consolă Proprietar."
      >
        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
          <ShieldCheck size={15} />
        </div>
        <div className="text-left font-sans">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-700 tracking-wide uppercase">
              Platform Administration
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
              Fără magazin activ
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            Administrare globală
          </span>
        </div>
      </div>
    );
  }

  const handleSelect = async (storeId: string) => {
    if (storeId === currentStoreId) {
      setIsOpen(false);
      return;
    }
    
    const targetStore = availableStores.find(m => m.store_id === storeId);
    if (!targetStore || targetStore.lifecycleStatus !== 'active') {
      return; // Blocat
    }

    const confirmed = window.confirm(
      "Schimbi magazinul activ? Datele afișate vor fi filtrate pentru noul punct de lucru."
    );
    if (confirmed) {
      await onSelectStore(storeId);
      setIsOpen(false);
    }
  };

  if (availableStores.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
        <Store size={14} className="text-slate-400" />
        <span className="text-xs text-slate-500 font-medium font-sans">Fără magazin alocat</span>
      </div>
    );
  }

  const currentMembership = availableStores.find(m => m.store_id === currentStoreId) || availableStores[0];

  const activeStores = availableStores.filter(m => m.lifecycleStatus === 'active' || m.store?.active);
  const inactiveStores = availableStores.filter(m => !(m.lifecycleStatus === 'active' || m.store?.active));

  // 2. Single store: static badge return
  if (availableStores.length === 1) {
    return (
      <div className="flex items-center gap-2.5 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm select-none">
        <Store size={15} className="text-indigo-600 shrink-0" />
        <div className="text-left font-sans">
          <p className="text-xs font-bold text-slate-700 leading-tight truncate max-w-[180px]">
            {currentMembership?.storeName || currentMembership?.store?.name || 'Magazin'}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
            <span>{currentMembership?.displayCode}</span>
            <span>·</span>
            <span className="text-indigo-655 font-semibold uppercase text-[9px]">{currentMembership?.role}</span>
          </p>
        </div>
      </div>
    );
  }

  // 3. Multi-store: Interactive dropdown switcher
  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        id="store-context-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-205 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 group cursor-pointer"
        aria-label="Alege context operațional"
        title="Schimbă punctul de lucru"
      >
        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors shrink-0">
          {currentMembership ? <Store size={15} /> : <Building2 size={15} className="text-indigo-600" />}
        </div>
        <div className="text-left">
          {currentMembership ? (
            <>
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[160px]">
                {currentMembership.storeName || currentMembership.store?.name || 'Magazin'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                <span>{currentMembership.displayCode}</span>
                <span>·</span>
                <span className="text-indigo-600 font-semibold uppercase text-[9px]">{currentMembership.role}</span>
              </p>
            </>
          ) : (
            <div className="flex flex-col">
              <span className="text-xs font-bold text-indigo-700 tracking-wide uppercase font-sans text-[10px]">
                Platform Administration
              </span>
              <span className="text-[10px] text-indigo-500 font-medium font-sans">
                Fără magazin selectat
              </span>
            </div>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Magazine disponibile</span>
            <span className="text-[10px] font-semibold bg-slate-200/70 text-slate-650 px-2 py-0.5 rounded-full">
              {availableStores.length}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {activeStores.map((store) => {
              const isSelected = store.store_id === currentStoreId;
              return (
                <button
                  key={store.store_id}
                  onClick={() => handleSelect(store.store_id)}
                  className={`w-full text-left p-3 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-55/50 hover:bg-indigo-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 pr-2 overflow-hidden">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Store size={15} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>
                          {store.storeName || store.store?.name || 'Magazin'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {store.displayCode}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                          isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-650'
                        }`}>
                          {store.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              );
            })}

            {inactiveStores.length > 0 && (
              <>
                <div className="p-2 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center border-t border-b border-slate-200">
                  Magazine Inactive / Arhivate
                </div>
                {inactiveStores.map((store) => {
                  const isSelected = store.store_id === currentStoreId;
                  const isArchived = store.lifecycleStatus === 'archived';
                  return (
                    <button
                      key={store.store_id}
                      disabled={true}
                      className="w-full text-left p-3 flex items-center justify-between transition-colors opacity-50 cursor-not-allowed bg-slate-50/50"
                    >
                      <div className="flex items-start gap-3 pr-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-slate-200 text-slate-450">
                          <Store size={15} />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold truncate text-slate-500">
                              {store.storeName || store.store?.name || 'Magazin'}
                            </p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isArchived ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isArchived ? 'Arhivat' : 'Suspendat'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono font-medium text-slate-550 bg-slate-100 px-1.5 py-0.5 rounded">
                              {store.displayCode}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-650">
                              {store.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
