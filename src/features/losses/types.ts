import { UserRole } from '../auth/types';

export interface LossProduct {
    id: number;
    nume: string;
    cod_bare: string;
    stoc_depozit: number;
    stoc_magazin: number;
}

export type LossStockSource = 'Raft' | 'Depozit' | 'Mixt (Raft + Depozit)';

export interface CreateLossPayload {
    produs_id: number;
    user_id: string;
    cantitate: number;
    motiv: string;
    sursa_stoc: LossStockSource;
    new_stoc_magazin: number;
    new_stoc_depozit: number;
}

export interface LossLocationState {
    preSelectedId?: number;
}
