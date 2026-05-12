import React from 'react';
import { 
    LayoutDashboard, Package, CalendarClock, AlertOctagon, 
    History, Briefcase, BrainCircuit, Truck, ShoppingCart, 
    FileText, Settings 
} from 'lucide-react';
import { UserRole } from '../features/auth/types';

export interface NavItem {
    to: string;
    label: string;
    icon: React.ReactNode;
    roles?: UserRole[];
    category?: string;
}

export const navigationConfig: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, category: 'General', roles: ['admin', 'platform_owner', 'tenant_admin', 'manager'] },
    
    { to: '/produse', label: 'Stocuri & Produse', icon: <Package size={18} />, category: 'Stocuri', roles: ['admin', 'platform_owner', 'tenant_admin', 'manager', 'gestionar'] },
    { to: '/expirari', label: 'Produse Expirate', icon: <CalendarClock size={18} />, category: 'Stocuri', roles: ['admin', 'platform_owner', 'tenant_admin', 'manager', 'gestionar'] },
    { to: '/pierderi', label: 'Raportare Pierderi', icon: <AlertOctagon size={18} />, category: 'Stocuri', roles: ['admin', 'platform_owner', 'tenant_admin', 'gestionar'] },
    
    { to: '/receptie', label: 'Recepție Marfă', icon: <Settings size={18} />, category: 'Operațiuni', roles: ['admin', 'platform_owner', 'tenant_admin', 'gestionar'] },
    { to: '/transfer', label: 'Transfer Marfă', icon: <Settings size={18} />, category: 'Operațiuni', roles: ['admin', 'platform_owner', 'tenant_admin', 'gestionar'] },
    
    { to: '/istoric-pierderi', label: 'Audit Pierderi', icon: <History size={18} />, category: 'Administrare', roles: ['admin', 'platform_owner', 'tenant_admin', 'manager'] },
    { to: '/ai-consultant', label: 'AI Consultant', icon: <BrainCircuit size={18} />, category: 'Administrare', roles: ['admin', 'platform_owner', 'tenant_admin', 'manager'] },
    
    { to: '/vanzare', label: 'Deschide POS', icon: <ShoppingCart size={18} />, category: 'Vânzare', roles: ['admin', 'platform_owner', 'tenant_admin', 'casier'] },
    { to: '/istoric-vanzari', label: 'Istoric Vânzări', icon: <FileText size={18} />, category: 'Vânzare', roles: ['admin', 'platform_owner', 'tenant_admin', 'manager'] },
    
    { to: '/fast-add', label: 'Adăugare Rapidă', icon: <Settings size={18} />, category: 'Sistem', roles: ['admin', 'platform_owner', 'tenant_admin'] },
];
