import React from 'react';
import { LogOut, ShoppingCart, Trash2, X } from 'lucide-react';

interface LogoutCartWarningDialogProps {
  onKeepAndLogout: () => void;
  onDiscardAndLogout: () => void;
  onCancel: () => void;
}

export const LogoutCartWarningDialog: React.FC<LogoutCartWarningDialogProps> = ({
  onKeepAndLogout,
  onDiscardAndLogout,
  onCancel,
}) => {
  return (
    <div
      data-testid="logout-cart-warning-dialog"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black">Produse în coș</h3>
              <p className="text-amber-100 text-xs font-medium mt-0.5">
                Ai produse nesalvate în coșul POS
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            Ai produse în coș. Vrei să păstrezi coșul pentru următoarea autentificare?
          </p>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Coșul salvat este doar un draft local și nu afectează stocul sau contabilitatea.
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-3">
          <button
            data-testid="logout-keep-cart-button"
            onClick={onKeepAndLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            <LogOut size={16} />
            Păstrează și deloghează
          </button>

          <button
            data-testid="logout-discard-cart-button"
            onClick={onDiscardAndLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm border border-red-100 transition-all active:scale-[0.98]"
          >
            <Trash2 size={16} />
            Șterge coșul și deloghează
          </button>

          <button
            data-testid="logout-cancel-button"
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-sm transition-all"
          >
            <X size={16} />
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
};
