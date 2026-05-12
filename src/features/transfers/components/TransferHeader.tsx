import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export const TransferHeader: React.FC = () => {
    return (
        <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                    <ArrowRightLeft size={24} />
                </span>
                Transfer Intern de Marfă
            </h1>
            <p className="text-gray-500 mt-2 ml-14 max-w-2xl">
                Gestionează fluxul de produse între depozitul central și rafturile magazinului.
            </p>
        </div>
    );
};
