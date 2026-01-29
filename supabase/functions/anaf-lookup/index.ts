import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { cui } = await req.json()
        if (!cui) throw new Error('CUI lipsă.')

        // 1. Curățăm CUI-ul (doar cifre)
        const cuiNumber = parseInt(cui.toString().replace(/\D/g, ''), 10)
        const today = new Date().toISOString().slice(0, 10)

        // 2. Definim URL-ul (V8 este standardul, dar adăugăm headers de Browser)
        const anafUrl = "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva"

        console.log(`[LOG] Caut CUI: ${cuiNumber} la ANAF...`)

        const anafResponse = await fetch(anafUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // HACK: Ne prefacem că suntem un browser real pentru a evita blocajele ANAF
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify([{ "cui": cuiNumber, "data": today }])
        })

        // 3. Tratăm cazul în care ANAF e "supărat" (Status 404 sau 403)
        if (!anafResponse.ok) {
            console.error(`[ANAF ERROR] Status: ${anafResponse.status} - ${anafResponse.statusText}`)
            // Dacă e 404, e posibil să fie o problemă temporară de mentenanță ANAF
            throw new Error(`Serverul ANAF a răspuns cu eroare: ${anafResponse.status} ${anafResponse.statusText}. Încearcă din nou mai târziu.`)
        }

        const data = await anafResponse.json()

        // Verificăm dacă a găsit firma
        if (!data.found || data.found.length === 0) {
            return new Response(
                JSON.stringify({ error: 'CUI-ul este valid, dar nu figurează în baza de date ANAF (sau e radiat).' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        const info = data.found[0]

        // 4. Returnăm datele
        return new Response(
            JSON.stringify({
                nume_firma: info.denumire,
                cui: info.cui,
                adresa: info.adresa,
                termen_plata: 30 // Default
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})