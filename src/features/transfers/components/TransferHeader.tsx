import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

export const TransferHeader = () => (
    <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="bg-amber-500 p-2 rounded-xl text-white shadow-lg shadow-amber-200">
                <ArrowLeftRight size={28} />
            </span>
            Transfer Intern de Marfă (v2)
        </h1>
        <p className="text-gray-500 mt-2 ml-1">Mută stocurile între Depozit și Magazin cu trasabilitate pe loturi.</p>
    </div>
);
