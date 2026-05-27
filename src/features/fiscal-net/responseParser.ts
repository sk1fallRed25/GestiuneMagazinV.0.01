export interface FiscalNetResponse {
  success: boolean;
  receiptNumber?: string;
  errorCode?: string;
  errorMessage?: string;
  rawLines: string[];
}

/**
 * Parses the content of a response file returned by FiscalNet in the "Raspuns" directory.
 * 
 * Typically, FiscalNet outputs:
 * - Line 1: BONOK=1 (or BONOK=0)
 * - Line 2: NumarBon=1234 (if successful) OR EROARE=code - message (if failed)
 * 
 * Example Success:
 *   BONOK=1
 *   NUMARBON=42
 * 
 * Example Error:
 *   BONOK=0
 *   EROARE=103 - Cota TVA inexistenta la casa de marcat
 */
export function parseFiscalNetResponse(text: string): FiscalNetResponse {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const result: FiscalNetResponse = {
    success: false,
    rawLines: lines
  };

  if (lines.length === 0) {
    result.errorMessage = 'Fisierul de raspuns este gol.';
    return result;
  }

  // Parse lines to key-value pairs
  const map: Record<string, string> = {};
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim().toUpperCase();
      const val = parts.slice(1).join('=').trim();
      map[key] = val;
    }
  }

  // Check BONOK status
  if (map['BONOK'] === '1') {
    result.success = true;
    // Extract receipt number
    result.receiptNumber = map['NUMARBON'] || map['NRBON'] || undefined;
    if (!result.receiptNumber) {
      // Fallback: look for a line that is a pure integer
      const pureIntLine = lines.find(l => /^\d+$/.test(l));
      if (pureIntLine) {
        result.receiptNumber = pureIntLine;
      }
    }
  } else if (map['BONOK'] === '0') {
    result.success = false;
    let errorMsg = map['EROARE'] || map['ERROR'] || '';
    
    if (!errorMsg) {
      // Fallback: extract from other lines if no key=val EROARE line exists
      const otherLines = lines.filter(l => !l.toUpperCase().startsWith('BONOK'));
      if (otherLines.length > 0) {
        const firstOther = otherLines[0];
        if (otherLines.length > 1) {
          result.errorCode = firstOther;
          result.errorMessage = otherLines.slice(1).join(' ');
        } else {
          // If only 1 line, see if it starts with an alphanumeric code
          const match = firstOther.match(/^([A-Za-z0-9]+)\s+([A-Za-z0-9].*)$/);
          if (match) {
            result.errorCode = match[1];
            result.errorMessage = match[2];
          } else {
            result.errorMessage = firstOther;
          }
        }
      } else {
        result.errorMessage = 'Eroare necunoscuta raportata de FiscalNet.';
      }
    } else {
      // Parse error code if present in the EROARE string (e.g. "103 - Message")
      const match = errorMsg.match(/^([A-Za-z0-9]+)\s*[-:]\s*(.*)$/);
      if (match) {
        result.errorCode = match[1];
        result.errorMessage = match[2];
      } else {
        result.errorMessage = errorMsg;
      }
    }
  } else {
    // If BONOK is missing, fallback to generic parsing of error/success indicators
    if (map['EROARE'] || map['ERROR']) {
      result.success = false;
      result.errorMessage = map['EROARE'] || map['ERROR'];
    } else if (map['NUMARBON'] || map['NRBON']) {
      result.success = true;
      result.receiptNumber = map['NUMARBON'] || map['NRBON'];
    } else {
      result.errorMessage = 'Format raspuns invalid (lipseste BONOK).';
    }
  }

  return result;
}
