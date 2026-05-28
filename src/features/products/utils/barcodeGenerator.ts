/**
 * barcodeGenerator.ts
 * Generare coduri de bare interne EAN-13 pentru produse fără cod de bare real.
 *
 * Format intern: prefix `29` + 10 cifre de payload + 1 check digit EAN-13
 * Total: 13 cifre
 *
 * Prefixul `29` este rezervat internațional pentru coduri interne/proprietare
 * (GS1 "restricted circulation" prefix) — nu intră în conflict cu produse comerciale.
 *
 * Algoritmul EAN-13 check digit:
 *   - Suma cifrelor: pozițiile impare (1,3,5...) × 1, pozițiile pare (2,4,6...) × 3
 *   - checkDigit = (10 - (sum % 10)) % 10
 */

/** Prefixul intern implicit pentru coduri generate de aplicație */
export const INTERNAL_BARCODE_PREFIX = '29';

/**
 * Calculează check digit-ul EAN-13 pentru un șir de 12 cifre.
 * @param base12 Primele 12 cifre ale codului EAN-13
 * @returns Cifra de control (0-9) ca string
 */
export function calculateEan13CheckDigit(base12: string): string {
    if (!/^\d{12}$/.test(base12)) {
        throw new Error(`EAN-13: baza trebuie să aibă exact 12 cifre numerice. Primit: "${base12}"`);
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(base12[i], 10);
        // Pozițiile sunt 1-indexed: impare × 1, pare × 3
        sum += i % 2 === 0 ? digit : digit * 3;
    }

    return String((10 - (sum % 10)) % 10);
}

/**
 * Verifică dacă un șir este un EAN-13 valid (13 cifre, check digit corect).
 */
export function isValidEan13(code: string): boolean {
    if (!/^\d{13}$/.test(code)) return false;
    const base12 = code.slice(0, 12);
    const checkDigit = code[12];
    try {
        return calculateEan13CheckDigit(base12) === checkDigit;
    } catch {
        return false;
    }
}

/**
 * Verifică dacă un cod de bare are prefixul intern (cod generat de aplicație).
 */
export function isInternalBarcode(code: string): boolean {
    return code.startsWith(INTERNAL_BARCODE_PREFIX) && isValidEan13(code);
}

/**
 * Generează un cod de bare intern EAN-13 unic.
 *
 * Strategie pentru unicitate fără sequence DB:
 * - Prefix: `29` (2 cifre)
 * - Timestamp milisecunde (13 cifre) → luăm ultimele 8 cifre
 * - Random 2 cifre (0-99)
 * - Total bază: 2 + 8 + 2 = 12 cifre → + 1 check digit = 13
 *
 * @param options.prefix Prefix numeric (default '29')
 * @param options.sequence Număr de secvență opțional (pentru variante controlate)
 * @param options.storeShortCode Cod scurt magazin (ignorat în MVP, documentat)
 */
export function generateInternalBarcode(options?: {
    prefix?: string;
    sequence?: number;
    storeShortCode?: string;
}): string {
    const prefix = options?.prefix ?? INTERNAL_BARCODE_PREFIX;

    if (!/^\d+$/.test(prefix)) {
        throw new Error(`Prefixul trebuie să fie numeric. Primit: "${prefix}"`);
    }
    if (prefix.length > 4) {
        throw new Error('Prefixul nu poate depăși 4 cifre pentru format EAN-13.');
    }

    let base12: string;

    if (options?.sequence !== undefined) {
        // Mod sequence: prefix + sequenceFill (zero-padded) + random 2
        const seqStr = String(options.sequence % 100_000_000).padStart(8, '0'); // 8 cifre
        const rand2 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        base12 = `${prefix}${seqStr}${rand2}`;
    } else {
        // Mod timestamp+random (default MVP)
        const tsStr = String(Date.now()).slice(-8); // ultimele 8 cifre din ms timestamp
        const rand2 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        base12 = `${prefix}${tsStr}${rand2}`;
    }

    // Asigurăm că base12 are exact 12 cifre
    if (base12.length !== 12) {
        // Trunchiem sau padding la 12
        base12 = base12.padStart(12, '0').slice(-12);
    }

    const checkDigit = calculateEan13CheckDigit(base12);
    const code = base12 + checkDigit;

    // Validare finală
    if (!isValidEan13(code)) {
        throw new Error(`BUG: codul generat "${code}" nu este EAN-13 valid.`);
    }

    return code;
}

/**
 * Generează un cod de bare intern cu retry în cazul conflictului.
 * Utilitar pur — verificarea efectivă a unicității se face în serviciu
 * (barcodeExists) pentru a evita coupling cu Supabase în acest modul.
 */
export function generateInternalBarcodeCandidate(attempt: number = 0): string {
    // La fiecare retry adăugăm un mic offset la timestamp pentru diversitate
    const tsOffset = attempt * 17; // număr prim pentru diversitate maximă
    const tsStr = String(Date.now() + tsOffset).slice(-8);
    const rand2 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    const base12 = `${INTERNAL_BARCODE_PREFIX}${tsStr}${rand2}`;
    const base12Fixed = base12.padStart(12, '0').slice(-12);
    const checkDigit = calculateEan13CheckDigit(base12Fixed);
    return base12Fixed + checkDigit;
}
