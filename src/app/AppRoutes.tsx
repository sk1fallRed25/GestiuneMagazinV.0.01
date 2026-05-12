import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { UserRole } from '../features/auth/types';
import ProtectedRoute from '../features/auth/ProtectedRoute';
import MainLayout from './MainLayout';

// Importuri Pagini (temporar din src/)
import Login from '../Login';
import Dashboard from '../features/dashboard/DashboardPage';
import { ProductsPage as Produse } from '../features/products';
import Expirari from '../Expirari';
import Pierderi from '../Pierderi';
import IstoricPierderi from '../IstoricPierderi';
import Receptie from '../Receptie';
import TransferMarfa from '../TransferMarfa';
import Vanzare from '../Vanzare';
import IstoricVanzari from '../IstoricVanzari';
import AiConsultant from '../AiConsultant';
import Furnizori from '../Furnizori';
import FastAdd from '../FastAdd';

const AppRoutes = () => {
    const { role: authRole, logout: authLogout } = useAuth();
    
    const allowLegacy = import.meta.env.VITE_ALLOW_LEGACY_LOGIN === 'true';
    const legacyRole = allowLegacy ? (localStorage.getItem('magazin_role') as any) : null;
    const userRole = authRole || legacyRole;

    const handleLogout = async () => {
        if (confirm("Deconectare MagazinPro?")) {
            await authLogout();
            localStorage.clear();
            window.location.href = '/#/login';
        }
    };

    const ROLES_ADMIN: UserRole[] = ['admin', 'platform_owner', 'tenant_admin'];
    const ROLES_STAFF: UserRole[] = [...ROLES_ADMIN, 'manager', 'gestionar'];
    const ROLES_POS: UserRole[] = [...ROLES_ADMIN, 'casier'];

    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/pos" element={
                <ProtectedRoute allowedRoles={ROLES_POS}>
                    <div className="h-screen flex flex-col bg-gray-900">
                        <div className="bg-gray-800 text-white px-6 py-2 flex justify-between items-center text-[10px] font-black border-b border-gray-700">
                            <span>MOD CASIER ACTIV (SECURE)</span>
                            <button onClick={handleLogout} className="text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors">Iesire</button>
                        </div>
                        <div className="flex-1 bg-gray-100 overflow-hidden">
                            <Vanzare />
                        </div>
                    </div>
                </ProtectedRoute>
            } />

            <Route path="/*" element={
                <ProtectedRoute>
                    <MainLayout onLogout={handleLogout} userRole={userRole}>
                        <Routes>
                            <Route path="/" element={
                                <ProtectedRoute allowedRoles={['admin', 'platform_owner', 'tenant_admin', 'manager']}>
                                    <Dashboard userRole={userRole} />
                                </ProtectedRoute>
                            } />
                            <Route path="/produse" element={
                                <ProtectedRoute allowedRoles={ROLES_STAFF}>
                                    <Produse userRole={userRole} />
                                </ProtectedRoute>
                            } />
                            <Route path="/expirari" element={
                                <ProtectedRoute allowedRoles={ROLES_STAFF}>
                                    <Expirari />
                                </ProtectedRoute>
                            } />
                            <Route path="/pierderi" element={
                                <ProtectedRoute allowedRoles={[...ROLES_ADMIN, 'gestionar']}>
                                    <Pierderi />
                                </ProtectedRoute>
                            } />
                            <Route path="/istoric-pierderi" element={
                                <ProtectedRoute allowedRoles={[...ROLES_ADMIN, 'manager']}>
                                    <IstoricPierderi />
                                </ProtectedRoute>
                            } />
                            <Route path="/receptie" element={
                                <ProtectedRoute allowedRoles={[...ROLES_ADMIN, 'gestionar']}>
                                    <Receptie />
                                </ProtectedRoute>
                            } />
                            <Route path="/transfer" element={
                                <ProtectedRoute allowedRoles={[...ROLES_ADMIN, 'gestionar']}>
                                    <TransferMarfa />
                                </ProtectedRoute>
                            } />
                            <Route path="/vanzare" element={
                                <ProtectedRoute allowedRoles={ROLES_POS}>
                                    <Vanzare />
                                </ProtectedRoute>
                            } />
                            <Route path="/istoric-vanzari" element={
                                <ProtectedRoute allowedRoles={[...ROLES_ADMIN, 'manager']}>
                                    <IstoricVanzari />
                                </ProtectedRoute>
                            } />
                            <Route path="/ai-consultant" element={
                                <ProtectedRoute allowedRoles={[...ROLES_ADMIN, 'manager']}>
                                    <AiConsultant />
                                </ProtectedRoute>
                            } />
                            <Route path="/furnizori" element={
                                <ProtectedRoute allowedRoles={[...ROLES_ADMIN, 'gestionar']}>
                                    <Furnizori />
                                </ProtectedRoute>
                            } />
                            <Route path="/fast-add" element={
                                <ProtectedRoute allowedRoles={ROLES_ADMIN}>
                                    <FastAdd />
                                </ProtectedRoute>
                            } />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </MainLayout>
                </ProtectedRoute>
            } />
        </Routes>
    );
};

export default AppRoutes;
