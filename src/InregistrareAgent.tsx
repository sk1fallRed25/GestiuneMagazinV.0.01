import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import { Link } from 'react-router-dom'

export default function InregistrareAgent() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const [formData, setFormData] = useState({
        nume_firma: '',
        cui: '',
        adresa: '',
        termen_plata: 30,
        nume_agent: '',
        telefon_agent: '',
        email: '',    // Câmp nou
        parola: ''    // Câmp nou
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Verificăm dacă emailul există deja
            const { data: existent } = await supabase.from('agenti').select('id').eq('email', formData.email).single()
            if (existent) throw new Error("Acest email este deja folosit de un alt agent!")

            const { error } = await supabase.from('cereri_furnizori').insert([{
                ...formData,
                status: 'pending'
            }])

            if (error) throw error
            setSuccess(true)
        } catch (err: any) {
            alert("Eroare: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
                    <h2 className="text-2xl font-bold text-gray-800">Cont Creat!</h2>
                    <p className="text-gray-600 mt-2">Cererea a fost trimisă. Vei putea folosi adresa de email și parola pentru a te conecta DUPĂ ce ești acceptat de administrator.</p>
                    <Link to="/" className="block mt-6 text-blue-600 hover:underline">Înapoi la Login</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

                {/* Partea Stângă */}
                <div className="bg-gray-50 p-8 md:w-1/3 flex flex-col justify-center border-r border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Devino Partener</h3>
                    <p className="text-sm text-gray-500 mb-6">Creează-ți un cont de agent pentru a gestiona comenzile.</p>
                </div>

                {/* Partea Dreaptă */}
                <div className="p-8 md:w-2/3">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Date Înregistrare</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Date Firmă</label>
                            <input type="text" placeholder="Nume Firmă" required className="w-full border-b-2 py-2 outline-none focus:border-blue-500 transition" value={formData.nume_firma} onChange={e => setFormData({...formData, nume_firma: e.target.value})} />
                            <div className="flex gap-4">
                                <input type="text" placeholder="CUI" required className="w-1/2 border-b-2 py-2 outline-none focus:border-blue-500" value={formData.cui} onChange={e => setFormData({...formData, cui: e.target.value})} />
                                <input type="number" placeholder="Termen plată" required className="w-1/2 border-b-2 py-2 outline-none focus:border-blue-500" value={formData.termen_plata} onChange={e => setFormData({...formData, termen_plata: parseInt(e.target.value) || 0})} />
                            </div>
                            <input type="text" placeholder="Adresă Sediu" required className="w-full border-b-2 py-2 outline-none focus:border-blue-500" value={formData.adresa} onChange={e => setFormData({...formData, adresa: e.target.value})} />
                        </div>

                        <div className="space-y-3 pt-4">
                            <label className="text-xs font-bold text-purple-600 uppercase tracking-wider">Datele Tale (Login)</label>
                            <div className="flex gap-4">
                                <input type="text" placeholder="Nume Agent" required className="w-1/2 border-b-2 py-2 outline-none focus:border-purple-500" value={formData.nume_agent} onChange={e => setFormData({...formData, nume_agent: e.target.value})} />
                                <input type="text" placeholder="Telefon" required className="w-1/2 border-b-2 py-2 outline-none focus:border-purple-500" value={formData.telefon_agent} onChange={e => setFormData({...formData, telefon_agent: e.target.value})} />
                            </div>
                            {/* CÂMPURI NOI */}
                            <input type="email" placeholder="Email (pentru login)" required className="w-full border-b-2 py-2 outline-none focus:border-purple-500 font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            <input type="password" placeholder="Parolă" required className="w-full border-b-2 py-2 outline-none focus:border-purple-500 font-bold" value={formData.parola} onChange={e => setFormData({...formData, parola: e.target.value})} />
                        </div>

                        <button type="submit" disabled={loading} className="w-full mt-6 bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition">
                            {loading ? 'Se trimite...' : 'Creează Cont ➔'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}