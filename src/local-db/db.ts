import Dexie, { Table } from 'dexie';

// Interfața pentru produse (Local)
// Este important să coincidă cu structura din Supabase pentru a face "bulkPut" ușor
export interface LocalProduct {
    id: number;
    nume: string;
    cod_bare: string;
    pret_vanzare: number; // Prețul cu TVA inclus (Preț la raft)
    tva_procent: number;
    stoc_depozit: number; // Opțional, pentru referință
    stoc_magazin: number; // Vital pentru POS
    unitate_masura: string;
}

// Interfața pentru Bonuri (Local -> Sync -> Supabase)
export interface LocalBon {
    id?: number; // ID auto-generat de IndexedDB
    data: string;
    total: number;
    items: CartItem[]; // Detaliile bonului
    synced: number; // 0 = Nesincronizat (Offline), 1 = Sincronizat (Online)
}

// Interfața ajutătoare pentru itemele din bon
export interface CartItem {
    id: number;
    nume: string;
    pret: number;
    cantitate: number;
    tva: number;
    subtotal: number;
}

class MagazinDatabase extends Dexie {
    products!: Table<LocalProduct>;
    bonuri!: Table<LocalBon>;

    constructor() {
        super('MagazinLocalDB');

        // VERSIONARE SCHEMA
        // Dacă modifici structura tabelelor, trebuie să crești versiunea (ex: 4, 5...)
        // Dexie se ocupă automat de upgrade.

        this.version(4).stores({
            // Indexăm doar câmpurile pe care facem căutări frecvente
            products: 'id, nume, cod_bare, stoc_magazin',
            bonuri: '++id, synced, data'
        });
    }
}

export const db = new MagazinDatabase();