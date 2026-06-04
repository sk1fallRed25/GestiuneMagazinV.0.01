import React from 'react';
import { ShoppingCart, RotateCcw, Trash2, Clock } from 'lucide-react';
import { PosCartDraft, CartDraftSummary, getCartDraftSummary } from '../services/posCartRecoveryService';

interface PosCartRecoveryDialogProps {
  draft: PosCartDraft;
  onRestore: () => void;
  onDiscard: () => void;
  onLater: () => void;
}

export const PosCartRecoveryDialog: React.FC<PosCartRecoveryDialogProps> = ({
  draft,
  onRestore,
  onDiscard,
  onLater,
}) => {
  const summary: CartDraftSummary = getCartDraftSummary(draft);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      data-testid="pos-cart-recovery-dialog"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black">Coș nesalvat detectat</h3>
              <p className="text-indigo-200 text-xs font-medium mt-0.5">
                Ai un coș de la o sesiune anterioară
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6" data-testid="pos-cart-recovery-summary">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Produse în coș</span>
              <span className="font-black text-slate-800">{summary.itemCount} produse</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Valoare estimată</span>
              <span className="font-black text-indigo-600">{summary.estimatedTotal.toFixed(2)} lei</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                Salvat la
              </span>
              <span className="font-semibold text-slate-700 text-xs">{formatDate(summary.savedAt)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4 leading-relaxed text-center">
            Coșul salvat este doar un draft local. Nu a fost fiscalizat și nu afectează stocul.
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-3">
          <button
            data-testid="pos-cart-recovery-restore-button"
            onClick={onRestore}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            <RotateCcw size={16} />
            Restaurează coșul
          </button>

          <button
            data-testid="pos-cart-recovery-discard-button"
            onClick={onDiscard}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm border border-red-100 transition-all active:scale-[0.98]"
          >
            <Trash2 size={16} />
            Șterge coșul salvat
          </button>

          <button
            data-testid="pos-cart-recovery-later-button"
            onClick={onLater}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-sm transition-all"
          >
            Amintește-mi mai târziu
          </button>
        </div>
      </div>
    </div>
  );
};
