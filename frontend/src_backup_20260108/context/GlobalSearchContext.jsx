import React, { createContext, useContext, useState, useEffect } from 'react';

const GlobalSearchContext = createContext();

export const GlobalSearchProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    const openSearch = () => setIsOpen(true);
    const closeSearch = () => setIsOpen(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check for Cmd+K (Mac) or Ctrl+K (Windows)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            // Close on Escape
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    return (
        <GlobalSearchContext.Provider value={{ isOpen, openSearch, closeSearch }}>
            {children}
        </GlobalSearchContext.Provider>
    );
};

export const useGlobalSearch = () => useContext(GlobalSearchContext);
