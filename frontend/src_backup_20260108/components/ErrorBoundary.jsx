import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="max-w-4xl w-full bg-white rounded-lg shadow-xl p-8 border border-red-200">
                        <h1 className="text-3xl font-bold text-red-600 mb-4">😔 Algo salió mal (Crash)</h1>
                        <p className="text-gray-600 mb-6">La aplicación se detuvo por un error inesperado.</p>

                        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                            <h3 className="text-red-400 font-mono text-lg mb-2">Error: {this.state.error?.toString()}</h3>
                            <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                Recargar Página
                            </button>
                            <button
                                onClick={async () => {
                                    if (window.confirm("¿Seguro que desea borrar los datos locales para reparar el sistema?")) {
                                        try {
                                            const dbs = await window.indexedDB.databases();
                                            dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
                                            localStorage.clear();
                                            sessionStorage.clear();
                                            alert("Datos eliminados. El sistema se reiniciará.");
                                            window.location.reload();
                                        } catch (e) {
                                            alert("Error borrando datos. Intente limpiar caché del navegador manualmente.");
                                            console.error(e);
                                        }
                                    }
                                }}
                                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors border border-gray-500"
                            >
                                🔧 Reparar / Resetear Datos
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
