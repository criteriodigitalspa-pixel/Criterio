import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryService } from '../services/inventoryService';
import ProductList from '../components/inventory/ProductList';
import ProductModal from '../components/inventory/ProductModal';

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getAllProducts();
            setProducts(data);
        } catch (error) {
            toast.error('Failed to load inventory');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveProduct = async (productData) => {
        try {
            if (editingProduct) {
                await inventoryService.updateProduct(editingProduct.id, productData);
                toast.success('Product updated successfully');
            } else {
                await inventoryService.addProduct(productData);
                toast.success('Product added successfully');
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            fetchProducts();
        } catch (error) {
            toast.error('Failed to save product');
            console.error(error);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await inventoryService.deleteProduct(id);
                toast.success('Product deleted');
                fetchProducts();
            } catch (error) {
                toast.error('Failed to delete product');
                console.error(error);
            }
        }
    };

    const openAddModal = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-900 p-8 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0 border-b border-gray-800 pb-6">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="bg-blue-500/10 p-2 rounded-lg text-blue-400"><RefreshCw className="w-8 h-8" /></span>
                            Inventario & Repuestos
                        </h2>
                        <p className="text-gray-400 mt-1 ml-14">Control de stock para Cargadores, RAM, Discos y Pantallas.</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={fetchProducts}
                            className="flex items-center rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Recargar
                        </button>
                        <button
                            onClick={openAddModal}
                            className="flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-white shadow-lg hover:shadow-blue-500/25 hover:brightness-110 transition-all font-semibold"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Agregar Repuesto
                        </button>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, SKU o categoría..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="block w-full rounded-2xl border border-gray-700 bg-gray-800/50 pl-12 p-4 text-base text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-gray-800 transition-all outline-none shadow-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                            <span className="text-gray-400 animate-pulse">Cargando inventario...</span>
                        </div>
                    </div>
                ) : (
                    <ProductList
                        products={filteredProducts}
                        onEdit={openEditModal}
                        onDelete={handleDeleteProduct}
                    />
                )}

                <ProductModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    checkProduct={editingProduct}
                    onSave={handleSaveProduct}
                />
            </div>
        </div>
    );
}
