
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { printService } from '../services/printService';
import PrintLabelInitial from '../components/PrintLabelInitial';

const ProcessingContext = createContext(null);

export const useProcessing = () => useContext(ProcessingContext);

export function ProcessingProvider({ children }) {
    const [tasks, setTasks] = useState([]); // { id, message, status: 'pending'|'success'|'error', type: 'batch'|'pdf' }
    const [printingTicket, setPrintingTicket] = useState(null); // Global State for Single Print Rendering

    // UseRef to keep track of tasks without re-rendering logic that depends on it inside loops
    // But State is needed for UI.

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
        // Optional delay before removing success tasks?
        // Let's remove immediately or after component-handled delay
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    // MAIN BACKGROUND RUNNER
    // Wrapper to run a promise and update a task
    const runBackgroundTask = useCallback(async (message, promiseFactory) => {
        const taskId = addTask({ message, type: 'bg_job' });
        try {
            await promiseFactory((progress) => {
                updateTask(taskId, { progress });
            });
            updateTask(taskId, { status: 'success', progress: 100 });
            // Auto remove after 5 seconds to show success
            setTimeout(() => {
                removeTask(taskId);
            }, 5000);
            return true;
        } catch (error) {
            console.error("BG Task Error:", error);
            updateTask(taskId, { status: 'error', message: `Error: ${error.message}` });
            // Auto remove after 10 seconds (error)
            setTimeout(() => {
                removeTask(taskId);
            }, 10000);
            return false;
        }
    }, [addTask, updateTask, removeTask]);

    // GLOBAL PRINT TASK (Persists across navigation)
    const printTask = useCallback(async (ticket) => {
        setPrintingTicket(ticket);
        // Wait for DOM Render
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            await printService.printLabel(ticket, 'initial');
            toast.success("Enviado a impresión");
        } catch (error) {
            console.error("Global Print Error:", error);
            toast.error("Error al imprimir");
        } finally {
            // Keep it for a moment just in case, then clear
            setTimeout(() => setPrintingTicket(null), 1000);
        }
    }, []);

    return (
        <ProcessingContext.Provider value={{ tasks, addTask, updateTask, removeTask, runBackgroundTask, printTask }}>
            {children}

            {/* GLOBAL HIDDEN PRINT RENDERER (Safe from Unmounts) */}
            <div className="fixed top-0 left-0 pointer-events-none opacity-100 z-[-50] w-full h-full overflow-hidden">
                {printingTicket && <PrintLabelInitial ticket={printingTicket} renderAsPortal={false} />}
            </div>
        </ProcessingContext.Provider>
    );
}
