import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const LossesHeader: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate(-1)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
                <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
                <h1 className="text-3xl font-black text-gray-800 tracking-tight">Raportare Pierderi</h1>
                <p className="text-gray-500 text-sm">Gestionarea ieșirilor neconforme din gestiune.</p>
            </div>
        </div>
    );
};
