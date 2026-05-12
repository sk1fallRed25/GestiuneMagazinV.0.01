import React from 'react';
import { HashRouter as Router } from 'react-router-dom';
import AppProviders from './AppProviders';
import AppRoutes from './AppRoutes';
import { useAuth } from '../features/auth/AuthContext';

const App = () => {
    const { loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="h-screen flex items-center justify-center font-black text-slate-400 bg-slate-900">
                MagazinPro 0.2.0...
            </div>
        );
    }

    return (
        <Router>
            <AppRoutes />
        </Router>
    );
};

const AppRoot = () => {
    return (
        <AppProviders>
            <App />
        </AppProviders>
    );
};

export default AppRoot;
