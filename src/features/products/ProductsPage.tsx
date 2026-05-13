import React, { useState } from 'react';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useProducts } from './hooks/useProducts';
import { Product } from './types';
import ProductSearchBar from './components/ProductSearchBar';
import ProductTable from './components/ProductTable';
import ProductEditModal from './components/ProductEditModal';


const ProductsPage = () => {
    const { role } = useAuth();
    const userRole = role || undefined;

    const {
        loading,
        searchTerm,
        setSearchTerm,
        filteredProducts,
        updateProduct,
        deleteProduct,
        currentStoreId
    } = useProducts();


    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        const message = "Sunteți sigur că doriți eliminarea acestui reper? Produsul va fi marcat ca 'șters' în baza de date.";
        if (window.confirm(message)) {
            await deleteProduct(id);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-gray-500 font-medium">
            <RefreshCw className="animate-spin mr-3 text-indigo-600" />
            Se accesează serverul de baze de date...
        </div>
    );

    if (!currentStoreId) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <AlertCircle size={64} className="text-orange-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Magazin neselectat</h2>
                <p className="text-gray-500 mt-2 max-w-md">
                    Pentru a vedea și gestiona produsele, vă rugăm să selectați un magazin activ din meniul de profil.
                </p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-slate-50/30">
            {/* Header Secțiune */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <Database size={28} />
                        </span>
                        Monitorizare Stocuri & Produse
                    </h1>
                    <p className="text-gray-500 mt-2 ml-1 text-sm italic">
                        Sincronizare în timp real (Schema v2). Rol: <span className="font-bold text-indigo-600 uppercase">{userRole || 'Nedefinit'}</span>
                    </p>
                </div>
            </div>

            {/* Bara de Căutare */}
            <ProductSearchBar value={searchTerm} onChange={setSearchTerm} />

            {/* Tabel Central */}
            <ProductTable 
                products={filteredProducts} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                userRole={userRole}
            />

            {/* Modal Editare */}
            <ProductEditModal 
                product={editingProduct}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={updateProduct}
            />
        </div>
    );
};

export default ProductsPage;
