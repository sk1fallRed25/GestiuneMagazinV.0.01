import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../features/auth/AuthContext';
import { ModuleEntitlementsProvider } from '../features/module-entitlements/ModuleEntitlementsContext';

interface AppProvidersProps {
    children: React.ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => {
    return (
        <AuthProvider>
            <ModuleEntitlementsProvider>
                <Toaster position="top-right" />
                {children}
            </ModuleEntitlementsProvider>
        </AuthProvider>
    );
};

export default AppProviders;

