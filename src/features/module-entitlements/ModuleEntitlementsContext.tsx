import React, { createContext, useContext } from 'react';
import { useAuth } from '../auth/useAuth';
import { useModuleEntitlements, UseModuleEntitlementsResult } from './hooks/useModuleEntitlements';

const ModuleEntitlementsContext = createContext<UseModuleEntitlementsResult | undefined>(undefined);

export const ModuleEntitlementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentStoreId, role } = useAuth();
  
  const value = useModuleEntitlements(currentStoreId, role);

  return (
    <ModuleEntitlementsContext.Provider value={value}>
      {children}
    </ModuleEntitlementsContext.Provider>
  );
};

export const useModuleEntitlementsContext = (): UseModuleEntitlementsResult => {
  const context = useContext(ModuleEntitlementsContext);
  if (context === undefined) {
    throw new Error('useModuleEntitlementsContext must be used within a ModuleEntitlementsProvider');
  }
  return context;
};
