import { formatFiscalNetReceipt } from './fiscalNetFormatter';
import { FiscalNetReceiptPayload } from './types';

declare const require: any;
declare const process: any;

export interface ExportResult {
  success: boolean;
  content: string;
  filePath?: string;
  error?: string;
}

/**
 * Dry-run export service.
 * Generates the FiscalNet receipt file structure.
 * 
 * Note: Since the frontend runs in a sandboxed browser environment (or Electron with context isolation),
 * it cannot write directly to the local filesystem (e.g. C:\FiscalNet\Bonuri).
 * The actual production integration will require a local bridge (e.g. a microservice, 
 * an Electron IPC handler, or a Node backend) to write the file.
 * 
 * In Node.js environment (e.g. when running automated tests), it will try to write
 * the dry-run receipt to the artifacts directory.
 */
export async function exportFiscalNetDryRun(payload: FiscalNetReceiptPayload): Promise<ExportResult> {
  try {
    const content = formatFiscalNetReceipt(payload);

    // If we are in a Node environment (such as during tests or Node-based tooling),
    // we try to write the file to the local directory: artifacts/fiscalnet/bonuri
    if (typeof window === 'undefined') {
      try {
        // Use a dynamic variable reference to bypass Vite static analysis for Node.js modules
        const req = typeof require !== 'undefined' ? require : undefined;
        if (!req) {
          throw new Error('require is not defined in this environment');
        }
        const fs = req('fs');
        const path = req('path');

        const baseDir = path.join(process.cwd(), 'artifacts', 'fiscalnet', 'bonuri');
        
        // Ensure directory exists
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }

        const tempFilePath = path.join(baseDir, `${payload.saleId}.tmp`);
        const finalFilePath = path.join(baseDir, `${payload.saleId}.txt`);

        // Write atomically: write to .tmp then rename to .txt
        fs.writeFileSync(tempFilePath, content, 'utf8');
        fs.renameSync(tempFilePath, finalFilePath);

        return {
          success: true,
          content,
          filePath: finalFilePath
        };
      } catch (nodeErr: any) {
        return {
          success: true, // We still generated the content successfully
          content,
          error: `Node filesystem write failed: ${nodeErr.message}`
        };
      }
    }

    // Browser environment: return content so UI can display it / download it
    return {
      success: true,
      content
    };
  } catch (err: any) {
    return {
      success: false,
      content: '',
      error: err.message || String(err)
    };
  }
}

/**
 * Initiates a browser download of a text file with the generated FiscalNet receipt content.
 * Bypasses filesystem access restrictions by utilizing Blobs and client-side download links.
 */
export function downloadFiscalNetReceiptFile(filename: string, content: string): void {
  // Use Blob with UTF-8 encoding
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
