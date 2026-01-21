import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Database, Cpu as GpuIcon, Maximize2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';

// Import Assets
import logoCriterio from '../assets/GeneralLogo.png';
import iconCpu from '../assets/label_icons/icon_cpu.png';
import iconRam from '../assets/label_icons/icon_ram.png';
import iconScreen from '../assets/label_icons/icon_screen.png';
import iconWindowsOffice from '../assets/label_icons/icon_windows_office.png';
// Brand Logos
import logoLenovo from '../assets/label_icons/logo_lenovo.png';
import logoDell from '../assets/label_icons/logo_dell.png';
import logoHp from '../assets/label_icons/logo_hp.png';

export const DEFAULT_MODULE_CONFIG = {
    logoCriterio: { scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, bgColor: 'transparent', textColor: '#000000', alignH: 'flex-start', alignV: 'center' },
    logoBrand: { scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 16, marginRight: 16, bgColor: 'transparent', textColor: '#000000', alignH: 'center', alignV: 'center' },
    modelSerial: { scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 8, marginRight: 0, bgColor: 'transparent', textColor: '#000000', alignH: 'flex-end', alignV: 'center' },

    // Grid Modules
    // Grid Modules
    cpu: {
        scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, bgColor: '#FFFFFF', textColor: '#000000', alignH: 'center', alignV: 'center',
        order: ['icon', 'title', 'value'],
        subModules: {
            icon: { height: 90, iconSize: 80, padding: 0 },
            title: { height: 35, fontSize: 18, bgColor: '#000000', color: '#FFFFFF', padding: 4 },
            value: { height: 50, fontSize: 31, color: 'inherit', padding: 0 }
        }
    },
    ram: {
        scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, bgColor: '#FFFFFF', textColor: '#000000', alignH: 'center', alignV: 'center',
        order: ['icon', 'title', 'value'],
        subModules: {
            icon: { height: 90, iconSize: 80, padding: 0 },
            title: { height: 35, fontSize: 18, bgColor: '#000000', color: '#FFFFFF', padding: 4 },
            value: { height: 50, fontSize: 31, color: 'inherit', padding: 0 }
        }
    },
    screen: {
        scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, bgColor: '#FFFFFF', textColor: '#000000', alignH: 'center', alignV: 'center',
        order: ['icon', 'title', 'value'],
        subModules: {
            icon: { height: 90, iconSize: 80, padding: 0 },
            title: { height: 35, fontSize: 18, bgColor: '#000000', color: '#FFFFFF', padding: 4 },
            value: { height: 50, fontSize: 31, color: 'inherit', padding: 0 }
        }
    },
    storage: {
        scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, bgColor: '#FFFFFF', textColor: '#000000', alignH: 'center', alignV: 'center',
        order: ['icon', 'title', 'value'],
        subModules: {
            icon: { height: 90, iconSize: 80, padding: 0 },
            title: { height: 35, fontSize: 18, bgColor: '#000000', color: '#FFFFFF', padding: 4 },
            value: { height: 50, fontSize: 31, color: 'inherit', padding: 0 }
        }
    },
    gpu: {
        scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, bgColor: '#FFFFFF', textColor: '#000000', alignH: 'center', alignV: 'center',
        order: ['icon', 'title', 'value'],
        subModules: {
            icon: { height: 90, iconSize: 80, padding: 0 },
            title: { height: 35, fontSize: 18, bgColor: '#000000', color: '#FFFFFF', padding: 4 },
            value: { height: 50, fontSize: 31, color: 'inherit', padding: 0 }
        }
    },
    osImage: { scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, bgColor: 'transparent', textColor: '#000000', alignH: 'center', alignV: 'center' },

    // Right Strip
    barcode: { scale: 1, marginTop: 0, marginBottom: 16, marginLeft: 0, marginRight: 0, bgColor: 'transparent', textColor: '#000000', alignH: 'center', alignV: 'center' },
    ticketId: { scale: 1, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, bgColor: 'transparent', textColor: '#000000', alignH: 'center', alignV: 'center' },
};

