import { SaleItemDetails } from '../types';

export function formatSgrReceiptLabel(type?: string | null): string {
    if (!type) return 'SGR necunoscut';
    const normalized = type.trim().toLowerCase();
    switch (normalized) {
        case 'plastic':
            return 'SGR - PLASTIC';
        case 'metal':
            return 'SGR - METAL';
        case 'glass':
            return 'SGR - STICLĂ';
        default:
            return 'SGR necunoscut';
    }
}

export function hasSgrSnapshot(item: SaleItemDetails): boolean {
    return !!item.sgrEnabled;
}

export function getSgrLineAmount(item: SaleItemDetails): number {
    if (!item.sgrEnabled) return 0;
    const qty = item.quantity ?? 0;
    const deposit = item.sgrDepositAmount ?? 0.50;
    const total = item.sgrTotalAmount ?? (qty * deposit);
    return Number(total.toFixed(2));
}

export function summarizeSgr(items: SaleItemDetails[]) {
    let total = 0;
    let count = 0;
    const byType: Record<string, { quantity: number; total: number }> = {};

    items.forEach((item) => {
        if (!item.sgrEnabled) return;
        const lineTotal = getSgrLineAmount(item);
        const qty = item.quantity ?? 0;
        
        total += lineTotal;
        count += qty;

        const typeKey = item.sgrType || 'unknown';
        if (!byType[typeKey]) {
            byType[typeKey] = { quantity: 0, total: 0 };
        }
        byType[typeKey].quantity += qty;
        byType[typeKey].total = Number((byType[typeKey].total + lineTotal).toFixed(2));
    });

    return {
        total: Number(total.toFixed(2)),
        count,
        byType
    };
}
