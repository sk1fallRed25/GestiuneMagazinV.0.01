import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { CartItem } from '../types';

interface PosCartProps {
    items: CartItem[];
    onUpdateQuantity: (id: string, qty: number) => void;
    onRemoveItem: (id: string) => void;
}

export const PosCart: React.FC<PosCartProps> = ({ items, onUpdateQuantity, onRemoveItem }) => {
    return (
        <div data-testid="pos-cart-panel" className="flex flex-col h-full overflow-hidden">
            <div className="p-6 bg-gray-900 text-white flex justify-between items-center shadow-lg">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ShoppingCart size={24} className="text-indigo-400" />
                    Coș Vânzare
                </h2>
                <div className="text-sm text-gray-400 mt-1">{items.length} linii active</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                        <ShoppingCart size={48} className="mb-2" />
                        <p>Coșul este gol</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.productId} data-testid={`pos-cart-line-${item.productId}`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate">{item.name}</div>
                                <div className="text-sm text-gray-500 font-mono mt-1">
                                    {item.price.toFixed(2)} x {item.quantity}
                                </div>
                                {item.sgrEnabled && (
                                    <div 
                                        className="text-xs text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded-md p-1.5 mt-2 flex justify-between items-center"
                                        data-testid="pos-sgr-line"
                                    >
                                        <div>
                                            <span className="font-semibold">+ Garanție SGR - {(item.sgrType || 'ambalaj').toUpperCase()}</span>
                                            <span className="text-[10px] text-gray-500 block">TVA: D — 0%</span>
                                        </div>
                                        <span className="font-mono font-bold">
                                            {item.quantity} x 0.50 = {(item.quantity * 0.50).toFixed(2)} lei
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="font-bold text-lg text-gray-900 w-24 text-right">
                                {item.total.toFixed(2)}
                            </div>

                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <button 
                                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)} 
                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-30"
                                    disabled={item.quantity <= 1}
                                >
                                    <Minus size={14} />
                                </button>
                                <span data-testid={`pos-cart-qty-${item.productId}`} className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                <button 
                                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)} 
                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors disabled:opacity-30"
                                    disabled={item.quantity >= item.stockAvailable}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            <button onClick={() => onRemoveItem(item.productId)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {(() => {
                const productsSubtotal = items.reduce((acc, item) => acc + item.quantity * item.price, 0);
                const cartSgrTotal = items.reduce((acc, item) => acc + (item.sgrEnabled ? item.quantity * 0.50 : 0), 0);
                const grandTotal = productsSubtotal + cartSgrTotal;

                if (cartSgrTotal <= 0) return null;

                return (
                    <div className="bg-slate-50 p-4 border-t border-gray-200 space-y-1.5 text-sm text-gray-700">
                        <div className="flex justify-between">
                            <span>Subtotal produse:</span>
                            <span className="font-semibold text-gray-900" data-testid="pos-products-subtotal">
                                {productsSubtotal.toFixed(2)} lei
                            </span>
                        </div>
                        <div className="flex justify-between text-indigo-600">
                            <span>Garanții SGR (D - 0%):</span>
                            <span className="font-semibold" data-testid="pos-sgr-total">
                                {cartSgrTotal.toFixed(2)} lei
                            </span>
                        </div>
                        <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                            <span>Total de plată:</span>
                            <span data-testid="pos-grand-total">
                                {grandTotal.toFixed(2)} lei
                            </span>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
