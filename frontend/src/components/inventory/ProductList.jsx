import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export default function ProductList({ products, onEdit, onDelete }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-xl">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Producto / Repuesto</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Categoría</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Stock</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Costo Base</th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Venta / Margen</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800">
                    {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-700/50 transition-colors group">
                            <td className="whitespace-nowrap px-6 py-4">
                                <div className="flex items-center">
                                    <div>
                                        <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">{product.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">SKU: {product.sku}</div>
                                        {/* Show specifics preview if available */}
                                        {(product.marca || product.modelo) && (
                                            <div className="text-[10px] text-gray-500 uppercase mt-0.5">{product.marca} {product.modelo}</div>
                                        )}
                                        {/* Specs Preview */}
                                        {product.category === 'Cargadores' && product.volts && (
                                            <div className="text-[10px] text-yellow-600 font-mono mt-0.5">{product.volts} {product.amps} ({product.connector})</div>
                                        )}
                                        {product.category === 'Pantallas' && product.screenSize && (
                                            <div className="text-[10px] text-blue-400 font-mono mt-0.5">{product.screenSize} {product.screenRes} {product.screenPins}</div>
                                        )}
                                        {product.category === 'RAM' && product.ram && (
                                            <div className="text-[10px] text-green-400 font-mono mt-0.5">{product.ram.tipo} {product.ram.capacidad} {product.ramFreq && `(${product.ramFreq}MHz)`}</div>
                                        )}
                                        {product.category === 'Discos' && product.diskType && (
                                            <div className="text-[10px] text-purple-400 font-mono mt-0.5">{product.diskType} {product.diskInterface} {product.disco?.capacidad}</div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                                <span className={clsx(
                                    "inline-flex rounded-lg px-2.5 py-1 text-xs font-bold border",
                                    product.category === 'Cargadores' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                        product.category === 'RAM' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                            product.category === 'Discos' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                                                product.category === 'Pantallas' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                    "bg-gray-700 text-gray-300 border-gray-600"
                                )}>
                                    {product.category || 'General'}
                                </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                                <div className="flex items-center">
                                    <span className={clsx("text-sm font-bold", product.quantity <= product.minStock ? "text-red-400" : "text-gray-300")}>
                                        {product.quantity} u.
                                    </span>
                                    {product.quantity <= product.minStock && (
                                        <AlertTriangle className="ml-2 h-4 w-4 text-red-500 animate-pulse" />
                                    )}
                                </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-red-300 font-mono">
                                ${product.cost ? product.cost.toLocaleString() : '0'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-mono">
                                <div className="text-green-400 font-bold">${product.price ? product.price.toLocaleString() : '0'}</div>
                                {product.price > 0 && product.cost > 0 && (
                                    <div className="text-[10px] text-gray-500">
                                        Mg: <span className="text-blue-400">{Math.round(((product.price - product.cost) / product.price) * 100)}%</span>
                                    </div>
                                )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                    <button
                                        onClick={() => onEdit(product)}
                                        className="rounded-lg p-2 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                                        title="Editar"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(product.id)}
                                        className="rounded-lg p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {products.length === 0 && (
                        <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-gray-700/50 rounded-full flex items-center justify-center mb-2">
                                        <Edit className="w-6 h-6 text-gray-500" />
                                    </div>
                                    <p>No hay productos en inventario.</p>
                                    <p className="text-xs text-gray-600">Comienza agregando tu primer repuesto.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
