import React, { useState, useRef, useEffect } from 'react';
import { StoreMembership } from '../../features/auth/types';
import { Store, ChevronDown, Check, Building2 } from 'lucide-react';

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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (storeId: string) => {
    if (storeId === currentStoreId) {
      setIsOpen(false);
      return;
    }
    
    const confirmed = window.confirm(
      isOwner 
        ? "Schimbi în contextul operațional al magazinului selectat?" 
        : "Schimbi magazinul activ? Datele afișate vor fi filtrate pentru noul punct de lucru."
    );
    if (confirmed) {
      await onSelectStore(storeId);
      setIsOpen(false);
    }
  };

  if (availableStores.length === 0) {
    if (isOwner) {
      return (
        <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm">
          <Building2 size={15} className="text-indigo-600" />
          <span className="text-xs font-bold text-indigo-700 tracking-wide uppercase font-sans">Platform Administration</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
        <Store size={14} className="text-slate-400" />
        <span className="text-xs text-slate-500 font-medium font-sans">Fără magazin alocat</span>
      </div>
    );
  }

  const currentMembership = availableStores.find(m => m.store_id === currentStoreId) || (isOwner ? null : availableStores[0]);

  if (availableStores.length === 1 && !isOwner) {
    return (
      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
        <Store size={15} className="text-indigo-600 shrink-0" />
        <div className="text-left font-sans">
          <p className="text-xs font-bold text-slate-700 leading-tight truncate max-w-[180px]">
            {currentMembership?.storeName || currentMembership?.store?.name || 'Magazin'}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
            <span>{currentMembership?.displayCode}</span>
            <span>·</span>
            <span className="text-indigo-600 font-semibold">{currentMembership?.role}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 group"
        aria-label="Alege context operațional"
      >
        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors shrink-0">
          {currentMembership ? <Store size={15} /> : <Building2 size={15} className="text-indigo-600" />}
        </div>
        <div className="text-left">
          {currentMembership ? (
            <>
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[160px]">
                {isOwner ? `Context activ: ${currentMembership.storeName || currentMembership.store?.name}` : (currentMembership.storeName || currentMembership.store?.name || 'Magazin')}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                <span>{currentMembership.displayCode}</span>
                <span>·</span>
                <span className="text-indigo-600 font-semibold">{currentMembership.role}</span>
              </p>
            </>
          ) : (
            <div className="flex flex-col">
              <span className="text-xs font-bold text-indigo-700 tracking-wide uppercase font-sans">
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
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Magazine disponibile</span>
            <span className="text-[10px] font-semibold bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-full">
              {availableStores.length + (isOwner ? 1 : 0)}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {isOwner && (
              <button
                onClick={async () => {
                  if (!currentStoreId) {
                    setIsOpen(false);
                    return;
                  }
                  const confirmed = window.confirm("Revii la administrarea globală a platformei?");
                  if (confirmed) {
                    await onSelectStore('');
                    setIsOpen(false);
                  }
                }}
                className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                  !currentStoreId ? 'bg-indigo-50/50 hover:bg-indigo-50/80' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3 pr-2 overflow-hidden">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    !currentStoreId ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Building2 size={15} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${!currentStoreId ? 'text-indigo-950' : 'text-slate-700'}`}>
                      Platform Administration
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Fără magazin selectat
                    </p>
                  </div>
                </div>
                {!currentStoreId && (
                  <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Check size={12} />
                  </div>
                )}
              </button>
            )}

            {availableStores.map((store) => {
              const isSelected = store.store_id === currentStoreId;
              return (
                <button
                  key={store.store_id}
                  onClick={() => handleSelect(store.store_id)}
                  className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 pr-2 overflow-hidden">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Store size={15} />
                    </div>
                    <div className="overflow-hidden">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>
                        {store.storeName || store.store?.name || 'Magazin'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {store.displayCode}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
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
          </div>
        </div>
      )}
    </div>
  );
};
