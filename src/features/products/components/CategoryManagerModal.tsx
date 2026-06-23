import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FolderOpen,
    Tag,
    Plus,
    Edit3,
    ChevronDown,
    ChevronRight,
    Package,
    Hash,
    Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, EmptyState } from '../../../shared/components/ui';
import { Product } from '../types';
import { categoryService } from '../../catalog/categoryService';
import type { CategoryWithSubs, CategoryOption } from '../../catalog/types';

/* ─────────────────────────────── Props ─────────────────────────────── */

interface CategoryManagerModalProps {
    open: boolean;
    onClose: () => void;
    storeId: string;
    products: Product[];
}

/* ──────────────────────── Helper: product counts ──────────────────── */

/**
 * Build a categoryId → product count map from the local products array.
 * This avoids an extra network call since products are already loaded.
 */
function buildProductCountMap(products: Product[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const p of products) {
        if (p.category_id) {
            counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
    }
    return counts;
}

/* ──────────────────────────── Component ───────────────────────────── */

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
    open,
    onClose,
    storeId,
    products,
}) => {
    /* ── categories state ── */
    const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
    const [loading, setLoading] = useState(false);

    /* ── expanded rows ── */
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    /* ── inline rename state ── */
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [savingRename, setSavingRename] = useState(false);
    const renameInputRef = useRef<HTMLInputElement>(null);

    /* ── new root category form ── */
    const [showNewRoot, setShowNewRoot] = useState(false);
    const [newRootName, setNewRootName] = useState('');
    const [savingRoot, setSavingRoot] = useState(false);
    const newRootInputRef = useRef<HTMLInputElement>(null);

    /* ── new subcategory form (per parent) ── */
    const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
    const [newSubName, setNewSubName] = useState('');
    const [savingSub, setSavingSub] = useState(false);
    const newSubInputRef = useRef<HTMLInputElement>(null);

    /* ── E2E testing feedback states ── */
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    /* ── product counts (memoised) ── */
    const productCounts = useMemo(() => buildProductCountMap(products), [products]);

    /* ───────────────── Fetch categories ───────────────── */
    const handleDeleteCategory = async (categoryId: string) => {
        if (!navigator.onLine) {
            toast.error("Nu poți modifica categorii cât timp aplicația este offline.");
            return;
        }
        if (!window.confirm("Ești sigur? Această operație nu poate fi anulată. Confirmați ștergerea acestei categorii? Produsele asociate vor fi decuplate.")) {
            return;
        }

        try {
            await categoryService.deleteCategory(storeId, categoryId);
            toast.success("✓ Categorie ștearsă");
            await fetchCategories();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Eroare la ștergerea categoriei.';
            toast.error(msg);
        }
    };

    const fetchCategories = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);
        try {
            const data = await categoryService.listAllGrouped(storeId);
            setCategories(data);
        } catch (err) {
            console.error('[CategoryManagerModal] fetch error:', err);
            toast.error('Eroare la încărcarea categoriilor.');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        if (open) {
            fetchCategories();
        }
    }, [open, fetchCategories]);

    /* ───────────────── Focus helpers ───────────────── */

    useEffect(() => {
        if (editingId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [editingId]);

    useEffect(() => {
        if (showNewRoot && newRootInputRef.current) {
            newRootInputRef.current.focus();
        }
    }, [showNewRoot]);

    useEffect(() => {
        if (addingSubTo && newSubInputRef.current) {
            newSubInputRef.current.focus();
        }
    }, [addingSubTo]);

    /* ───────────────── Toggle expand ───────────────── */

    const toggleExpand = (catId: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(catId) ? next.delete(catId) : next.add(catId);
            return next;
        });
    };

    /* ───────────────── Inline rename ───────────────── */

    const startRename = (id: string, currentName: string) => {
        setEditingId(id);
        setEditingName(currentName);
    };

    const cancelRename = () => {
        setEditingId(null);
        setEditingName('');
    };

    const submitRename = async (categoryId: string, parentId: string | null) => {
        const trimmed = editingName.trim();
        if (!trimmed || trimmed.length < 2) {
            toast.error('Numele trebuie să aibă minim 2 caractere.');
            return;
        }
        setSavingRename(true);
        try {
            await categoryService.updateCategoryName(storeId, categoryId, trimmed, parentId);
            toast.success('Categorie redenumită cu succes.');
            cancelRename();
            await fetchCategories();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Eroare la redenumire.';
            toast.error(msg);
        } finally {
            setSavingRename(false);
        }
    };

    /* ───────────────── Create root category ───────────────── */

    const submitNewRoot = async () => {
        const trimmed = newRootName.trim();
        if (!trimmed || trimmed.length < 2) {
            toast.error('Numele trebuie să aibă minim 2 caractere.');
            return;
        }
        setSavingRoot(true);
        setSuccessMessage(null);
        setErrorMessage(null);
        try {
            await categoryService.createRootCategory(storeId, trimmed);
            toast.success(`Categoria „${trimmed}” a fost creată.`);
            setSuccessMessage('main-category');
            setNewRootName('');
            setShowNewRoot(false);
            await fetchCategories();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Eroare la creare.';
            toast.error(msg);
            setErrorMessage('main-category');
        } finally {
            setSavingRoot(false);
        }
    };

    /* ───────────────── Create subcategory ───────────────── */

    const submitNewSub = async (parentId: string) => {
        const trimmed = newSubName.trim();
        if (!trimmed || trimmed.length < 2) {
            toast.error('Numele trebuie să aibă minim 2 caractere.');
            return;
        }
        setSavingSub(true);
        setSuccessMessage(null);
        setErrorMessage(null);
        try {
            await categoryService.createSubcategory(storeId, parentId, trimmed);
            toast.success(`Subcategoria „${trimmed}” a fost creată.`);
            setSuccessMessage('subcategory');
            setNewSubName('');
            setAddingSubTo(null);
            // Ensure parent is expanded so user sees the new subcategory
            setExpanded((prev) => new Set(prev).add(parentId));
            await fetchCategories();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Eroare la creare.';
            toast.error(msg);
            setErrorMessage('subcategory');
        } finally {
            setSavingSub(false);
        }
    };

    /* ───────────────── Keyboard helpers ───────────────── */

    const handleRenameKeyDown = (
        e: React.KeyboardEvent,
        categoryId: string,
        parentId: string | null
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitRename(categoryId, parentId);
        } else if (e.key === 'Escape') {
            cancelRename();
        }
    };

    const handleNewRootKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitNewRoot();
        } else if (e.key === 'Escape') {
            setShowNewRoot(false);
            setNewRootName('');
        }
    };

    const handleNewSubKeyDown = (e: React.KeyboardEvent, parentId: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitNewSub(parentId);
        } else if (e.key === 'Escape') {
            setAddingSubTo(null);
            setNewSubName('');
        }
    };

    /* ───────────────── Count helper (root = own + children) ───────────────── */

    const getRootCount = (cat: CategoryWithSubs): number => {
        let total = productCounts[cat.id] || 0;
        for (const sub of cat.subcategories) {
            total += productCounts[sub.id] || 0;
        }
        return total;
    };

    /* ───────────────── Render: subcategory row ───────────────── */

    const renderSubRow = (sub: CategoryOption) => {
        const count = productCounts[sub.id] || 0;
        const isEditing = editingId === sub.id;

        return (
            <div
                key={sub.id}
                data-testid="catalog-subcategory-row"
                className="flex items-center gap-3 pl-10 pr-4 py-3 hover:bg-slate-50 transition-all group"
            >
                {/* Icon */}
                <Tag size={14} className="text-slate-400 flex-shrink-0" />

                {/* Name or inline rename input */}
                {isEditing ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                            ref={renameInputRef}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => handleRenameKeyDown(e, sub.id, sub.parentId)}
                            disabled={savingRename}
                            className="flex-1 min-w-0 border border-indigo-300 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                        <button
                            onClick={() => submitRename(sub.id, sub.parentId)}
                            disabled={savingRename}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            {savingRename ? '...' : 'Salvează'}
                        </button>
                        <button
                            onClick={cancelRename}
                            disabled={savingRename}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                        >
                            Anulează
                        </button>
                    </div>
                ) : (
                    <>
                        <span className="flex-1 min-w-0 text-sm font-bold text-slate-700 truncate">
                            {sub.name}
                        </span>

                        {/* Product count badge */}
                        <span
                            data-testid="catalog-category-products-count"
                            className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full"
                        >
                            <Package size={10} /> {count}
                        </span>

                        {/* Edit button */}
                        <button
                            onClick={() => startRename(sub.id, sub.name)}
                            className="p-1.5 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                            title="Redenumește"
                        >
                            <Edit3 size={14} />
                        </button>
                        <button
                            onClick={() => handleDeleteCategory(sub.id)}
                            className="p-1.5 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            title="Șterge"
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </div>
        );
    };

    /* ───────────────── Render: root category row ───────────────── */

    const renderRootRow = (cat: CategoryWithSubs) => {
        const count = getRootCount(cat);
        const isExpanded = expanded.has(cat.id);
        const hasSubs = cat.subcategories.length > 0;
        const isEditing = editingId === cat.id;
        const isAddingSub = addingSubTo === cat.id;

        return (
            <div key={cat.id} className="border-b border-slate-100 last:border-b-0">
                {/* ── Main row ── */}
                <div
                    data-testid="catalog-main-category-row"
                    className="flex items-center gap-3 px-6 py-4 hover:bg-indigo-50/40 transition-all group cursor-pointer"
                    onClick={() => toggleExpand(cat.id)}
                >
                    {/* Expand/collapse chevron */}
                    <span className="text-slate-400 flex-shrink-0">
                        {hasSubs || isAddingSub ? (
                            isExpanded ? (
                                <ChevronDown size={16} />
                            ) : (
                                <ChevronRight size={16} />
                            )
                        ) : (
                            <span className="w-4 inline-block" />
                        )}
                    </span>

                    {/* Folder icon */}
                    <FolderOpen size={18} className="text-indigo-500 flex-shrink-0" />

                    {/* Name or inline rename input */}
                    {isEditing ? (
                        <div
                            className="flex items-center gap-2 flex-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                ref={renameInputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => handleRenameKeyDown(e, cat.id, null)}
                                disabled={savingRename}
                                className="flex-1 min-w-0 border border-indigo-300 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                            <button
                                onClick={() => submitRename(cat.id, null)}
                                disabled={savingRename}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {savingRename ? '...' : 'Salvează'}
                            </button>
                            <button
                                onClick={cancelRename}
                                disabled={savingRename}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                            >
                                Anulează
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="flex-1 min-w-0 font-bold text-slate-900 truncate">
                                {cat.name}
                            </span>

                            {/* Subcategory count chip */}
                            {hasSubs && (
                                <span className="flex items-center gap-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full">
                                    <Hash size={10} /> {cat.subcategories.length}
                                </span>
                            )}

                            {/* Product count badge */}
                            <span
                                data-testid="catalog-category-products-count"
                                className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full"
                            >
                                <Package size={10} /> {count}
                            </span>

                            {/* Action buttons (visible on hover) */}
                            <div
                                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => startRename(cat.id, cat.name)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                    title="Redenumește"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Șterge"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button
                                    data-testid="catalog-create-subcategory-button"
                                    onClick={() => {
                                        setAddingSubTo(cat.id);
                                        setNewSubName('');
                                        // Expand parent to show the inline form
                                        setExpanded((prev) => new Set(prev).add(cat.id));
                                    }}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                    title="Adaugă subcategorie"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Expanded: subcategories + inline add form ── */}
                {isExpanded && (
                    <div className="bg-slate-50/50">
                        {cat.subcategories.map(renderSubRow)}

                        {/* Inline subcategory creation form */}
                        {isAddingSub && (
                            <div className="flex items-center gap-2 pl-10 pr-6 py-3">
                                <Tag size={14} className="text-emerald-400 flex-shrink-0" />
                                <input
                                    ref={newSubInputRef}
                                    data-testid="create-subcategory-name-input"
                                    type="text"
                                    placeholder="Nume subcategorie..."
                                    value={newSubName}
                                    onChange={(e) => setNewSubName(e.target.value)}
                                    onKeyDown={(e) => handleNewSubKeyDown(e, cat.id)}
                                    disabled={savingSub}
                                    className="flex-1 min-w-0 border border-emerald-300 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white placeholder:text-slate-300"
                                />
                                <button
                                    data-testid="create-subcategory-submit"
                                    onClick={() => submitNewSub(cat.id)}
                                    disabled={savingSub}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                                >
                                    {savingSub ? '...' : 'Adaugă'}
                                </button>
                                <button
                                    onClick={() => {
                                        setAddingSubTo(null);
                                        setNewSubName('');
                                    }}
                                    disabled={savingSub}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                                >
                                    Anulează
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    /* ───────────────── Empty state ───────────────── */

    const renderEmpty = () => (
        <div
            data-testid="catalog-category-empty-state"
            className="p-4"
        >
            <EmptyState
                title="Nicio categorie încă"
                description="Creează prima categorie pentru a organiza produsele din magazinul tău."
                icon={<FolderOpen size={28} className="text-indigo-500" />}
                action={
                    <button
                        data-testid="catalog-create-main-category-button-empty"
                        onClick={() => {
                            setShowNewRoot(true);
                            setNewRootName('');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                        <Plus size={14} />
                        Creează prima categorie
                    </button>
                }
            />
        </div>
    );

    /* ───────────────── Modal content ───────────────── */

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Gestionare Categorii"
            description="Vizualizează, creează și redenumește categoriile și subcategoriile."
            size="lg"
        >
            <div
                data-testid="catalog-category-manager-panel"
                className="space-y-4"
            >
                {/* ── E2E testing helper status indicators ── */}
                {successMessage === 'main-category' && (
                    <div data-testid="create-main-category-success" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <span>✓</span> Categorie creată cu succes.
                    </div>
                )}
                {errorMessage === 'main-category' && (
                    <div data-testid="create-main-category-error" className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <span>❌</span> Eroare la crearea categoriei.
                    </div>
                )}
                {successMessage === 'subcategory' && (
                    <div data-testid="create-subcategory-success" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <span>✓</span> Subcategorie creată cu succes.
                    </div>
                )}
                {errorMessage === 'subcategory' && (
                    <div data-testid="create-subcategory-error" className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <span>❌</span> Eroare la crearea subcategoriei.
                    </div>
                )}
                {/* ── Header bar: title + add button ── */}
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Structură categorii
                    </span>
                    <button
                        data-testid="catalog-create-main-category-button"
                        onClick={() => {
                            setShowNewRoot(true);
                            setNewRootName('');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                        <Plus size={14} />
                        Categorie nouă
                    </button>
                </div>

                {/* ── Inline new-root form ── */}
                {showNewRoot && (
                    <div className="flex items-center gap-2 bg-indigo-50/60 px-6 py-4 rounded-3xl border border-indigo-100">
                        <FolderOpen size={16} className="text-indigo-500 flex-shrink-0" />
                        <input
                            ref={newRootInputRef}
                            data-testid="create-main-category-name-input"
                            type="text"
                            placeholder="Nume categorie principală..."
                            value={newRootName}
                            onChange={(e) => setNewRootName(e.target.value)}
                            onKeyDown={handleNewRootKeyDown}
                            disabled={savingRoot}
                            className="flex-1 min-w-0 border border-indigo-300 px-3 py-2 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white placeholder:text-slate-300"
                        />
                        <button
                            data-testid="create-main-category-submit"
                            onClick={submitNewRoot}
                            disabled={savingRoot}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            {savingRoot ? '...' : 'Creează'}
                        </button>
                        <button
                            onClick={() => {
                                setShowNewRoot(false);
                                setNewRootName('');
                            }}
                            disabled={savingRoot}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                        >
                            Anulează
                        </button>
                    </div>
                )}

                {/* ── Category tree ── */}
                <div className="rounded-3xl border border-slate-200 overflow-hidden bg-white">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                    ) : categories.length === 0 ? (
                        renderEmpty()
                    ) : (
                        categories.map(renderRootRow)
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default CategoryManagerModal;
