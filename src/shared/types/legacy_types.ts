export interface User {
    id: number;
    nume: string;
    email: string;
    rol: 'administrator' | 'casier' | 'agent' | 'gestionar';
    aprobat: boolean;
}