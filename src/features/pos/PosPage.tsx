import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { usePos } from './hooks/usePos';
import { PosHeader } from './components/PosHeader';
import { PosSearchBar } from './components/PosSearchBar';
import { PosProductResults } from './components/PosProductResults';
import { PosCart } from './components/PosCart';
import { PosPaymentPanel } from './components/PosPaymentPanel';

const PosPage: React.FC = () => {
    const {
        query,
        setQuery,
        searchResults,
        cart,
        loadingSearch,
        submitting,
        paymentMethod,
        setPaymentMethod,
        cashAmount,
        setCashAmount,
        cardAmount,
        setCardAmount,
        totalBon,
        addToCart,
        removeFromCart,
        updateQuantity,
        finalizeSale
    } = usePos();

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* --- STANGA: CATALOG --- */}
            <div className="w-3/5 p-6 flex flex-col gap-2">
                <PosHeader 
                    isOnline={navigator.onLine} 
                    syncStatus={loadingSearch ? "Căutare în curs..." : "Sistem Pregătit (v2)"} 
                    loading={loadingSearch} 
                />

                <PosSearchBar 
                    query={query} 
                    onQueryChange={setQuery} 
                />

                <div className="flex-1 overflow-y-auto pr-2">
                    <PosProductResults 
                        products={searchResults} 
                        onProductSelect={addToCart} 
                    />
                </div>
            </div>

            {/* --- DREAPTA: BON --- */}
            <div className="w-2/5 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-10 relative">
                <div className="flex-1 overflow-hidden flex flex-col">
                    <PosCart 
                        items={cart} 
                        onUpdateQuantity={updateQuantity} 
                        onRemoveItem={removeFromCart} 
                    />
                </div>

                <PosPaymentPanel 
                    total={totalBon}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    cashAmount={cashAmount}
                    onCashAmountChange={setCashAmount}
                    cardAmount={cardAmount}
                    onCardAmountChange={setCardAmount}
                    onFinalize={finalizeSale}
                    loading={submitting}
                    disabled={cart.length === 0}
                />

                {/* Buton Ieșire */}
                <div className="absolute top-6 right-6 z-20">
                    <Link to="/" className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white" title="Ieșire">
                        <LogOut size={20} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PosPage;
