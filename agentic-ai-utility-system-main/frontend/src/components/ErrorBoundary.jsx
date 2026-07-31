import React from 'react';

// Error Boundary Component for crash protection
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background-primary">
                    <div className="text-center p-8">
                        <h1 className="text-4xl font-bold text-red-500 mb-4">⚠️ Something Went Wrong</h1>
                        <p className="text-gray-400 mb-6">{this.state.error?.message}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
