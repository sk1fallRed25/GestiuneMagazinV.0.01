import React from 'react';

interface AiKpiCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext?: string;
    color: 'indigo' | 'emerald' | 'orange' | 'red' | 'purple' | 'blue';
    testId?: string;
}

export const AiKpiCard: React.FC<AiKpiCardProps> = ({
    icon,
    label,
    value,
    subtext,
    color,
    testId
}) => {
    const config = {
        indigo: {
            bg: 'from-indigo-50/50 to-indigo-100/10 hover:border-indigo-300 dark:hover:border-indigo-500',
            text: 'text-indigo-600',
            iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        },
        emerald: {
            bg: 'from-emerald-50/50 to-emerald-100/10 hover:border-emerald-300 dark:hover:border-emerald-500',
            text: 'text-emerald-600',
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        orange: {
            bg: 'from-orange-50/50 to-orange-100/10 hover:border-orange-300 dark:hover:border-orange-500',
            text: 'text-orange-600',
            iconBg: 'bg-orange-50 text-orange-600 border-orange-100',
        },
        red: {
            bg: 'from-red-50/50 to-red-100/10 hover:border-red-300 dark:hover:border-red-500',
            text: 'text-red-600',
            iconBg: 'bg-red-50 text-red-600 border-red-100',
        },
        purple: {
            bg: 'from-purple-50/50 to-purple-100/10 hover:border-purple-300 dark:hover:border-purple-500',
            text: 'text-purple-600',
            iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
        },
        blue: {
            bg: 'from-blue-50/50 to-blue-100/10 hover:border-blue-300 dark:hover:border-blue-500',
            text: 'text-blue-600',
            iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
        }
    };

    const style = config[color] || config.indigo;

    return (
        <div 
            data-testid={testId}
            className={`bg-white bg-gradient-to-br ${style.bg} p-6 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex items-center gap-5`}
        >
            <div className={`w-14 h-14 ${style.iconBg} border rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
                {React.cloneElement(icon as React.ReactElement, { size: 28 })}
            </div>
            <div className="min-w-0 flex-1">
                <p 
                    title={label} 
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 whitespace-normal break-words"
                >
                    {label}
                </p>
                <p 
                    title={value} 
                    className="text-2xl font-black text-slate-800 leading-tight truncate"
                >
                    {value}
                </p>
                {subtext && (
                    <p 
                        title={subtext} 
                        className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 whitespace-normal break-words"
                    >
                        {subtext}
                    </p>
                )}
            </div>
        </div>
    );
};
