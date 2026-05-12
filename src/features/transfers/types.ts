export interface TransferProduct {
    id: number;
    nume: string;
    stoc_depozit: number;
    stoc_magazin: number;
    cod_bare: string;
}

export type TransferDirection = 'depozit_spre_magazin' | 'magazin_spre_depozit';

export interface CreateTransferPayload {
    produs_id: number;
    cantitate: number;
    directie: TransferDirection;
    nou_stoc_depozit: number;
    nou_stoc_magazin: number;
}
