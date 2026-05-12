import React, { useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { useProducts } from './hooks/useProducts';
import { Product, ProductsPageProps } from './types';
import ProductSearchBar from './components/ProductSearchBar';
import ProductTable from './components/ProductTable';
import ProductEditModal from './components/ProductEditModal';

const ProductsPage = ({ userRole }: ProductsPageProps) => {
    const {
        loading,
        searchTerm,
        setSearchTerm,
        filteredProducts,
        updateProduct,
        deleteProduct
    } = useProducts();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        const message = "Această acțiune este periculoasă. În producție produsul trebuie dezactivat, nu șters definitiv. Sunteți sigur că doriți eliminarea DEFINITIVĂ a acestui reper din baza de date?";
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
                        Sincronizare în timp real. Rol curent: <span className="font-bold text-indigo-600 uppercase">{userRole || 'Nedefinit'}</span>
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
