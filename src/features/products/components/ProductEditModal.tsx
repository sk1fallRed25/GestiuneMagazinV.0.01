import React, { useState, useEffect, useCallback } from 'react';
import { Save, FolderOpen, Tag, Loader2 } from 'lucide-react';
import { Product, ProductUpdateInput, ProductVatConfig, VatGroupKey } from '../types';
import { ProductVatGroupSelector } from './ProductVatGroupSelector';
import { ProductSgrSelector } from './ProductSgrSelector';
import { selectionFromSgr, payloadFromSgrSelection, SgrSelection } from '../utils/sgr';
import { normalizeVatGroupForStore, productService } from '../services/productService';
import { categoryService } from '../../catalog/categoryService';
import { CategoryWithSubs } from '../../catalog/types';
import toast from 'react-hot-toast';
import { Modal } from '../../../shared/components/ui';

interface ProductEditModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (productId: string, data: ProductUpdateInput) => Promise<void>;
    vatConfig: ProductVatConfig | null;
    storeId?: string | null;
}

/**
 * Rezolvă categoria principală și subcategoria dintr-un category_id și arborele de categorii.
 */
const resolveCategoryFromTree = (categoryId: string | null | undefined, tree: CategoryWithSubs[]) => {
    if (!categoryId || tree.length === 0) {
        return { rootCategoryId: '', subcategoryId: '' };
    }

    // Check if it's a root category
    const asRoot = tree.find(c => c.id === categoryId);
    if (asRoot) {
        return { rootCategoryId: asRoot.id, subcategoryId: '' };
    }

    // Check if it's a subcategory
    for (const root of tree) {
        const asSub = root.subcategories.find(s => s.id === categoryId);
        if (asSub) {
            return { rootCategoryId: root.id, subcategoryId: asSub.id };
        }
    }

    return { rootCategoryId: '', subcategoryId: '' };
};

