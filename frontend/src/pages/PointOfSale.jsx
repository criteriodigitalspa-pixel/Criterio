import { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { salesService } from '../services/salesService';
import { useAuth } from '../context/AuthContext';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Smartphone, Plus, Minus, X, Package, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function PointOfSale() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Checkout Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, card, transfer

    useEffect(() => {
        loadInventory();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredProducts(products);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredProducts(products.filter(p =>
                p.name?.toLowerCase().includes(lower) ||
                p.category?.toLowerCase().includes(lower) ||
                p.sku?.toLowerCase().includes(lower)
            ));
        }
    }, [searchTerm, products]);

    const loadInventory = async () => {
        try {
            const data = await inventoryService.getAllProducts();
            // Only show products with stock > 0
            const inStock = data.filter(p => Number(p.quantity) > 0);
            setProducts(inStock);
            setFilteredProducts(inStock);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando inventario");
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                // Check stock limit
                if (existing.quantity >= product.quantity) {
                    toast.error(`Solo quedan ${product.quantity} unidades de ${product.name}`);
                    return prev;
                }
                return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            } else {
                return [...prev, {
                    productId: product.id,
                    name: product.name,
                    price: Number(product.price) || 0,
                    quantity: 1,
                    isInventoryItem: true
                }];
            }
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.productId === productId) {
                    const newQty = item.quantity + delta;
                    if (newQty < 1) return item; // Don't remove, just stop at 1. Use trash for remove.

                    // Check stock if increasing
                    const product = products.find(p => p.id === productId);
                    if (delta > 0 && product && newQty > product.quantity) {
                        toast.error(`Stock máximo alcanzado (${product.quantity})`);
                        return item;
                    }
                    return { ...item, quantity: newQty };
                }
                return item;
            });
        });
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setProcessing(true);
        try {
            const saleData = {
                items: cart,
                subtotal: cartTotal,
                total: cartTotal, // No discount logic yet
                paymentMethod: paymentMethod,
                discount: 0
            };

            const result = await salesService.processSale(saleData, user.uid);

            toast.success(`Venta completada! Ref: ${result.saleId}`);

            // Trigger Print (Placeholder)
            console.log("Printing Receipt...", result);

            // Reset
            setCart([]);
            setShowPaymentModal(false);
            loadInventory(); // Refresh stock
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar venta");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex h-full flex-col md:flex-row gap-6 p-4 md:p-6 overflow-hidden max-h-[calc(100vh-theme(spacing.16))]">

            {/* Left Panel: Inventory Grid */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-800/50 rounded-3xl border border-gray-700/50 overflow-hidden shadow-xl">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-700/50 bg-gray-800/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar productos por nombre, SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4 content-start">
                    {loading ? (
                        <div className="text-center p-10 text-gray-400 animate-pulse">Cargando catálogo...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center p-10 text-gray-500 flex flex-col items-center">
                            <Package className="w-12 h-12 mb-2 opacity-50" />
                            No se encontraron productos.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="flex flex-col items-start bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500/50 p-4 rounded-xl transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="absolute top-2 right-2 bg-gray-900/80 px-2 py-0.5 rounded text-[10px] font-bold text-gray-400">
                                        Stock: {product.quantity}
                                    </div>
                                    <div className="h-10 w-10 bg-blue-900/30 rounded-lg flex items-center justify-center mb-3 text-blue-400 group-hover:scale-110 transition-transform">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-gray-200 text-sm line-clamp-2 min-h-[2.5em]">{product.name}</h4>
                                    <p className="text-green-400 font-mono font-black mt-2 text-lg">
                                        ${Number(product.price).toLocaleString()}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Cart */}
            <div className="w-full md:w-96 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
                <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6" /> Canasta de Venta
                    </h2>
                    <p className="text-blue-100 text-xs mt-1 opacity-80">
                        {cart.length} ítems agregados
                    </p>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                            <ShoppingCart className="w-12 h-12 mb-2" />
                            <p className="text-sm font-medium">Canasta Vacía</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.productId} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-800 truncate">{item.name}</h4>
                                    <div className="text-xs text-gray-500 font-mono mt-1">
                                        ${item.price.toLocaleString()} x {item.quantity}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="font-black text-gray-800 text-sm">
                                        ${(item.price * item.quantity).toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                                        <button
                                            onClick={() => updateQuantity(item.productId, -1)}
                                            className="p-1 hover:bg-white rounded-md text-gray-600 transition-colors"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => updateQuantity(item.productId, 1)}
                                            className="p-1 hover:bg-white rounded-md text-gray-600 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.productId)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Totals Section */}
                <div className="p-5 bg-white border-t border-dashed border-gray-300">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Total a Pagar</span>
                        <span className="text-3xl font-black text-gray-900 tracking-tight">
                            ${cartTotal.toLocaleString()}
                        </span>
                    </div>

                    <button
                        onClick={() => setShowPaymentModal(true)}
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        <CreditCard className="w-5 h-5" />
                        PROCESAR PAGO
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-black text-gray-800">Método de Pago</h3>
                            <button onClick={() => setShowPaymentModal(false)}><X className="w-6 h-6 text-gray-400 hover:text-red-500" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Total a cobrar</p>
                                <p className="text-4xl font-black text-gray-900">${cartTotal.toLocaleString()}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={clsx("flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all", paymentMethod === 'cash' ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 hover:border-gray-300 text-gray-600")}
                                >
                                    <Banknote className="w-6 h-6" />
                                    <span className="text-xs font-bold">Efectivo</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={clsx("flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all", paymentMethod === 'card' ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 hover:border-gray-300 text-gray-600")}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    <span className="text-xs font-bold">Tarjeta</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('transfer')}
                                    className={clsx("flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all", paymentMethod === 'transfer' ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 hover:border-gray-300 text-gray-600")}
                                >
                                    <Smartphone className="w-6 h-6" />
                                    <span className="text-xs font-bold">Transferencia</span>
                                </button>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={processing}
                                className="w-full mt-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-green-500/30 transition-all flex justify-center items-center gap-2"
                            >
                                {processing ? 'Procesando...' : 'CONFIRMAR VENTA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
