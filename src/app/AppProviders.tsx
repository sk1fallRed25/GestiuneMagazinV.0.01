import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../features/auth/AuthContext';

interface AppProvidersProps {
    children: React.ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => {
    return (
        <AuthProvider>
            <Toaster position="top-right" />
            {children}
        </AuthProvider>
    );
};

export default AppProviders;
