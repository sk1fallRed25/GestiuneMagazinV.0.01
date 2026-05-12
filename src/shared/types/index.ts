// src/types/index.ts

export interface User {
    id: number;
    email: string;
    nume: string;
    rol: 'administrator' | 'vanzator' | 'gestionar' | 'distribuitor';
    data_inregistrare: string;
    pin?: string; // Câmpul pentru logare rapidă
}

export interface Product {
    id: number;
    nume: string;
    pret: number;
    stoc: number;
    prag_minim: number;
    prag_optim: number;
    categorie?: string;
    cod_bare?: string; // <--- AICI este noul câmp pentru Scanner
}