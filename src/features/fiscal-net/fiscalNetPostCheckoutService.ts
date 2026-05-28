import { getFiscalNetConfig } from './fiscalNetConfigService';
import { salesHistoryService } from '../sales-history/services/salesHistoryService';
import { mapSaleDetailsToFiscalNetPayload } from './salesHistoryToFiscalNet';
import { formatFiscalNetReceipt } from './fiscalNetFormatter';

export interface FiscalNetPostCheckoutResult {
  success: boolean;
  skipped: boolean;
  filename?: string;
  message: string;
  error?: string;
}

/**
 * Automatically triggers file generation and writing for FiscalNet after a successful POS checkout.
 * Only runs in Electron environments and if FiscalNet is enabled and configured with direct writing.
 */
export async function tryWriteFiscalNetAfterCheckout(params: {
  saleId: string;
  storeId?: string | null;
}): Promise<FiscalNetPostCheckoutResult> {
  const { saleId, storeId } = params;
  if (!saleId || !storeId) {
    return {
      success: false,
      skipped: false,
      message: 'ID-ul vânzării sau al magazinului lipsește.'
    };
  }

  // 1. Check if application runs in Electron
  const win = typeof window !== 'undefined' ? (window as any) : null;
  const isElectronAvailable = win && win.electronAPI && win.electronAPI.isElectron === true;
  if (!isElectronAvailable) {
    return {
      success: false,
      skipped: true,
      message: 'Scrierea FiscalNet este disponibilă doar în aplicația desktop.'
    };
  }

  // 2. Read local config
  const config = getFiscalNetConfig();
  if (!config.enabled) {
    return {
      success: false,
      skipped: true,
      message: 'FiscalNet nu este activat pe această stație.'
    };
  }

  if (!config.realWriteEnabled) {
    return {
      success: false,
      skipped: true,
      message: 'Scrierea directă FiscalNet este dezactivată din setările stației.'
    };
  }

  if (!config.bonuriPath.trim() || !config.raspunsPath.trim() || !config.validatedAt) {
    return {
      success: false,
      skipped: true,
      message: 'Folderele FiscalNet nu sunt configurate sau validate pe această stație.'
    };
  }

  try {
    // 3. Load sale details
    const saleDetails = await salesHistoryService.getSaleDetails(storeId, saleId);
    if (!saleDetails) {
      return {
        success: false,
        skipped: false,
        message: 'Nu s-au putut încărca detaliile vânzării.'
      };
    }

    // 4. Map details and format text
    const payload = mapSaleDetailsToFiscalNetPayload(saleDetails);
    const content = formatFiscalNetReceipt(payload);

    // 5. Write file via IPC
    const filename = `${saleId}.txt`;
    const result = await win.electronAPI.writeFiscalNetFile({
      bonuriPath: config.bonuriPath,
      filename,
      content,
      raspunsPath: config.raspunsPath
    });

    if (result.success) {
      return {
        success: true,
        skipped: false,
        filename,
        message: `Bonul fiscal pentru vânzarea ${saleId} a fost trimis către imprimantă.`
      };
    } else {
      return {
        success: false,
        skipped: false,
        message: result.error || 'Eroare la scrierea fișierului FiscalNet.'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      skipped: false,
      message: 'Eroare la procesarea bonului post-checkout.',
      error: err.message || String(err)
    };
  }
}