/**
 * BarcodeSVG Component
 * Isolated and memoized to prevent unnecessary re-draws during layout edits.
 */
const BarcodeSVG = React.memo(({ value, height, barWidth = 7 }) => {
    const svgRef = useRef(null);

    useLayoutEffect(() => {
        if (svgRef.current && value) {
            try {
                svgRef.current.innerHTML = ""; // Clear previous
                JsBarcode(svgRef.current, value, {
                    format: "CODE128",
                    displayValue: false,
                    fontSize: 0,
                    text: " ",
                    margin: 0,
                    textMargin: 0,
                    height: height,
                    width: barWidth,
                    fontOptions: "bold"
                });
            } catch (e) {
                console.error("Barcode generation error:", e);
            }
        }
    }, [value, height, barWidth]);

    return <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>;
});

export default function PrintLabel({ ticket, id, config = {}, containerRotation = 0 }) {
    const modules = config.modules || DEFAULT_MODULE_CONFIG;
    const { rightStripWidth = 300, barcodeHeight = 260, barcodeBarWidth = 7 } = config;

    // Quick hack to pass this to the memoized component without prop drilling hell if structure changes
    window.barcodeWidthOverride = barcodeBarWidth;

    // Helpers
    const getBrandLogo = (brand) => {
        if (!brand) return null;
        const b = brand.toLowerCase().trim();
        if (b.includes('lenovo')) return logoLenovo;
        if (b.includes('dell')) return logoDell;
        if (b.includes('hp')) return logoHp;
        return null;
    };
    const brandLogo = getBrandLogo(ticket.marca);

    // Data Extraction (Same as before)
    const getInfo = (key, altKey) => ticket.additionalInfo?.[key] || ticket.specs?.[key] || ticket.specs?.[altKey] || ticket[key] || '';
    const ram = Array.isArray(ticket.ram) ? ticket.ram.join(' ') : (ticket.ram?.detalles?.join(' ') || '-');
    const disk = Array.isArray(ticket.disco) ? ticket.disco.join(' ') : (ticket.disco?.detalles?.join(' ') || '-');
    const cpu = `${getInfo('cpuBrand') || getInfo('cpu', 'procesador')} ${getInfo('cpuGen') || getInfo('generation')}`.trim() || '-';
    let screenInfo = `${getInfo('screenSize')} ${getInfo('screenRes', 'resolution')}`.trim();
    if (!screenInfo) screenInfo = "N/A";

    /**
     * Module Wrapper Component
     * Applies the dynamic styles to a generic container.
     */
    /**
     * Module Wrapper Component (Extracted to prevent re-renders)
     */
    const LabelModule = ({ style = {}, children, className = "" }) => {
        return (
            <div
                className={`flex shrink-0 transition-all duration-200 overflow-hidden ${className}`}
                style={{
                    backgroundColor: style.bgColor || 'transparent',
                    color: style.textColor || '#000000',
                    paddingTop: `${style.marginTop || 0}px`,
                    paddingBottom: `${style.marginBottom || 0}px`,
                    paddingLeft: `${style.marginLeft || 0}px`,
                    paddingRight: `${style.marginRight || 0}px`,
                    justifyContent: style.alignH,
                    alignItems: style.alignV,
                    textAlign: style.alignH === 'flex-end' ? 'right' : style.alignH === 'center' ? 'center' : 'left',
                    boxSizing: 'border-box'
                }}
            >
                <div style={{
                    transform: `scale(${style.scale || 1})`,
                    transformOrigin: 'center',
                    width: 'fit-content',
                    minWidth: 'min-content',
                    maxWidth: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: style.alignV === 'flex-start' ? 'flex-start' : style.alignV === 'flex-end' ? 'flex-end' : 'center',
                    justifyContent: style.alignH === 'flex-start' ? 'flex-start' : style.alignH === 'flex-end' ? 'flex-end' : 'center',
                }}>
                    {children}
                </div>
            </div>
        );
    };

    /**
     * Grid Content Renderer
     * Renders the internal structure of a Grid Item (Icon, Title, Value)
     */
    /**
     * Grid Content Renderer
     * Renders sub-modules (Icon, Title, Value) in configurable order.
     */
    const GridContent = ({ iconSrc, IconComponent, label, value, isImage = true, style = {} }) => {
        // Fallback to defaults if specific sub-modules config is missing (e.g. old templates)
        const defaults = DEFAULT_MODULE_CONFIG['cpu']; // Use CPU defaults as generic baseline
        const subModules = style.subModules || defaults.subModules;
        const order = style.order || defaults.order;

        const renderSubModule = (key) => {
            const config = subModules[key] || {};

            switch (key) {
                case 'icon':
                    return (
                        <div key={key} className="flex items-center justify-center w-full shrink-0"
                            style={{ height: `${config.height || 90}px`, padding: `${config.padding}px` }}>
                            {isImage ? (
                                <img src={iconSrc} alt={label} style={{ height: `${config.iconSize || 80}px`, width: 'auto' }} className="object-contain" />
                            ) : (
                                <IconComponent style={{ height: `${config.iconSize || 80}px`, width: `${config.iconSize || 80}px` }} strokeWidth={2.5} />
                            )}
                        </div>
                    );
                case 'title':
                    return (
                        <div key={key} className="w-full shrink-0 flex items-center justify-center relative"
                            style={{
                                height: `${config.height || 35}px`,
                                backgroundColor: config.bgColor || '#000000',
                                padding: `${config.padding || 0}px`
                            }}>
                            <span className="font-black uppercase leading-none"
                                style={{ fontSize: `${config.fontSize || 18}px`, color: config.color || '#FFFFFF' }}>
                                {label}
                            </span>
                        </div>
                    );
                case 'value':
                    return (
                        <div key={key} className="w-full shrink-0 flex items-center justify-center"
                            style={{
                                height: `${config.height || 50}px`,
                                padding: `${config.padding || 0}px`
                            }}>
                            <span className="font-bold leading-tight text-center break-words w-full"
                                style={{ fontSize: `${config.fontSize || 31}px`, color: config.color || 'inherit' }}>
                                {value}
                            </span>
                        </div>
                    );
                default:
                    return null;
            }
        };

        return (
            <div className="flex flex-col items-center justify-center w-full h-full">
                {order.map(key => renderSubModule(key))}
            </div>
        );
    };

    // Data Extraction (Same as before)
    const getStyle = (key) => modules[key] || DEFAULT_MODULE_CONFIG[key] || {};

    const MainContent = ({ contentId }) => (
        <div id={contentId} className="bg-white text-black flex overflow-hidden relative border border-gray-100" // Added border to see edges in playground
            style={{
                width: '1050px',
                height: '750px',
                boxSizing: 'border-box',
                padding: '10px',
            }}>
            {/* ... content ... */}
            <div className="flex-1 flex flex-col h-full mr-4 relative z-10 min-w-0">
                {/* ... */}
                <div className="flex items-stretch justify-between mb-2 pb-2 border-b-[6px] border-black h-[130px] shrink-0">
                    {/* ... */}
                    <div className="w-[230px] shrink-0 h-full flex">
                        <LabelModule style={getStyle('logoCriterio')} className="w-full h-full">
                            <img src={logoCriterio} alt="Criterio" className="h-full w-auto max-w-full object-contain" />
                        </LabelModule>
                    </div>

                    <div className="flex-1 h-full flex min-w-0">
                        <LabelModule style={getStyle('logoBrand')} className="w-full h-full">
                            {brandLogo ? (
                                <img src={brandLogo} alt={ticket.marca} className="h-full w-auto max-w-full object-contain max-h-[90px]" />
                            ) : (
                                <div className="bg-black text-white px-4 py-1 font-bold text-3xl uppercase border-4 border-black">
                                    {ticket.marca || "GENERIC"}
                                </div>
                            )}
                        </LabelModule>
                    </div>

                    <div className="min-w-[200px] shrink-0 h-full flex justify-end">
                        <LabelModule style={getStyle('modelSerial')} className="w-full h-full">
                            <div className="flex flex-col whitespace-nowrap">
                                <span className="font-black text-4xl uppercase mb-1">{ticket.modelo}</span>
                                <span className="font-mono text-2xl font-bold">{ticket.serialNumber || ticket.serial || 'SN: N/A'}</span>
                            </div>
                        </LabelModule>
                    </div>
                </div>

                <div className="grid grid-cols-3 grid-rows-2 gap-3 flex-1 h-full min-h-0 overflow-hidden">
                    <div className="relative border border-gray-300 overflow-hidden rounded">
                        <LabelModule style={getStyle('cpu')} className="w-full h-full">
                            <GridContent iconSrc={iconCpu} label="CPU" value={cpu} style={getStyle('cpu')} />
                        </LabelModule>
                    </div>
                    <div className="relative border border-gray-300 overflow-hidden rounded">
                        <LabelModule style={getStyle('ram')} className="w-full h-full">
                            <GridContent iconSrc={iconRam} label="RAM" value={ram} style={getStyle('ram')} />
                        </LabelModule>
                    </div>
                    <div className="relative border border-gray-300 overflow-hidden rounded">
                        <LabelModule style={getStyle('screen')} className="w-full h-full">
                            <GridContent iconSrc={iconScreen} label="PANTALLA" value={screenInfo} style={getStyle('screen')} />
                        </LabelModule>
                    </div>
                    <div className="relative border border-gray-300 overflow-hidden rounded">
                        <LabelModule style={getStyle('storage')} className="w-full h-full">
                            <GridContent IconComponent={Database} isImage={false} label="ESPACIO" value={disk} style={getStyle('storage')} />
                        </LabelModule>
                    </div>
                    <div className="relative border border-gray-300 overflow-hidden rounded">
                        <LabelModule style={getStyle('gpu')} className="w-full h-full">
                            <GridContent IconComponent={GpuIcon} isImage={false} label="GPU" value={ticket.specs?.gpu || "INTEGRADA"} style={getStyle('gpu')} />
                        </LabelModule>
                    </div>
                    <div className="relative border border-gray-300 overflow-hidden rounded">
                        <LabelModule style={getStyle('osImage')} className="w-full h-full">
                            <img src={iconWindowsOffice} alt="OS" className="w-auto h-auto object-contain max-h-[90%] max-w-[90%]" />
                        </LabelModule>
                    </div>
                </div>
            </div>

            <div
                className="h-full flex items-center justify-center relative border-l-[8px] border-black z-20 bg-white shrink-0"
                style={{ width: `${rightStripWidth}px` }}
            >
                <div style={{
                    width: '740px', height: `${rightStripWidth}px`, transform: 'rotate(90deg)', transformOrigin: 'center'
                }} className="flex flex-col items-center justify-center gap-4 shrink-0">

                    <LabelModule style={getStyle('barcode')} className="w-full shrink-0">
                        <div style={{ height: `${barcodeHeight} px`, width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <BarcodeSVG value={ticket.ticketId} height={barcodeHeight} barWidth={barcodeBarWidth} />
                        </div>
                    </LabelModule>

                    <LabelModule style={getStyle('ticketId')} className="w-full shrink-0">
                        <span className="font-black text-[56px] tracking-widest leading-none block">
                            {ticket.ticketId}
                        </span>
                    </LabelModule>
                </div>
            </div>
        </div>
    );

    if (containerRotation === 0) {
        return <MainContent contentId={id} />;
    }

    // Rotated Wrapper
    const isVertical = containerRotation === 90 || containerRotation === 270;
    const containerStyle = {
        width: isVertical ? '750px' : '1050px',
        height: isVertical ? '1050px' : '750px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    };

    return (
        <div style={containerStyle} id={id}>
            <div style={{
                width: '1050px',
                height: '750px',
                transform: `rotate(${containerRotation}deg)`,
                transformOrigin: 'center',
                flexShrink: 0
            }}>
                <MainContent />
            </div>
        </div>
    );
}
