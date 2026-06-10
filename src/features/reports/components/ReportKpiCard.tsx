import React from 'react';

interface ReportKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor?: string;
  description?: string;
}

export const ReportKpiCard: React.FC<ReportKpiCardProps> = ({
  title,
  value,
  icon,
  bgColor = 'bg-indigo-50',
  description
}) => {
  return (
    <div data-testid="reports-kpi-card" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
      <div className={`p-3 rounded-xl ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
        {description && (
          <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>
        )}
      </div>
    </div>
  );
};

export default ReportKpiCard;
