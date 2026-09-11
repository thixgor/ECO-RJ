import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Ops! Algo deu errado.
                        </h1>

                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            Desculpe, encontramos um erro inesperado ao carregar a página. Tente atualizar ou voltar para o início.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors duration-200"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Atualizar Página
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors duration-200"
                            >
                                <Home className="w-4 h-4" />
                                Ir para Início
                            </button>
                        </div>

                        {((import.meta as any).env?.DEV) && this.state.error && (
                            <div className="mt-8 text-left">
                                <details className="bg-gray-50 dark:bg-black/20 p-4 rounded-lg border border-red-200 dark:border-red-900/50">
                                    <summary className="text-xs font-mono text-red-500 cursor-pointer hover:underline mb-2">
                                        Ver detalhes do erro
                                    </summary>
                                    <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 overflow-auto whitespace-pre-wrap max-h-40">
                                        {this.state.error.toString()}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
