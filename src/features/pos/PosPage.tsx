import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { usePos } from './hooks/usePos';
import { PosHeader } from './components/PosHeader';
import { PosSearchBar } from './components/PosSearchBar';
import { PosProductResults } from './components/PosProductResults';
import { PosCart } from './components/PosCart';
import { PosPaymentPanel } from './components/PosPaymentPanel';
import { ShiftOpenModal } from './components/ShiftOpenModal';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { PosLockScreen } from './components/PosLockScreen';

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
        onCashBlur,
        onCardBlur,
        totalBon,
        activeShift,
        cashRegisters,
        shiftLoading,
        shiftError,
        handleOpenShift,
        handleCloseShift,
        handleCancelShift,
        addToCart,
        removeFromCart,
        updateQuantity,
        finalizeSale
    } = usePos();

    const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans relative">
            {/* Ecran de blocare obligatoriu cand nu exista tura activa */}
            {!activeShift && !shiftLoading && (
                <PosLockScreen 
                    onOpenShiftClick={() => setIsOpenModalOpen(true)} 
                    loading={shiftLoading} 
                />
            )}

            {/* Modale Ture */}
            <ShiftOpenModal
                isOpen={isOpenModalOpen}
                onClose={() => setIsOpenModalOpen(false)}
                onOpenShift={handleOpenShift}
                cashRegisters={cashRegisters}
                loading={shiftLoading}
            />

            <ShiftCloseModal
                isOpen={isCloseModalOpen}
                onClose={() => setIsCloseModalOpen(false)}
                onCloseShift={handleCloseShift}
                activeShift={activeShift}
                loading={shiftLoading}
            />

            {/* Buton Ieșire Global (z-50 pentru a fi accesibil si peste lock screen) */}
            <div className="absolute top-6 right-6 z-50">
                <Link 
                    to="/" 
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl shadow-lg border border-slate-700 transition-all transform hover:scale-105 active:scale-95 text-sm font-bold" 
                    title="Ieșire spre Dashboard"
                >
                    <LogOut size={18} className="text-rose-400" />
                    <span>Ieșire POS</span>
                </Link>
            </div>

            {/* --- STANGA: CATALOG --- */}
            <div className="w-3/5 p-6 flex flex-col gap-2 pt-20 md:pt-6">
                <PosHeader 
                    isOnline={navigator.onLine} 
                    syncStatus={shiftLoading ? "Verificare tură..." : (loadingSearch ? "Căutare în curs..." : "Sistem Pregătit (v2)")} 
                    loading={loadingSearch || shiftLoading} 
                    activeShift={activeShift}
                    onOpenClick={() => setIsOpenModalOpen(true)}
                    onCloseClick={() => setIsCloseModalOpen(true)}
                    onCancelClick={() => handleCancelShift()}
                    shiftLoading={shiftLoading}
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
            <div className="w-2/5 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-10 relative pt-20 md:pt-0">
                <div className="flex-1 overflow-hidden flex flex-col pt-6 md:pt-0">
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
                    onCashBlur={onCashBlur}
                    onCardBlur={onCardBlur}
                    onFinalize={finalizeSale}
                    loading={submitting}
                    disabled={cart.length === 0 || !activeShift}
                />
            </div>
        </div>
    );
};

export default PosPage;
