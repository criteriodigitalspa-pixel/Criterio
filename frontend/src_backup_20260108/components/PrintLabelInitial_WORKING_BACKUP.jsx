import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import JsBarcode from 'jsbarcode';

// ID of the DOM element to be captured
export const INITIAL_LABEL_ID = "print-label-initial-hidden";

export const DEFAULT_ADMISSION_CONFIG = {
    barcodeHeight: 160, // px
    idFontSize: 42, // px
    batchFontSize: 32, // px
    width: 400, // px (50mm approx)
    heightSingle: 240, // px (30mm)
    heightBatch: 320, // px (40mm)
};

export default function PrintLabelInitial({ ticket, tickets, show = false, config = {}, renderAsPortal = true }) {
    const svgRef = useRef(null);
    const {
        barcodeHeight = 160,
        idFontSize = 42,
        batchFontSize = 32,
        width = 400,
        heightSingle = 240,
        heightBatch = 320,
        hideBatchFooter = false,
        barcodeBarWidth = 3
    } = { ...DEFAULT_ADMISSION_CONFIG, ...config };

    // Barcode effect for Single Ticket
    useEffect(() => {
        if (ticket?.ticketId && svgRef.current) {
            generateBarcode(svgRef.current, ticket.ticketId);
        }
    }, [ticket, barcodeHeight, barcodeBarWidth]);

    // Barcode effect for Batch Tickets
    useEffect(() => {
        if (tickets && tickets.length > 0) {
            tickets.forEach((t, index) => {
                const el = document.getElementById(`barcode-${index}`);
                if (el) generateBarcode(el, t.ticketId);
            });
        }
    }, [tickets, barcodeHeight, barcodeBarWidth]);

    const generateBarcode = (element, value) => {
        try {
            JsBarcode(element, value, {
                format: "CODE128",
                width: barcodeBarWidth,           // Configurable bar width
                height: barcodeHeight - 15, // Fill the container (accounting for padding)
                displayValue: false,
                margin: 0,
                background: "#ffffff",
                lineColor: "#000000"
            });
        } catch (e) {
            console.error("Barcode generation failed", e);
        }
    };

    if (!ticket && (!tickets || tickets.length === 0)) return null;

    const renderLabelContent = (t, index = null) => {
        const isBatch = !!t.batchId;
        const totalHeight = isBatch ? heightBatch : heightSingle; // e.g. 320
        const footerHeight = (isBatch && !hideBatchFooter) ? 80 : 0;

        // Safety: Ensure ID is always visible (at least 60px)
        const MIN_ID_HEIGHT = 60;
        const maxBarcodeHeight = totalHeight - footerHeight - MIN_ID_HEIGHT;

        // Clamp barcode height if it pushes ID out
        const effectiveBarcodeHeight = Math.min(barcodeHeight, maxBarcodeHeight);

        // Remaining space goes to ID
        const idSectionHeight = totalHeight - effectiveBarcodeHeight - footerHeight;

        return (
            <div style={{
                position: 'relative', // Anchor for absolute children
                width: `${width}px`,
                height: `${totalHeight}px`,
                backgroundColor: 'white',
                color: 'black',
                border: show || !renderAsPortal ? '1px solid #ccc' : 'none',
                boxSizing: 'border-box',
                overflow: 'hidden'
            }}>
                {/* ZONE 1: BARCODE (Top) */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${effectiveBarcodeHeight}px`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    padding: '5px',
                    zIndex: 10
                }}>
                    <img
                        id={index !== null ? `barcode-${index}` : undefined}
                        ref={index === null ? svgRef : undefined}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        alt="Barcode"
                    />
                </div>

                {/* ZONE 2: ID (Middle) */}
                <div style={{
                    position: 'absolute',
                    top: `${effectiveBarcodeHeight}px`,
                    left: 0,
                    width: '100%',
                    height: `${idSectionHeight}px`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderTop: '2px solid black',
                    overflow: 'hidden',
                    zIndex: 5
                }}>
                    {/* BRANDING LOGO */}
                    <img
                        src="/logo_criterio.png"
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '50px',
                            opacity: 0.4,
                            filter: 'grayscale(100%)'
                        }}
                        alt=""
                    />

                    <span style={{
                        fontSize: `${idFontSize}px`,
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        letterSpacing: '-2px',
                        lineHeight: 1,
                        zIndex: 1 // Ensure text is above logo
                    }}>
                        {t.ticketId}
                    </span>
                </div>

                {/* ZONE 3: BATCH FOOTER (Bottom) */}
                {isBatch && !hideBatchFooter && (
                    <div style={{
                        position: 'absolute',
                        top: `${totalHeight - footerHeight}px`,
                        left: 0,
                        width: '100%',
                        height: `${footerHeight}px`,
                        backgroundColor: 'black',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 20
                    }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1 }}>LOTE</span>
                        <span style={{ fontSize: `${batchFontSize}px`, fontWeight: 'bold', fontFamily: 'monospace', lineHeight: 1 }}>{t.batchId}</span>
                    </div>
                )}
            </div>
        );

    };

    const content = (
        <div style={{
            position: renderAsPortal ? 'fixed' : 'relative',
            top: renderAsPortal ? (show ? '50%' : '0') : 'auto',
            left: renderAsPortal ? (show ? '50%' : '-10000px') : 'auto',
            transform: renderAsPortal && show ? 'translate(-50%, -50%) scale(0.8)' : 'none',
            zIndex: renderAsPortal ? 10000 : 'auto',
            visibility: 'visible',
            opacity: 1,
            pointerEvents: renderAsPortal ? 'none' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        }}>
            {/* Single Ticket Render */}
            {ticket && (
                <div id={INITIAL_LABEL_ID}>
                    {renderLabelContent(ticket)}
                </div>
            )}

            {/* Batch Tickets Render */}
            {tickets && tickets.map((t, index) => (
                <div key={index} id={`batch-label-${index}`}>
                    {renderLabelContent(t, index)}
                </div>
            ))}
        </div>
    );

    if (renderAsPortal) {
        return createPortal(content, document.body);
    }
    return content;
}
