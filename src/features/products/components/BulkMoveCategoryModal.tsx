import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRightCircle, FolderOpen, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../../shared/components/ui';
import { categoryService } from '../../catalog/categoryService';
import { CategoryWithSubs, CategoryOption } from '../../catalog/types';
import { productService } from '../services/productService';

/* ── Props ─────────────────────────────────────────────────────────── */

interface BulkMoveCategoryModalProps {
    /** Controls visibility */
    open: boolean;
    /** Close callback */
    onClose: () => void;
    /** Active store id */
    storeId: string | null;
    /** Product ids that will be moved */
    selectedProductIds: string[];
    /** First few product names – shown in the summary */
    selectedProductNames: string[];
    /** Callback fired after a successful move (e.g. refresh the table) */
    onSuccess: () => void;
}

/* ── Sentinel values for "no category / no subcategory" ────────────── */

const NO_CATEGORY = '__NONE__';
const NO_SUBCATEGORY = '__NONE__';

/* ── Component ─────────────────────────────────────────────────────── */

const BulkMoveCategoryModal: React.FC<BulkMoveCategoryModalProps> = ({
    open,
    onClose,
    storeId,
    selectedProductIds,
    selectedProductNames,
    onSuccess,
}) => {
    // ── State ──────────────────────────────────────────────────────
    const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(NO_CATEGORY);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>(NO_SUBCATEGORY);

    // ── Load categories when the modal opens ──────────────────────
    const fetchCategories = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);
        try {
            const data = await categoryService.listAllGrouped(storeId);
            setCategories(data);
        } catch (err) {
            console.error('[BulkMoveCategoryModal] Error loading categories:', err);
            toast.error('Nu s-au putut încărca categoriile.');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        if (open) {
            // Reset selections every time the modal opens
            setSelectedCategoryId(NO_CATEGORY);
            setSelectedSubcategoryId(NO_SUBCATEGORY);
            fetchCategories();
        }
    }, [open, fetchCategories]);

    // ── Derived data ──────────────────────────────────────────────

    /** Subcategories of the currently-selected root category */
    const availableSubcategories: CategoryOption[] =
        selectedCategoryId !== NO_CATEGORY
            ? categories.find(c => c.id === selectedCategoryId)?.subcategories ?? []
            : [];

    /** Human-readable label for the selected root category */
    const selectedCategoryName =
        selectedCategoryId === NO_CATEGORY
            ? 'Fără categorie'
            : categories.find(c => c.id === selectedCategoryId)?.name ?? '—';

    /** Human-readable label for the selected subcategory */
    const selectedSubcategoryName =
        selectedSubcategoryId === NO_SUBCATEGORY
            ? 'Fără subcategorie'
            : availableSubcategories.find(s => s.id === selectedSubcategoryId)?.name ?? '—';

    /** The final category_id sent to the backend:
     *  subcategory takes priority → root category → null (no category) */
    const finalCategoryId: string | null =
        selectedSubcategoryId !== NO_SUBCATEGORY
            ? selectedSubcategoryId
            : selectedCategoryId !== NO_CATEGORY
              ? selectedCategoryId
              : null;

    // ── Handlers ──────────────────────────────────────────────────

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCategoryId(e.target.value);
        // Reset subcategory whenever the root category changes
        setSelectedSubcategoryId(NO_SUBCATEGORY);
    };

    const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSubcategoryId(e.target.value);
    };

    const handleConfirm = async () => {
        if (!storeId) return;
        setSubmitting(true);
        try {
            await productService.bulkUpdateCategory(storeId, selectedProductIds, finalCategoryId);
            toast.success(
                `${selectedProductIds.length} ${selectedProductIds.length === 1 ? 'produs mutat' : 'produse mutate'} cu succes.`
            );
            onSuccess();
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Eroare la mutarea produselor.';
            toast.error(message);
            console.error('[BulkMoveCategoryModal] Bulk move error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Truncated product name list for display ───────────────────
    const displayNames = selectedProductNames.slice(0, 3).join(', ');
    const moreCount = selectedProductNames.length > 3 ? selectedProductNames.length - 3 : 0;

    // ── Render ────────────────────────────────────────────────────
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Mută produse în altă categorie"
            description={`Selectează categoria și subcategoria de destinație pentru ${selectedProductIds.length} ${selectedProductIds.length === 1 ? 'produs' : 'produse'}.`}
            size="md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
                    >
                        Anulează
                    </button>
                    <button
                        type="button"
                        data-testid="bulk-move-products-confirm"
                        onClick={handleConfirm}
                        disabled={submitting || loading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-150 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowRightCircle size={16} />
                        {submitting ? 'Se mută…' : 'Confirmă mutarea'}
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* ── Selected products summary ─────────────────────────── */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                        Produse selectate ({selectedProductIds.length})
                    </label>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                        {displayNames}
                        {moreCount > 0 && (
                            <span className="text-slate-400 font-medium">
                                {' '}și încă {moreCount}…
                            </span>
                        )}
                    </p>
                </div>

                {/* ── Category selector ─────────────────────────────────── */}
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        <FolderOpen size={12} className="inline-block mr-1 -mt-0.5 text-indigo-500" />
                        Categorie destinație
                    </label>
                    <select
                        data-testid="bulk-move-products-category"
                        value={selectedCategoryId}
                        onChange={handleCategoryChange}
                        disabled={loading}
                        className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value={NO_CATEGORY}>Fără categorie</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ── Subcategory selector (only when a root category is chosen) */}
                {selectedCategoryId !== NO_CATEGORY && (
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                            <Tag size={12} className="inline-block mr-1 -mt-0.5 text-indigo-500" />
                            Subcategorie destinație
                        </label>
                        <select
                            data-testid="bulk-move-products-subcategory"
                            value={selectedSubcategoryId}
                            onChange={handleSubcategoryChange}
                            disabled={loading || availableSubcategories.length === 0}
                            className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value={NO_SUBCATEGORY}>Fără subcategorie</option>
                            {availableSubcategories.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                    {sub.name}
                                </option>
                            ))}
                        </select>
                        {availableSubcategories.length === 0 && (
                            <p className="text-xs text-slate-400 mt-1.5 ml-1">
                                Categoria selectată nu are subcategorii.
                            </p>
                        )}
                    </div>
                )}

                {/* ── Move summary / preview ────────────────────────────── */}
                <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4">
                    <p className="text-sm font-bold text-amber-800 flex items-start gap-2">
                        <ArrowRightCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                        <span>
                            Muți{' '}
                            <span className="text-amber-900 font-black">
                                {selectedProductIds.length}{' '}
                                {selectedProductIds.length === 1 ? 'produs' : 'produse'}
                            </span>{' '}
                            în categoria{' '}
                            <span className="text-indigo-700 font-black">{selectedCategoryName}</span>
                            {selectedCategoryId !== NO_CATEGORY && (
                                <>
                                    {' / '}
                                    <span className="text-indigo-600 font-black">{selectedSubcategoryName}</span>
                                </>
                            )}
                        </span>
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default BulkMoveCategoryModal;
