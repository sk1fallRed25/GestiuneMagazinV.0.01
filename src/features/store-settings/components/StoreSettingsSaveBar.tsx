import React from 'react';
import { Save, X, CheckCircle, Loader2 } from 'lucide-react';

interface Props {
  isDirty: boolean;
  saving: boolean;
  saveSuccess: boolean;
  canEdit: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const StoreSettingsSaveBar: React.FC<Props> = ({ isDirty, saving, saveSuccess, canEdit, onSave, onReset }) => {
  if (!canEdit) return null;
  if (!isDirty && !saveSuccess) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-5xl mx-auto px-8 pb-6">
        <div className={`flex items-center justify-between px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
          saveSuccess
            ? 'bg-green-50/95 border-green-200 shadow-green-100'
            : 'bg-white/95 border-gray-200 shadow-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            {saveSuccess ? (
              <>
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-sm font-bold text-green-700">Setările au fost salvate cu succes!</span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-slate-700">Ai modificări nesalvate</span>
              </>
            )}
          </div>
          {isDirty && (
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                data-testid="store-settings-reset-button"
                onClick={onReset} 
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                <X size={16} />Renunță
              </button>
              <button 
                type="button" 
                data-testid="store-settings-save-button"
                onClick={onSave} 
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200 disabled:opacity-50 active:scale-95"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
