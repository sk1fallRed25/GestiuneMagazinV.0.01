// Fișier: services/anafService.js

async function getFirmDetailsANAF(cui) {
    try {
        // 1. URL-ul și Payload-ul
        const anafUrl = "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva";
        const payload = [
            {
                "cui": cui,
                "data": new Date().toISOString().slice(0, 10)
            }
        ];

        // 2. Cererea către ANAF
        const response = await fetch(anafUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Verificăm dacă ANAF a găsit firma
        if (!data.found || data.found.length === 0) {
            throw new Error("CUI-ul nu a fost găsit la ANAF.");
        }

        const infoFirma = data.found[0];

        // 3. Returnăm doar ce ne interesează
        return {
            succes: true,
            date: {
                nume_firma: infoFirma.denumire,
                cui: infoFirma.cui,
                reg_com: infoFirma.nrRegCom,
                adresa: infoFirma.adresa,
                judet: infoFirma.judet, // Am adaugat si judetul, e util
                tva: infoFirma.scpTVA,
                stare_firma: infoFirma.stare_inregistrare
            }
        };

    } catch (error) {
        console.error("Eroare ANAF:", error.message);
        return { succes: false, mesaj: error.message };
    }
}

// Exportăm funcția ca să o folosim în Rute
module.exports = { getFirmDetailsANAF };