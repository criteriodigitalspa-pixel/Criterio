import { db } from './firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { INITIAL_LABEL_ID } from '../components/PrintLabelInitial';

const PRINT_JOBS_COLLECTION = 'print_jobs';

export const printService = {

    /**
     * Generates a PDF from a DOM element (WYSIWYG) and either downloads or prints it.
     * @param {string} elementId ID of the DOM element to capture
     * @param {number} widthMm Width in mm
     * @param {number} heightMm Height in mm
     * @param {string} action 'DOWNLOAD' or 'PRINT'
     */
    async printDomElement(elementId, widthMm, heightMm, action = 'DOWNLOAD') {
        const originalElement = document.getElementById(elementId);
        if (!originalElement) throw new Error(`Element #${elementId} not found`);

        // CLONE & CLEAN: Avoids CSS transform/scale artifacts from the UI
        const element = originalElement.cloneNode(true);
        document.body.appendChild(element);

        // Reset Styles for reliable capture
        element.style.transform = 'none';
        element.style.position = 'fixed';
        element.style.top = '0';
        element.style.left = '-10000px'; // Move off-screen to avoid flash
        element.style.zIndex = '9999'; // Ensure it's on top (but maybe hidden works too? html2canvas needs visibility)
        element.style.margin = '0';
        // Force background to white to avoid transparency issues
        element.style.backgroundColor = '#ffffff';

        try {
            // Capture with html2canvas
            const canvas = await html2canvas(element, {
                scale: 2, // Aggressive reduction for Firestore limit (1MB)
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: element.offsetWidth, // Explicit dimensions match
                height: element.offsetHeight,
                windowWidth: element.offsetWidth,
                windowHeight: element.offsetHeight
            });

            // Cleanup immediately
            document.body.removeChild(element);

            if (action === 'DOWNLOAD_IMAGE') {
                const link = document.createElement('a');
                link.download = `TEST_IMAGE_${widthMm}x${heightMm}_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                return true;
            }

            // ROTATION LOGIC for 70x50 Labels on 50mm Roll
            // If we have a 70mm wide label but the printer is likely 50mm (or user wants it along the roll),
            // we must rotate the content 90 degrees so 70mm content fits on 70mm Length (Height).

            let finalWidth = widthMm;
            let finalHeight = heightMm;
            let finalImgData = canvas.toDataURL('image/jpeg', 0.8);
            let orientation = 'landscape';

            // TRIGGER: Specific 70x50 rotation (Preserve Ficha) OR 50x30 (User Fix)
            if ((widthMm === 70 && heightMm === 50) || (widthMm === 50 && heightMm === 30)) {
                console.log(`Auto-Rotating ${widthMm}x${heightMm} for thermal roll...`);

                const angle = 90;
                finalImgData = await this._rotateBase64Image(finalImgData, angle);

                // Swap Dimensions
                finalWidth = heightMm;
                finalHeight = widthMm;
                orientation = 'portrait';
            }
            // TRIGGER: Already Rotated Input (50x70) - Coming from Playground Smart Swap
            // We don't need to rotate the image (it's already tall), but we MUST set PDF to Portrait.
            else if (widthMm === 50 && heightMm === 70) {
                // CASE: Playground sent swapped dimensions (50x70), but captured DOM might be 70x50 (Landscape).
                // We MUST check the canvas aspect ratio.
                if (canvas.width > canvas.height) {
                    console.log("Detected Landscape Canvas for Portrait Target. Rotating...");
                    finalImgData = await this._rotateBase64Image(finalImgData, 90);
                }
                orientation = 'portrait';
            }

            // Fallback: If no orientation set, default to landscape
            if (!orientation) {
                orientation = 'landscape';
            }

            // Create PDF
            // Always use Landscape for default label printing to match driver expectations (Horizontal).
            // But if we explicitly set Portrait above (for 50x70), use that.
            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: [finalWidth, finalHeight] // jsPDF convention [width, height]
            });

            // FORCE FILL WITH SAFETY MARGINS
            // Thermal printers often have ~1-2mm unprintable edges.
            // We shrink the content slightly to ensure barcodes aren't cut off.
            // For 50x30, we suspect massive clipping. We'll try a 4mm margin (42x22 effective).
            const isSmall = (widthMm === 50 && heightMm === 30);
            const margin = isSmall ? 4 : 1.5;

            const printW = finalWidth - (margin * 2);
            const printH = finalHeight - (margin * 2);

            pdf.addImage(finalImgData, 'JPEG', margin, margin, printW, printH);

            if (action === 'DOWNLOAD') {
                pdf.save(`TEST_PRINT_${widthMm}x${heightMm}_${Date.now()}.pdf`);
                return true;
            }

            if (action === 'PRINT') {
                // DEBUG: Verify PDF before sending
                // pdf.save(`DEBUG_PRINT_SENT_${widthMm}x${heightMm}.pdf`);

                const payload = pdf.output('datauristring').split(',')[1];

                // NORMALIZE PAPER STRING FOR PRINT AGENT ROUTING
                // Spec expects '50x70' for technical queue.
                let paperStr = `${widthMm}x${heightMm}`;
                if ((widthMm === 70 && heightMm === 50) || (widthMm === 50 && heightMm === 70)) {
                    paperStr = '50x70';
                }

                // Use setDoc with a manual random ID to prevent "Document already exists" collisions
                // This bypasses any weird caching or library auto-id issues.
                const manualId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const jobRef = doc(db, PRINT_JOBS_COLLECTION, manualId);

                // Construct Job Data
                // Send orientation if it was explicitly changed (e.g. Ficha/Etiqueta Rotated -> Portrait)
                const jobData = {
                    ticketId: 'TEST-PLAYGROUND',
                    displayId: 'TEST',
                    type: 'pdf',
                    payload: payload,
                    status: 'pending',
                    createdAt: serverTimestamp(),
                    printerId: 'default',
                    paper: paperStr
                };

                if (orientation) {
                    jobData.orientation = orientation;
                }

                await setDoc(jobRef, jobData);
                console.log("Test Print Job Sent:", manualId);
                return manualId;
            }

        } catch (error) {
            console.error("Print Error:", error);
            // alert("Error imprimiendo: " + error.message);
            throw error;
        }
    },

    /**
     * Core Generator: Creates a jsPDF object from DOM elements
     * @param {Array} tickets 
     * @param {string} type 'initial' | 'full' 
     * @param {boolean} mapToBatchId If true, maps to #batch-label-{i}, else #initial-label-preview
     */
    /**
     * Core Generator: Creates a jsPDF object natively (No html2canvas)
     */
    async createPdfObject(tickets, type = 'initial', isBatchMode = false) {
        // Determine Config based on Type
        let widthMm = 50;
        let heightMm = 30;

        if (type === 'technical') {
            widthMm = 70;
            heightMm = 50;
        } else {
            // Standard Logic (Initial)
            const hasBatch = tickets.some(t => t.batchId);
            heightMm = hasBatch ? 40 : 30; // 30mm standard, 40mm if batch footer
        }

        // JS PDF Landscape orientation
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [heightMm, widthMm]
        });

        for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            if (i > 0) pdf.addPage([heightMm, widthMm], 'landscape');

            const canvas = document.createElement("canvas");

            // --- TECHNICAL LABEL (50x70mm) ---
            if (type === 'technical') {
                // Header (Ticket ID)
                pdf.setFontSize(16);
                pdf.setFont("helvetica", "bold");
                pdf.text(ticket.ticketId, 35, 8, { align: "center" });

                // Date
                pdf.setFontSize(8);
                pdf.setFont("helvetica", "normal");
                const dateStr = ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
                pdf.text(dateStr, 68, 5, { align: "right" });

                // Separator
                pdf.setLineWidth(0.5);
                pdf.line(2, 10, 68, 10);

                // BODY CONTENT
                pdf.setFontSize(9);
                pdf.text(`Cliente: ${ticket.nombreCliente || 'N/A'}`, 2, 16);
                // pdf.text(`Tel: ${ticket.clientPhone || 'N/A'}`, 2, 21); // Phone not always available in ticket object shown

                pdf.setFont("helvetica", "bold");
                pdf.text(`Equipo: ${ticket.marca || ''} ${ticket.modelo || ''}`, 2, 22);

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                // Serial
                pdf.text(`SN: ${ticket.serialNumber || 'N/A'}`, 2, 27);

                // Specs (Truncated)
                const ramStr = Array.isArray(ticket.ram?.detalles) ? ticket.ram.detalles.join(' + ') : ticket.ram?.detalles || '';
                const diskStr = Array.isArray(ticket.disco?.detalles) ? ticket.disco.detalles.join(' + ') : ticket.disco?.detalles || '';
                const specs = `${ticket.specs?.cpu || ''} ${ticket.specs?.gpu || ''} ${ramStr} ${diskStr}`.substring(0, 70);
                pdf.text(pdf.splitTextToSize(specs, 66), 2, 32);

                // Barcode at Footer
                JsBarcode(canvas, ticket.ticketId, {
                    format: "CODE128",
                    displayValue: false,
                    width: 2,
                    height: 30, // Higher barcode for readability
                    margin: 0
                });
                // Bottom area for barcode
                pdf.addImage(canvas.toDataURL("image/jpeg"), "JPEG", 10, 38, 50, 10);

            } else {
                // --- STANDARD LABEL (50x30 / 50x40) ---

                // 1. Barcode
                JsBarcode(canvas, ticket.ticketId, {
                    format: "CODE128",
                    displayValue: false,
                    width: 2,
                    height: 40,
                    margin: 0
                });
                pdf.addImage(canvas.toDataURL("image/jpeg"), "JPEG", 5, 2, 40, 15);

                // 2. Separator
                pdf.setLineWidth(0.7);
                pdf.line(2, 19, 48, 19);

                // 3. Ticket ID
                pdf.setFontSize(22);
                pdf.setFont("helvetica", "bold");
                pdf.text(ticket.ticketId, 25, 28, { align: "center" });

                // 4. Batch Footer
                if (ticket.batchId) {
                    pdf.setFillColor(0, 0, 0); // Black rect
                    pdf.rect(0, 30, 50, 10, 'F');

                    pdf.setTextColor(255, 255, 255); // White text
                    pdf.setFontSize(10);
                    pdf.text(`LOTE: ${ticket.batchId}`, 25, 36, { align: 'center' });
                    pdf.setTextColor(0, 0, 0); // Reset
                }
            }
        }

        return pdf;
    },

    /**
     * Generates a single PDF (multi-page) for Preview or Manual Print
     */
    async generateBatchPDFBlob(tickets, type = 'initial') {
        const isBatch = tickets.length > 1; // Or explicit flag?
        // If it's a batch list, we assume isBatchMode=true for DOM mapping if the parent component renders them as loop.
        // We need clarity: does the UI render 10 labels? Yes, IngresoTicket renders PrintLabelInitial with `tickets={lastCreatedBatch}` which maps them?
        // No, PrintLabelInitial usually renders ONE. 
        // IngresoTicket renders: `<PrintLabelInitial ticket={lastCreatedTicket} tickets={lastCreatedBatch} />`
        // We need to check if PrintLabelInitial renders a loop. Assuming yes based on previous context.

        const pdf = await this.createPdfObject(tickets, type, tickets.length > 0);
        return pdf.output('blob');
    },

    /**
     * Zips individual PDFs for each ticket
     */
    async downloadBatchZip(tickets, type = 'initial') {
        const zip = new JSZip();

        // Generate INDIVIDUAL PDFs
        for (let i = 0; i < tickets.length; i++) {
            const t = tickets[i];
            // We treat each as a "single" run, but we must find the correct DOM element.
            // If they are rendered in a batch loop (ids: batch-label-0, batch-label-1...) 
            // we must use batch mode logic but limit the loop to just that index?
            // No, createPdfObject iterates. 
            // We can pass a subset [t] but telling it to look for ID `batch-label-${i}` is hard if we pass [t] (index 0).

            // Custom extraction for ZIP:
            // We manually grab the element.
            const heightMm = type === 'full' ? 50 : (t.batchId ? 40 : 30);
            const widthMm = type === 'full' ? 70 : 50;
            const elementId = `batch-label-${i}`; // Assumes calling context has rendered them this way
            const element = document.getElementById(elementId);

            if (!element) continue;

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [heightMm, widthMm] });

            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthMm, heightMm);

            const fileName = `${t.ticketId}_${type}.pdf`;
            zip.file(fileName, pdf.output('blob'));
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `Etiquetas_Lote_${new Date().getTime()}.zip`);
    },

    /**
     * Sends to Cloud Printer (Firestore)
     */
    async printLabel(ticket, type = 'initial') {
        try {
            // For single print, we use non-batch logic
            const pdf = await this.createPdfObject([ticket], type, false);

            // DEBUG: Auto-download for verification
            // pdf.save(`DEBUG_SINGLE_${ticket.ticketId}_${Date.now()}.pdf`);

            const payload = pdf.output('datauristring').split(',')[1]; // Base64

            let paperType = '50x30';
            if (type === 'technical' || type === 'detailed') {
                paperType = '50x70';
            } else if (ticket.batchId) {
                paperType = '50x40';
            }

            // ORIENTATION LOGIC
            // PDF Generation: Matches visual check (Landscape for 50x30).
            // Driver Instruction: Matches physical roll flow.

            // For 50x30, Driver 'Landscape' causes rotation (Step 1785).
            // We force Driver 'Portrait' to stop it from rotating, while sending a Landscape PDF.
            let driverOrientation = 'landscape'; // Default to matching PDF
            // If it's a standard 50x30 label (not technical, not batch footer)
            if (type !== 'technical' && !ticket.batchId) {
                driverOrientation = 'portrait';
            }

            await addDoc(collection(db, PRINT_JOBS_COLLECTION), {
                ticketId: ticket.id,
                displayId: ticket.ticketId,
                type: 'pdf',
                payload: payload,
                status: 'pending',
                createdAt: serverTimestamp(),
                printerId: 'default',
                paper: paperType,
                orientation: driverOrientation // Use the determined driver orientation
            });
            console.log("Job Sent");
        } catch (error) {
            console.error("Print Error:", error);
            throw error;

        }
    },

    /**
     * Sends a Batch Job (Multi-page PDF) to Cloud
     */
    async printBatchLabels(tickets, type = 'initial') {
        try {
            // Generate PDF for the entire batch
            const pdf = await this.createPdfObject(tickets, type, true); // true = batch mapping

            // DEBUG: Auto-download to verify content
            // pdf.save(`DEBUG_LOTE_${tickets.length}_${Date.now()}.pdf`);

            const payload = pdf.output('datauristring').split(',')[1]; // Base64

            // Create a single job for all tickets
            // We give it a generic ID or the ID of the first ticket
            const displayId = `LOTE-${tickets.length}-${Date.now().toString().slice(-4)}`;

            let paperType = '50x30';
            if (type === 'technical' || type === 'detailed') {
                paperType = '50x70';
            } else if (tickets.some(t => t.batchId)) {
                paperType = '50x40';
            }

            await addDoc(collection(db, PRINT_JOBS_COLLECTION), {
                ticketId: 'BATCH', // Generic
                displayId: displayId,
                batchSize: tickets.length,
                type: 'pdf',
                payload: payload,
                status: 'pending',
                createdAt: serverTimestamp(),
                printerId: 'default',
                paper: paperType
            });
            console.log(`Batch Job Sent (${tickets.length} labels)`);
        } catch (error) {
            console.error("Batch Print Error:", error);
            throw error;
        }
    },

    async generateBatchPDF(tickets) {
        const blob = await this.generateBatchPDFBlob(tickets);
        return URL.createObjectURL(blob);
    },

    // HELPER: Rotate Base64 Image (90 or -90 Degrees)
    _rotateBase64Image(srcBase64, angle = 90) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');

                // CRITICAL FIX: Ensure precise float dimensions are swapped to avoid rounding/compression errors
                const newWidth = img.height;
                const newHeight = img.width;

                canvas.width = newWidth;
                canvas.height = newHeight;

                const ctx = canvas.getContext('2d');

                // High quality scaling settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Rotate around center
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(angle * Math.PI / 180);

                // Draw image EXACTLY at its original dimensions, centered.
                // Since we swapped canvas W/H, drawing the original W/H rotated fits perfectly.
                ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);

                resolve(canvas.toDataURL('image/jpeg', 0.9)); // Increased quality slightly
            };
            img.src = srcBase64;
        });
    }
};
