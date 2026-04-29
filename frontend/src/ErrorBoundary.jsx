import React from 'react';
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('EB CATCH:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{color:'red', padding:'20px', background:'white'}}>
                    <h1>Crash!</h1>
                    <pre style={{color:'black'}}>{this.state.error && this.state.error.toString()}</pre>
                    <pre style={{color:'black'}}>{this.state.errorInfo?.componentStack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}
