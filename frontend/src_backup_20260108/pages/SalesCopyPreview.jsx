import React, { useMemo, useState } from 'react';
import { SalesCopyGenerator } from '../services/salesCopyGenerator';
import { ArrowLeft, Share2, ShoppingCart, Heart, Shield, Star, Check } from 'lucide-react';

const DEMO_IMAGES = [
    '/demo/20251219_120157.jpg',
    '/demo/20251219_120307.jpg',
    '/demo/20251219_120320.jpg',
    '/demo/20251219_120331.jpg',
    '/demo/20251219_120349.jpg'
];

export default function SalesCopyPreview() {
    const [currentImg, setCurrentImg] = useState(0);

    const mockTicket = useMemo(() => ({
        marca: 'LENOVO',
        modelo: 'THINKBOOK 15 G2',
        additionalInfo: {
            cpuBrand: 'Intel Core',
            cpuGen: 'i7 1165G7'
        },
        ram: {
            detalles: ['8GB', '8GB'],
            slots: 2
        },
        disco: {
            detalles: ['512GB SSD NVMe']
        },
        precioVenta: 450000
    }), []);

    const htmlContent = SalesCopyGenerator.generateHtml(mockTicket);
    const priceFormatted = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(mockTicket.precioVenta);

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 font-sans">

            {/* MOBILE CONTAINER (Simulating iPhone dimensions) */}
            <div className="w-full max-w-[400px] bg-[#020617] h-[850px] overflow-y-auto rounded-[30px] shadow-2xl relative border-[8px] border-gray-900 scroll-smooth no-scrollbar">

                {/* STATUS BAR FAKE */}
                <div className="absolute top-0 left-0 w-full h-7 bg-black/40 z-50 backdrop-blur-sm pointer-events-none"></div>

                {/* HEADER FLOATING */}
                <div className="fixed top-2 z-40 w-[384px] px-4 py-4 flex justify-between items-center text-white">
                    <button className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10"><ArrowLeft size={20} /></button>
                    <div className="flex gap-3">
                        <button className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10"><Share2 size={20} /></button>
                        <button className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10"><Heart size={20} /></button>
                    </div>
                </div>

                {/* CAROUSEL HERO */}
                <div className="relative w-full h-[400px] bg-gray-900">
                    <div className="flex overflow-x-auto snap-x snap-mandatory h-full no-scrollbar">
                        {DEMO_IMAGES.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                className="w-full h-full object-cover snap-center shrink-0"
                                alt={`Vista ${idx}`}
                            />
                        ))}
                    </div>
                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none"></div>

                    {/* Dots */}
                    <div className="absolute bottom-10 w-full flex justify-center gap-2 z-20">
                        {DEMO_IMAGES.map((_, idx) => (
                            <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === 0 ? 'bg-cyan-400 w-4 shadow-[0_0_10px_#22d3ee]' : 'bg-white/30'}`} />
                        ))}
                    </div>
                </div>

                {/* PRODUCT BODY - Dark Mode */}
                <div className="relative -mt-6 bg-[#020617] rounded-t-[30px] p-0 pb-32">

                    {/* Native App Header (Title & Price) */}
                    <div className="px-6 pt-2 pb-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-1 rounded inline-block mb-3 tracking-wider">
                                    REACONDICIONADO GRADO A
                                </span>
                                <h1 className="text-2xl font-black text-white leading-tight">Lenovo ThinkBook 15 G2 ITL</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                            <div className="flex text-yellow-400">
                                <Star size={16} fill="currentColor" />
                                <Star size={16} fill="currentColor" />
                                <Star size={16} fill="currentColor" />
                                <Star size={16} fill="currentColor" />
                                <Star size={16} fill="currentColor" />
                            </div>
                            <span>(4.9/5)</span>
                        </div>
                    </div>

                    {/* AI GENERATED CONTENT (Injected) */}
                    <div
                        className="prose prose-sm prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />

                </div>

                {/* STICKY BOTTOM BAR - Dark Glass */}
                <div className="fixed bottom-2 w-[384px] bg-[#0f172a]/80 backdrop-blur-xl border-t border-white/10 p-4 pb-6 rounded-b-[25px] z-50">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 line-through decoration-red-500">$ 690.000</span>
                            <span className="text-2xl font-black text-white">{priceFormatted}</span>
                        </div>
                        <button className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3.5 px-6 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition-all active:scale-95">
                            <ShoppingCart size={20} />
                            COMPRAR
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