const ProductEditModal = ({ product, isOpen, onClose, onSubmit, vatConfig, storeId }: ProductEditModalProps) => {
    const [localState, setLocalState] = useState<{
        nume: string;
        cod_bare: string;
        pret_vanzare: string;
        pret_achizitie: string;
        um: string;
        stoc_depozit: string;
        stoc_magazin: string;
        vatGroup: VatGroupKey;
        sgrSelection: SgrSelection;
        rootCategoryId: string;
        subcategoryId: string;
    }>({
        nume: '',
        cod_bare: '',
        pret_vanzare: '0',
        pret_achizitie: '0',
        um: '',
        stoc_depozit: '0',
        stoc_magazin: '0',
        vatGroup: 'A',
        sgrSelection: 'none',
        rootCategoryId: '',
        subcategoryId: ''
    });
    const [hasRealBatches, setHasRealBatches] = useState(false);
    const [categoriesTree, setCategoriesTree] = useState<CategoryWithSubs[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Load categories when modal opens
    const loadCategories = useCallback(async () => {
        if (!storeId) return;
        setCategoriesLoading(true);
        try {
            const tree = await categoryService.listAllGrouped(storeId);
            setCategoriesTree(tree);
        } catch (err) {
            console.error('ProductEditModal loadCategories error:', err);
        } finally {
            setCategoriesLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        if (isOpen && storeId) {
            loadCategories();
        }
    }, [isOpen, storeId, loadCategories]);

    useEffect(() => {
        if (product && categoriesTree.length >= 0) {
            const { rootCategoryId, subcategoryId } = resolveCategoryFromTree(product.category_id, categoriesTree);
            setLocalState({
                nume: product.nume || '',
                cod_bare: product.cod_bare || '',
                pret_vanzare: (product.pret_vanzare || 0).toString(),
                pret_achizitie: (product.pret_achizitie || 0).toString(),
                um: product.um || '',
                stoc_depozit: (product.stoc_depozit || 0).toString(),
                stoc_magazin: (product.stoc_magazin || 0).toString(),
                vatGroup: normalizeVatGroupForStore(product.vatGroup, vatConfig),
                sgrSelection: selectionFromSgr(product.sgrEnabled, product.sgrType),
                rootCategoryId,
                subcategoryId
            });
            if (storeId) {
                productService.hasRealBatches(storeId, product.id)
                    .then(res => setHasRealBatches(res))
                    .catch(err => {
                        console.error("Error checking batches:", err);
                        setHasRealBatches(false);
                    });
            } else {
                setHasRealBatches(false);
            }
        }
    }, [product, vatConfig, storeId, categoriesTree]);

    if (!isOpen || !product) return null;

    const handleNumberChange = (field: string, value: string) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setLocalState(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleVatGroupChange = (val: VatGroupKey) => {
        setLocalState(prev => ({ ...prev, vatGroup: val }));
    };

    const handleCategoryChange = (newRootCategoryId: string) => {
        const newState: Partial<typeof localState> = { rootCategoryId: newRootCategoryId };
        // Reset subcategory if the old one doesn't belong to the new category
        if (localState.subcategoryId) {
            const newCategory = categoriesTree.find(c => c.id === newRootCategoryId);
            const subExists = newCategory?.subcategories.some(s => s.id === localState.subcategoryId);
            if (!subExists) {
                newState.subcategoryId = '';
            }
        }
        setLocalState(prev => ({ ...prev, ...newState }));
    };

    const handleSubcategoryChange = (newSubcategoryId: string) => {
        setLocalState(prev => ({ ...prev, subcategoryId: newSubcategoryId }));
    };

    // Get subcategories for the selected root category
    const selectedRootCategory = categoriesTree.find(c => c.id === localState.rootCategoryId);
    const availableSubcategories = selectedRootCategory?.subcategories ?? [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const pret_vanzare = parseFloat(localState.pret_vanzare) || 0;
        const pret_achizitie = parseFloat(localState.pret_achizitie) || 0;
        const stoc_depozit = parseFloat(localState.stoc_depozit) || 0;
        const stoc_magazin = parseFloat(localState.stoc_magazin) || 0;

        const initialStocDepozit = product.stoc_depozit || 0;
        const initialStocMagazin = product.stoc_magazin || 0;

        const stockWasChanged =
            Math.abs(stoc_depozit - initialStocDepozit) > 0.0001 ||
            Math.abs(stoc_magazin - initialStocMagazin) > 0.0001;

        if (stockWasChanged && hasRealBatches) {
            toast.error("Stocul acestui produs este gestionat pe loturi reale. Modifică stocul prin Recepție/Transfer, nu direct din Produse.");
            setSubmitting(false);
            return;
        }

        const finalVatGroup = vatConfig?.vatPayer === false
            ? 'E'
            : normalizeVatGroupForStore(localState.vatGroup, vatConfig);

        const sgrPayload = payloadFromSgrSelection(localState.sgrSelection);

        // Compute final category_id: subcategoryId ?? categoryId ?? null
        const finalCategoryId = localState.subcategoryId || localState.rootCategoryId || null;

        const updateData: ProductUpdateInput = {
            nume: localState.nume,
            cod_bare: localState.cod_bare,
            pret_vanzare,
            pret_achizitie,
            um: localState.um,
            vatGroup: finalVatGroup,
            sgrEnabled: sgrPayload.sgrEnabled,
            sgrType: sgrPayload.sgrType,
            category_id: finalCategoryId
        };

        if (stockWasChanged) {
            updateData.stoc_depozit = stoc_depozit;
            updateData.stoc_magazin = stoc_magazin;
        }

        try {
            await onSubmit(product.id, updateData);
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Eroare la actualizarea produsului.";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title="Parametri Produs"
            description={`UUID: ${product.id}`}
            size="md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button
                        type="button"
                        data-testid="product-edit-cancel-button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
                    >
                        Anulează
                    </button>
                    <button
                        type="submit"
                        data-testid="product-edit-save-button"
                        form="product-edit-form"
                        disabled={submitting || categoriesLoading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-150 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {submitting ? 'Se salvează...' : 'Salvează'}
                    </button>
                </div>
            }
        >
            <div data-testid="product-edit-modal" className="max-h-[60vh] overflow-y-auto pr-2">
                <form id="product-edit-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* Secțiunea 1: Identificare Produs */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1">
                            1. Identificare Produs
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Denumire Nomenclator
                                </label>
                                <input
                                    className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 bg-white"
                                    value={localState.nume}
                                    onChange={e => setLocalState({ ...localState, nume: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Cod de Bare
                                </label>
                                <input
                                    className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-600 bg-white"
                                    value={localState.cod_bare}
                                    onChange={e => setLocalState({ ...localState, cod_bare: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                Unitate de Măsură (U.M.)
                            </label>
                            <input
                                className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 bg-white"
                                value={localState.um}
                                onChange={e => setLocalState({ ...localState, um: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Secțiunea 2: Prețuri și TVA */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1">
                            2. Prețuri & TVA
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Preț Vânzare (RON)
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-700 bg-white"
                                    value={localState.pret_vanzare}
                                    onChange={e => handleNumberChange('pret_vanzare', e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Preț Achiziție (RON)
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-700 bg-white"
                                    value={localState.pret_achizitie}
                                    onChange={e => handleNumberChange('pret_achizitie', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <ProductVatGroupSelector
                            value={localState.vatGroup}
                            onChange={handleVatGroupChange}
                            config={vatConfig}
                        />
                    </div>

                    {/* Secțiunea 3: SGR */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1">
                            3. Garanție Retur SGR
                        </h3>
                        <ProductSgrSelector
                            value={localState.sgrSelection}
                            onChange={(val) => setLocalState(prev => ({ ...prev, sgrSelection: val }))}
                        />
                    </div>

                    {/* Secțiunea 4: Stoc & Distribuție */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1">
                            4. Stoc & Distribuție
                        </h3>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">
                                        Stoc Depozit
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full border border-indigo-200 p-3 rounded-lg outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-indigo-600 shadow-sm ${
                                            hasRealBatches ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-75' : 'bg-white'
                                        }`}
                                        value={localState.stoc_depozit}
                                        onChange={e => handleNumberChange('stoc_depozit', e.target.value)}
                                        required
                                        disabled={hasRealBatches}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1.5">
                                        Stoc Magazin
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full border border-purple-200 p-3 rounded-lg outline-none focus:ring-4 focus:ring-purple-500/10 font-bold text-purple-600 shadow-sm ${
                                            hasRealBatches ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-75' : 'bg-white'
                                        }`}
                                        value={localState.stoc_magazin}
                                        onChange={e => handleNumberChange('stoc_magazin', e.target.value)}
                                        required
                                        disabled={hasRealBatches}
                                    />
                                </div>
                            </div>
                            {hasRealBatches && (
                                <p className="text-amber-700 text-[11px] font-bold text-center bg-amber-50 p-2.5 rounded-xl border border-amber-200/50">
                                    ⚠️ Stocul este calculat automat din loturile de recepție și poate fi modificat exclusiv prin modulele de Recepție / Transfer.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Secțiunea 5: Categorie & Subcategorie */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1">
                            5. Categorie & Subcategorie
                        </h3>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <FolderOpen size={12} className="text-indigo-500" />
                                        Categorie Principală
                                    </label>
                                    <select
                                        data-testid="product-edit-category-select"
                                        value={localState.rootCategoryId}
                                        onChange={e => handleCategoryChange(e.target.value)}
                                        className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 bg-white cursor-pointer"
                                        disabled={categoriesLoading}
                                    >
                                        <option value="">Fără categorie</option>
                                        {categoriesTree.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Tag size={12} className="text-purple-500" />
                                        Subcategorie
                                    </label>
                                    <select
                                        data-testid="product-edit-subcategory-select"
                                        value={localState.subcategoryId}
                                        onChange={e => handleSubcategoryChange(e.target.value)}
                                        className="w-full border border-slate-300 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-bold text-slate-700 bg-white cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={!localState.rootCategoryId || availableSubcategories.length === 0 || categoriesLoading}
                                    >
                                        <option data-testid="product-edit-subcategory-empty" value="">
                                            {!localState.rootCategoryId
                                                ? 'Selectează o categorie'
                                                : availableSubcategories.length === 0
                                                    ? 'Nicio subcategorie disponibilă'
                                                    : 'Fără subcategorie'
                                            }
                                        </option>
                                        {availableSubcategories.map(sub => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {localState.rootCategoryId && (
                                <p data-testid="product-edit-save-category" className="text-[11px] font-semibold text-slate-500 text-center">
                                    Produsul va fi salvat în: <strong className="text-indigo-600">
                                        {selectedRootCategory?.name || '—'}
                                        {localState.subcategoryId && ` / ${availableSubcategories.find(s => s.id === localState.subcategoryId)?.name || ''}`}
                                    </strong>
                                </p>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default ProductEditModal;
