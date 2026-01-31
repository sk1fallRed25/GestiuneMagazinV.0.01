export interface Produs {
    id: number;
    nume: string;
    stoc_depozit: number;
    stoc_minim_depozit: number;
    prag_optim: number;
    tva_procent: number;
    unitate_masura: string;
}

export interface AgentProfil {
    id: number;
    nume: string;
    furnizor_id: number | null;
    email: string;
}