import React from 'react';
import { Truck, Upload } from 'lucide-react';

interface ReceptionHeaderProps {
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ReceptionHeader = ({ onFileUpload }: ReceptionHeaderProps) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200"><Truck size={28} /></span>
                Recepție Marfă (v2)
            </h1>
            <p className="text-gray-500 mt-2 ml-1">Înregistrează intrările de marfă și actualizează stocul pe loturi.</p>
        </div>

        <div className="flex gap-3">
            <label className="flex items-center gap-2 bg-slate-800 hover:bg-black text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 cursor-pointer transition active:scale-95">
                <Upload size={20} />
                Importă XML (e-Factura)
                <input
                    type="file"
                    accept=".xml"
                    onChange={onFileUpload}
                    className="hidden"
                />
            </label>
        </div>
    </div>
);
