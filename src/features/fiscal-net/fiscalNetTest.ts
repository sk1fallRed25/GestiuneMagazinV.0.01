import { 
  toFiscalNetMoney, 
  toFiscalNetQuantity, 
  sanitizeFiscalNetText, 
  formatFiscalNetReceipt, 
  validateReceiptTotals 
} from './fiscalNetFormatter';
import { exportFiscalNetDryRun } from './fiscalNetExportService';
import { parseFiscalNetResponse } from './responseParser';
import { FiscalNetReceiptPayload } from './types';

declare const process: any;

// Simple assert helper
function assertEquals(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message}\nExpected: "${expected}"\nActual:   "${actual}"`);
  }
}

function assertThrows(fn: () => void, expectedMessagePart: string, message: string) {
  try {
    fn();
    throw new Error(`Assertion Failed: Expected function to throw, but it succeeded: ${message}`);
  } catch (err: any) {
    if (!err.message.includes(expectedMessagePart)) {
      throw new Error(`Assertion Failed: Expected error containing "${expectedMessagePart}", but got: "${err.message}": ${message}`);
    }
  }
}

export async function runAllTests() {
  console.log('Starting FiscalNet tests...');

  // 1. Money formatting tests
  console.log('Running money formatting tests...');
  assertEquals(toFiscalNetMoney(10.00), '1000', '10.00 lei should be 1000');
  assertEquals(toFiscalNetMoney(4.50), '450', '4.50 lei should be 450');
  assertEquals(toFiscalNetMoney(0.50), '50', '0.50 lei should be 50');
  assertThrows(() => toFiscalNetMoney(-5.00), 'Sumele negative nu sunt permise', 'Negative money value should throw');

  // 2. Quantity formatting tests
  console.log('Running quantity formatting tests...');
  assertEquals(toFiscalNetQuantity(1.000), '1000', '1 quantity should be 1000');
  assertEquals(toFiscalNetQuantity(2.000), '2000', '2 quantity should be 2000');
  assertEquals(toFiscalNetQuantity(0.500), '500', '0.5 quantity should be 500');
  assertThrows(() => toFiscalNetQuantity(-1.5), 'Cantitățile negative nu sunt permise', 'Negative quantity value should throw');

  // 3. Text sanitization tests
  console.log('Running text sanitization tests...');
  assertEquals(sanitizeFiscalNetText('PRODUS^TEST'), 'PRODUSTEST', 'Should remove ^');
  assertEquals(sanitizeFiscalNetText('PRODUS\nTEST\rNEW'), 'PRODUS TEST NEW', 'Should replace newlines with space');
  assertEquals(sanitizeFiscalNetText('Făină de grâu'), 'Faina de grau', 'Should transliterate diacritics');
  assertEquals(sanitizeFiscalNetText('A   B  C'), 'A B C', 'Should normalize multiple spaces');
  assertEquals(sanitizeFiscalNetText('A'.repeat(50)), 'A'.repeat(36), 'Should truncate to max length');

  // 4. Simple product without SGR
  console.log('Running simple product receipt tests...');
  const payload1: FiscalNetReceiptPayload = {
    saleId: 'SALE-001',
    items: [
      {
        name: 'HELL FOCUS 0.25L',
        unitPrice: 4.50,
        quantity: 1,
        unit: 'buc',
        vatGroup: 'A',
        departmentGroup: 1
      }
    ],
    payments: [
      { method: 'cash', amount: 4.50 }
    ],
    totals: {
      productsTotal: 4.50,
      sgrTotal: 0.00,
      grandTotal: 4.50
    }
  };

  const receipt1 = formatFiscalNetReceipt(payload1);
  const expected1 = 'S^HELL FOCUS 0.25L^450^1000^buc^1^1\r\nP^1^450\r\n';
  assertEquals(receipt1, expected1, 'Simple receipt without SGR formatting');

  // 5. Product with SGR metal
  console.log('Running SGR metal receipt tests...');
  const payload2: FiscalNetReceiptPayload = {
    saleId: 'SALE-002',
    items: [
      {
        name: 'HELL FOCUS 0.25L',
        unitPrice: 4.50,
        quantity: 1,
        unit: 'buc',
        vatGroup: 'A',
        departmentGroup: 1,
        sgr: {
          enabled: true,
          type: 'metal',
          amount: 0.50,
          vatGroup: 'D'
        }
      }
    ],
    payments: [
      { method: 'cash', amount: 5.00 }
    ],
    totals: {
      productsTotal: 4.50,
      sgrTotal: 0.50,
      grandTotal: 5.00
    }
  };

  const receipt2 = formatFiscalNetReceipt(payload2);
  const expected2 = 
    'S^HELL FOCUS 0.25L^450^1000^buc^1^1\r\n' +
    'S^GARANTIE SGR METAL^50^1000^buc^4^1\r\n' +
    'P^1^500\r\n';
  assertEquals(receipt2, expected2, 'Receipt with SGR metal formatting');

  // 6. Product with SGR plastic qty=2
  console.log('Running SGR plastic qty=2 receipt tests...');
  const payload3: FiscalNetReceiptPayload = {
    saleId: 'SALE-003',
    items: [
      {
        name: 'PRODUS TEST',
        unitPrice: 10.00,
        quantity: 2,
        unit: 'buc',
        vatGroup: 'A',
        departmentGroup: 1,
        sgr: {
          enabled: true,
          type: 'plastic',
          amount: 0.50,
          vatGroup: 'D'
        }
      }
    ],
    payments: [
      { method: 'cash', amount: 10.50 },
      { method: 'card', amount: 10.50 }
    ],
    totals: {
      productsTotal: 20.00,
      sgrTotal: 1.00,
      grandTotal: 21.00
    }
  };

  const receipt3 = formatFiscalNetReceipt(payload3);
  const expected3 = 
    'S^PRODUS TEST^1000^2000^buc^1^1\r\n' +
    'S^GARANTIE SGR PLASTIC^50^2000^buc^4^1\r\n' +
    'P^1^1050\r\n' +
    'P^2^1050\r\n';
  assertEquals(receipt3, expected3, 'Receipt with SGR plastic qty=2 mixed payments');

  // 7. Validation: total mismatch
  console.log('Running validation mismatch tests...');
  const badPayload: FiscalNetReceiptPayload = {
    saleId: 'SALE-BAD',
    items: [
      {
        name: 'TEST',
        unitPrice: 10.00,
        quantity: 1,
        vatGroup: 'A'
      }
    ],
    payments: [
      { method: 'cash', amount: 5.00 } // Mismatch! (5.00 difference is > 0.01)
    ],
    totals: {
      productsTotal: 10.00,
      sgrTotal: 0.00,
      grandTotal: 10.00
    }
  };
  assertThrows(() => formatFiscalNetReceipt(badPayload), 'Suma plăților', 'Payments total mismatch should throw');

  // 8. Validation: negative totals and inputs
  console.log('Running negative validation tests...');
  const negativePayload: FiscalNetReceiptPayload = {
    saleId: 'SALE-NEG',
    items: [
      {
        name: 'TEST',
        unitPrice: -10.00, // Negative price!
        quantity: 1,
        vatGroup: 'A'
      }
    ],
    payments: [
      { method: 'cash', amount: -10.00 }
    ],
    totals: {
      productsTotal: -10.00,
      sgrTotal: 0.00,
      grandTotal: -10.00
    }
  };
  assertThrows(() => validateReceiptTotals(negativePayload), 'nu pot fi negative', 'Negative values should throw');

  // 9. Response parser tests
  console.log('Running response parser tests...');
  const successResponseText = 'BONOK=1\r\nNUMARBON=1024\r\n';
  const parsedSuccess = parseFiscalNetResponse(successResponseText);
  assertEquals(parsedSuccess.success, true, 'BONOK=1 should parse as success');
  assertEquals(parsedSuccess.receiptNumber, '1024', 'NumarBon should be parsed');

  const errorResponseText = 'BONOK=0\r\nEROARE=103 - Cota TVA inexistenta la casa de marcat\r\n';
  const parsedError = parseFiscalNetResponse(errorResponseText);
  assertEquals(parsedError.success, false, 'BONOK=0 should parse as error');
  assertEquals(parsedError.errorCode, '103', 'ErrorCode 103 should be parsed');
  assertEquals(parsedError.errorMessage, 'Cota TVA inexistenta la casa de marcat', 'ErrorMessage should be extracted');

  // 10. Dry-run export test
  console.log('Running dry-run export file test...');
  const exportRes = await exportFiscalNetDryRun(payload2);
  console.log('exportRes:', JSON.stringify(exportRes));
  assertEquals(exportRes.success, true, 'Export should succeed');
  console.log(`Generated dry-run file: ${exportRes.filePath}`);

  console.log('[SUCCESS] All FiscalNet TypeScript unit tests passed!');
}

// If run directly by Node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('fiscalNetTest')) {
  runAllTests().catch(err => {
    console.error('[FAIL] Test execution failed:', err);
    process.exit(1);
  });
}
