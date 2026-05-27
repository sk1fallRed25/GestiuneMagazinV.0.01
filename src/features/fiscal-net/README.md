# FiscalNet File Bridge dry-run export

This module contains the logic for interacting with the **FiscalNet** application via file bridge commands. 

## Features
- **Strict Types**: Defined in `types.ts` for items, SGR, payments, and payload.
- **VAT and Payment Mappings**: Mapping configuration templates in `fiscalNetMappings.ts`.
- **Pure Formatter**: `fiscalNetFormatter.ts` implements Caret-separated string formatting for items (`S`), payments (`P`), fiscal codes (`CF`), and notes (`TL`).
- **Totals Validation**: Checks math integrity to ensure no mismatch is sent.
- **Dynamic File Export**: Atomically writes `.tmp` then renames to `.txt` inside the local dry-run folder (`artifacts/fiscalnet/bonuri`) using safe runtime checks.
- **Response Parser**: Handles `BONOK` result file evaluation.

## Dry-run testing
When importing this module in browser-side code, it safe-guards against local filesystem access. When run inside Node.js scripts (such as during test execution), it dynamically executes using Node's `fs` to generate test files under `artifacts/fiscalnet/bonuri`.
