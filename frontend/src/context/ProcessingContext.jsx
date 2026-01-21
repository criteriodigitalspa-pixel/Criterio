
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { printService } from '../services/printService';
import PrintLabelInitial from '../components/PrintLabelInitial';
import PrintLabel from '../components/PrintLabel'; // Import Detailed Component
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ProcessingContext = createContext(null);

export const useProcessing = () => useContext(ProcessingContext);

// Base Config Fallback (If DB Empty) - Duplicated from Playground to avoid circular deps or complex exports
const DEFAULT_DETAILED_FALLBACK = {
    barcodeHeight: 260,
    rightStripWidth: 300,
    modules: {}
};

export function ProcessingProvider({ children }) {
    const [tasks, setTasks] = useState([]);
    const [printingTicket, setPrintingTicket] = useState(null);
    const [templateConfig, setTemplateConfig] = useState(DEFAULT_DETAILED_FALLBACK);

    // FETCH TEMPLATE ON MOUNT
    useEffect(() => {
        const loadConfig = async () => {
            let config = DEFAULT_DETAILED_FALLBACK;
            try {
                // 1. Try DB
                if (db) {
                    const docRef = doc(db, 'label_templates', 'template_detailed_7050');
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        config = snap.data().config;
                        console.log("GlobalPrinter: Loaded config from DB");
                    } else {
                        console.warn("GlobalPrinter: Template 7050 not found in DB, using default.");
                    }
                }
            } catch (e) {
                if (e.code === 'permission-denied') {
                    // console.debug("GlobalPrinter: Config Access Denied (Non-Admin), using default.");
                } else {
                    console.error("GlobalPrinter Config Load Error:", e);
                }

                // Fallback to local storage backup if available
                const backup = localStorage.getItem('label_templates_backup');
                if (backup) {
                    try {
                        const parsed = JSON.parse(backup);
                        const found = parsed.find(t => t.id === 'template_detailed_7050');
                        if (found) config = found.config;
                    } catch (parseError) {
                        console.error("Backup parse error", parseError);
                    }
                }
            } finally {
                setTemplateConfig(config);
            }
        };
        loadConfig();
    }, []);

    const addTask = useCallback((task) => {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        const newTask = { ...task, id, status: 'pending', progress: 0 };
        setTasks(prev => [...prev, newTask]);
        return id;
    }, []);

    const updateTask = useCallback((id, updates) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }, []);

    const removeTask = useCallback((id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    // MAIN BACKGROUND RUNNER
    const runBackgroundTask = useCallback(async (message, promiseFactory) => {
        const taskId = addTask({ message, type: 'bg_job' });
        try {
            await promiseFactory((progress) => {
                updateTask(taskId, { progress });
            });
            updateTask(taskId, { status: 'success', progress: 100 });
            setTimeout(() => {
                removeTask(taskId);
            }, 5000);
            return true;
        } catch (error) {
            console.error("BG Task Error:", error);
            updateTask(taskId, { status: 'error', message: `Error: ${error.message}` });
            setTimeout(() => {
                removeTask(taskId);
            }, 10000);
            return false;
        }
    }, [addTask, updateTask, removeTask]);

    // GLOBAL PRINT TASK
    const printTask = useCallback(async (ticket) => {
        setPrintingTicket(ticket);

        // Wait for DOM Render & Image Load
        // Detailed labels have images (logos). Giving it decent time.
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            // Use DOM Capture instead of Manual Generation
            // Target the WRAPPER ID to ensure styles/fonts are captured
            const elementId = 'global-print-target-wrapper';

            // 70x50mm Landscape (Native)
            await printService.printDomElement(elementId, 70, 50, 'PRINT');

            toast.success("Enviado a impresión");
        } catch (error) {
            console.error("Global Print Error:", error);
            toast.error(`Error al imprimir: ${error.message}`);
        } finally {
            // Keep specific ticket loaded slightly longer to avoid flash-unmount during capture
            // (printDomElement is async but html2canvas is awaited inside it, so it should be done)
            setPrintingTicket(null);
        }
    }, []);

    return (
        <ProcessingContext.Provider value={{ tasks, addTask, updateTask, removeTask, runBackgroundTask, printTask }}>
            {children}

            {/* GLOBAL HIDDEN PRINT RENDERER */}
            {/* Mounted but hidden via CSS to allow html2canvas to capture it. */}
            {/* Opacity 0 is fine, display none is NOT. */}
            <div className="fixed top-0 left-0 z-[-50] opacity-0 pointer-events-none">
                {printingTicket && templateConfig && (
                    <div
                        id="global-print-target-wrapper"
                        className="inline-block bg-white"
                        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }} // Enforce font globally
                    >
                        <PrintLabel
                            ticket={printingTicket}
                            config={templateConfig}
                            id="global-print-target"
                        />
                    </div>
                )}
            </div>
        </ProcessingContext.Provider>
    );
}
