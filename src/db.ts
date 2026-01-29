import Dexie, { Table } from 'dexie';

// Definim interfețele pentru datele locale
export interface LocalProduct {
    id: number;
    nume: string;
    cod_bare: string;
    pret_vanzare_fara_tva: number; // MODIFICAT
    tva_procent: number; // NOU
    stoc_magazin: number;
    unitate_masura: string;
}

export interface LocalBon {
    id?: number; // ID local auto-generat
    data: string;
    total: number;
    items: any[];
    synced: number; // 0 = Nesincronizat (Offline), 1 = Sincronizat (Online)
}

class MagazinDatabase extends Dexie {
    products!: Table<LocalProduct>;
    bonuri!: Table<LocalBon>;

    constructor() {
        super('MagazinLocalDB');

        // Definim schema (doar coloanele pe care facem căutări)
        this.version(3).stores({
            products: 'id, nume, cod_bare, stoc_magazin',
            bonuri: '++id, synced'
        });
        
        this.version(2).stores({
            products: 'id, nume, cod_bare, stoc_magazin',
            bonuri: '++id, synced'
        }).upgrade(tx => {
            // Funcție de upgrade goală, dar necesară pentru a permite Dexie să reconstruiască schema
        });

        this.version(1).stores({
            products: 'id, nume, cod_bare',
            bonuri: '++id, synced'
        });
    }
}

export const db = new MagazinDatabase();