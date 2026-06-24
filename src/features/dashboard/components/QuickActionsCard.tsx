import React from 'react';
import { Link } from 'react-router-dom';
import { 
    PlusCircle, 
    ArrowLeftRight, 
    Trash2, 
    PackagePlus, 
    Tag, 
    Zap 
} from 'lucide-react';

export const QuickActionsCard: React.FC = () => {
    const actions = [
        {
            title: "Recepție Nouă",
            desc: "Înregistrare NIR și prețuri",
            to: "/receptie",
            icon: PlusCircle,
            color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-100",
        },
        {
            title: "Transfer Nou",
            desc: "Depozit spre magazin",
            to: "/transfer",
            icon: ArrowLeftRight,
            color: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-100",
        },
        {
            title: "Casare Nouă",
            desc: "Scrap / pierderi stoc",
            to: "/pierderi",
            icon: Trash2,
            color: "text-rose-600 bg-rose-50 hover:bg-rose-100/80 border-rose-100",
        },
        {
            title: "Adaugă Produs",
            desc: "Fast-add în catalog",
            to: "/fast-add",
            icon: PackagePlus,
            color: "text-purple-600 bg-purple-50 hover:bg-purple-100/80 border-purple-100",
        },
        {
            title: "Prețuri Lipsă",
            desc: "Setare prețuri neconfigurate",
            to: "/produse?aiFilter=no_price",
            icon: Tag,
            color: "text-amber-600 bg-amber-50 hover:bg-amber-100/80 border-amber-100",
        }
    ];

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
                <Zap className="text-indigo-650" size={20} />
                Acțiuni Rapide
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {actions.map((act, idx) => {
                    const Icon = act.icon;
                    return (
                        <Link 
                            key={idx}
                            to={act.to}
                            className={`p-4 rounded-2xl border flex flex-col items-center text-center justify-between gap-2 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-md ${act.color}`}
                        >
                            <div className="p-2 rounded-xl bg-white shadow-xs">
                                <Icon size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 leading-tight">
                                    {act.title}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-snug">
                                    {act.desc}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};
