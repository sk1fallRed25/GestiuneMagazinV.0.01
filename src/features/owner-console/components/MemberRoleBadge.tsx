import React from 'react';
import { OwnerMemberRole } from '../types';

interface MemberRoleBadgeProps {
  role: OwnerMemberRole;
}

export const MemberRoleBadge: React.FC<MemberRoleBadgeProps> = ({ role }) => {
  const getBadgeStyles = () => {
    switch (role) {
      case 'admin':
        return {
          bg: 'bg-purple-500/10 dark:bg-purple-500/20',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-purple-500/30',
          label: 'Administrator'
        };
      case 'manager':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/20',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-500/30',
          label: 'Manager'
        };
      case 'gestionar':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-500/30',
          label: 'Gestionar'
        };
      case 'casier':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-500/30',
          label: 'Casier'
        };
      default:
        return {
          bg: 'bg-gray-500/10 dark:bg-gray-500/20',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-gray-500/30',
          label: role
        };
    }
  };

  const styles = getBadgeStyles();

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles.bg} ${styles.text} ${styles.border} shadow-sm backdrop-blur-xs transition-all`}>
      {styles.label}
    </span>
  );
};
