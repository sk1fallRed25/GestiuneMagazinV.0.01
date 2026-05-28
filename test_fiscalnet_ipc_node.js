import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("=== STARTING NODE IPC SECURITY TESTS ===");

// 1. Read electron-main.js and transform it to be runnable in Node VM
const mainFileContent = fs.readFileSync(path.join(__dirname, 'electron-main.js'), 'utf8');

// Replace imports with mock constructs
const transformedCode = mainFileContent
    .replace(/import\s+\{\s*app,\s*BrowserWindow,\s*ipcMain\s*\}\s*from\s*'electron';/, `
        const ipcHandlers = {};
        const ipcMain = {
            handle: (channel, handler) => {
                ipcHandlers[channel] = handler;
            }
        };
        const app = {
            whenReady: () => ({ then: () => {} }),
            on: () => {}
        };
        class BrowserWindow {}
    `)
    .replace(/import\s+path\s+from\s+'path';/, "const path = require('path');")
    .replace(/import\s+\{\s*fileURLToPath\s*\}\s*from\s*'url';/, "const { fileURLToPath } = require('url');")
    .replace(/import\s+fs\s+from\s+'fs';/, "const fs = require('fs');")
    .replace(/const\s+__dirname\s+=\s+path\.dirname\(fileURLToPath\(import\.meta\.url\)\);/, "const __dirname = '.';");

// Run transformed code in VM context to extract functions
const contextObject = {
    require: (name) => {
        if (name === 'path') return path;
        if (name === 'fs') return fs;
        if (name === 'url') return { fileURLToPath };
        throw new Error('Unsupported import in mock: ' + name);
    },
    process: process,
    console: console,
    ipcHandlers: null,
    isSafeTxtFilename: null,
    assertDirectoryExists: null,
    resolveInside: null,
    serializeError: null
};

const script = new vm.Script(transformedCode + `
    globalThis.ipcHandlers = ipcHandlers;
    globalThis.isSafeTxtFilename = isSafeTxtFilename;
    globalThis.assertDirectoryExists = assertDirectoryExists;
    globalThis.resolveInside = resolveInside;
    globalThis.serializeError = serializeError;
`);

script.runInNewContext(contextObject);

const helpers = {
    isSafeTxtFilename: contextObject.isSafeTxtFilename,
    assertDirectoryExists: contextObject.assertDirectoryExists,
    resolveInside: contextObject.resolveInside,
    serializeError: contextObject.serializeError,
    ipcHandlers: contextObject.ipcHandlers
};

// Assert we successfully extracted the helpers
if (!helpers.isSafeTxtFilename || !helpers.assertDirectoryExists || !helpers.resolveInside || !helpers.serializeError) {
    console.error("[FAIL] Failed to extract security helpers from electron-main.js");
    process.exit(1);
}
console.log("[PASS] Security helper functions successfully extracted.");

// Setup temp test folder
const testDir = path.join(__dirname, 'scratch', 'ipc-test-sandbox');
if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

const testBonuri = path.join(testDir, 'Bonuri');
const testRaspuns = path.join(testDir, 'Raspuns');
fs.mkdirSync(testBonuri);
fs.mkdirSync(testRaspuns);

// Helper to assert throws
function assertThrows(fn, expectedMsg) {
    try {
        fn();
        throw new Error("Expected function to throw, but it did not.");
    } catch (e) {
        if (expectedMsg && !e.message.includes(expectedMsg)) {
            throw new Error(`Expected error message to contain "${expectedMsg}", but got "${e.message}"`);
        }
    }
}

// 2. Unit tests for helpers
try {
    // isSafeTxtFilename
    console.log("Testing isSafeTxtFilename...");
    if (helpers.isSafeTxtFilename('valid.txt') !== true) throw new Error();
    if (helpers.isSafeTxtFilename('818cb4af-dccf-4afa-a148-5317819dd482.txt') !== true) throw new Error();
    if (helpers.isSafeTxtFilename('valid.tmp') !== false) throw new Error();
    if (helpers.isSafeTxtFilename('../invalid.txt') !== false) throw new Error();
    if (helpers.isSafeTxtFilename('sub/dir.txt') !== false) throw new Error();
    if (helpers.isSafeTxtFilename('sub\\dir.txt') !== false) throw new Error();
    if (helpers.isSafeTxtFilename('valid:name.txt') !== false) throw new Error();
    if (helpers.isSafeTxtFilename('valid\x00name.txt') !== false) throw new Error(); // control char
    console.log("[PASS] isSafeTxtFilename passed all validation cases.");

    // assertDirectoryExists
    console.log("Testing assertDirectoryExists...");
    helpers.assertDirectoryExists(testBonuri, 'Bonuri'); // should pass
    assertThrows(() => helpers.assertDirectoryExists(path.join(testDir, 'non_existent'), 'Bonuri'), 'Folderul Bonuri nu exista sau nu este director');
    
    // create a file to test it throws if path is a file
    const tempFile = path.join(testDir, 'dummy.txt');
    fs.writeFileSync(tempFile, 'dummy');
    assertThrows(() => helpers.assertDirectoryExists(tempFile, 'Bonuri'), 'Folderul Bonuri nu exista sau nu este director');
    console.log("[PASS] assertDirectoryExists validated directories correctly.");

    // resolveInside
    console.log("Testing resolveInside...");
    const safeResolved = helpers.resolveInside(testBonuri, 'receipt.txt');
    if (safeResolved !== path.resolve(testBonuri, 'receipt.txt')) throw new Error();
    
    assertThrows(() => helpers.resolveInside(testBonuri, '../outside.txt'), 'Securitate: fisierul rezultat iese din folderul configurat.');
    assertThrows(() => helpers.resolveInside(testBonuri, '../../outside.txt'), 'Securitate: fisierul rezultat iese din folderul configurat.');
    
    // Test suffix prefix safety (e.g. C:\Test and C:\Test-other)
    const testBonuriOther = testBonuri + '-other';
    // mock a path.resolve prefix check
    assertThrows(() => {
        // simulate attempting to resolve to testBonuriOther from testBonuri
        const relativeToOther = path.relative(testBonuri, path.join(testBonuriOther, 'file.txt'));
        helpers.resolveInside(testBonuri, relativeToOther);
    }, 'Securitate: fisierul rezultat iese din folderul configurat.');
    console.log("[PASS] resolveInside blocked path traversal and prefix exploits.");

    // serializeError
    console.log("Testing serializeError...");
    if (helpers.serializeError(new Error('Test message')) !== 'Test message') throw new Error();
    if (helpers.serializeError('String error') !== 'String error') throw new Error();
    console.log("[PASS] serializeError formatted errors correctly.");

} catch (err) {
    console.error("[FAIL] Helpers unit tests failed:", err);
    process.exit(1);
}

// 3. Integration tests for IPC handlers
const writeHandler = helpers.ipcHandlers['write-fiscal-net-file'];
const readHandler = helpers.ipcHandlers['read-fiscal-net-response'];

if (!writeHandler || !readHandler) {
    console.error("[FAIL] IPC Handlers not found in electron-main.js");
    process.exit(1);
}

async function runIpcTests() {
    try {
        console.log("Testing write-fiscal-net-file IPC Handler...");

        // Case A: Safe write
        const resA = await writeHandler(null, {
            bonuriPath: testBonuri,
            filename: 'sale1.txt',
            content: 'TESTCONTENT',
            raspunsPath: testRaspuns
        });
        if (!resA.success || !fs.existsSync(resA.filePath)) {
            throw new Error("Safe write failed: " + JSON.stringify(resA));
        }
        if (fs.readFileSync(resA.filePath, 'utf8') !== 'TESTCONTENT') {
            throw new Error("Content mismatch.");
        }
        console.log("[PASS] Standard safe write test passed.");

        // Case B: Duplicate block (.txt already exists)
        const resB = await writeHandler(null, {
            bonuriPath: testBonuri,
            filename: 'sale1.txt',
            content: 'NEWCONTENT',
            raspunsPath: testRaspuns
        });
        if (resB.success || !resB.error.includes("exista deja")) {
            throw new Error("Allowed duplicate write incorrectly: " + JSON.stringify(resB));
        }
        console.log("[PASS] Duplicate prevention (bonuriPath) test passed.");

        // Case C: Duplicate block (response already exists in raspunsPath)
        // create mock response first
        fs.writeFileSync(path.join(testRaspuns, 'sale2.txt'), 'RESPONSE');
        const resC = await writeHandler(null, {
            bonuriPath: testBonuri,
            filename: 'sale2.txt',
            content: 'CONTENT',
            raspunsPath: testRaspuns
        });
        if (resC.success || !resC.error.includes("Există deja răspuns pentru această vânzare")) {
            throw new Error("Allowed write when response exists incorrectly: " + JSON.stringify(resC));
        }
        console.log("[PASS] Duplicate prevention (raspunsPath) test passed.");

        // Case D: Path traversal blocking in write
        const resD = await writeHandler(null, {
            bonuriPath: testBonuri,
            filename: '../traversal.txt',
            content: 'TRAVERSAL',
            raspunsPath: testRaspuns
        });
        if (resD.success || !resD.error.includes("Securitate")) {
            throw new Error("Allowed path traversal in write: " + JSON.stringify(resD));
        }
        console.log("[PASS] Path traversal in write blocked successfully.");

        // Case E: Existing .tmp file block
        // create a .tmp file beforehand
        fs.writeFileSync(path.join(testBonuri, 'sale_tmp.tmp'), 'OLDTMP');
        const resE = await writeHandler(null, {
            bonuriPath: testBonuri,
            filename: 'sale_tmp.txt',
            content: 'NEWCONTENT',
            raspunsPath: testRaspuns
        });
        if (resE.success || !resE.error.includes("Există deja un fișier temporar")) {
            throw new Error("Failed to block when .tmp exists: " + JSON.stringify(resE));
        }
        console.log("[PASS] Existing .tmp block test passed.");

        // Case F: Atomic writing: rename failure cleanup
        // We will trigger a rename failure by mocking fs.renameSync temporarily
        const originalRename = fs.renameSync;
        fs.renameSync = () => {
            throw new Error("Mock rename error");
        };
        
        const resF = await writeHandler(null, {
            bonuriPath: testBonuri,
            filename: 'sale_atomic.txt',
            content: 'ATOMICCONTENT',
            raspunsPath: testRaspuns
        });

        // restore rename
        fs.renameSync = originalRename;

        if (resF.success || !resF.error.includes("Mock rename error")) {
            throw new Error("Rename error was not caught and serialized: " + JSON.stringify(resF));
        }
        
        // Assert that the .tmp file was deleted and not left behind
        if (fs.existsSync(path.join(testBonuri, 'sale_atomic.tmp'))) {
            throw new Error("Temporary file was not cleaned up after rename failure!");
        }
        if (fs.existsSync(path.join(testBonuri, 'sale_atomic.txt'))) {
            throw new Error("Target file was incorrectly created!");
        }
        console.log("[PASS] Atomic write failure cleanup test passed.");

        console.log("Testing read-fiscal-net-response IPC Handler...");

        // Case G: Safe read
        fs.writeFileSync(path.join(testRaspuns, 'response1.txt'), 'OK=1');
        const resG = await readHandler(null, {
            raspunsPath: testRaspuns,
            filename: 'response1.txt'
        });
        if (!resG.success || resG.content !== 'OK=1') {
            throw new Error("Failed to read response: " + JSON.stringify(resG));
        }
        console.log("[PASS] Standard safe read test passed.");

        // Case H: File size limit check (> 64 KB)
        const largeContent = 'a'.repeat(64 * 1024 + 1);
        fs.writeFileSync(path.join(testRaspuns, 'response_large.txt'), largeContent);
        const resH = await readHandler(null, {
            raspunsPath: testRaspuns,
            filename: 'response_large.txt'
        });
        if (resH.success || !resH.error.includes("prea mare")) {
            throw new Error("Allowed reading of large response: " + JSON.stringify(resH));
        }
        console.log("[PASS] Response file size limit test passed.");

        // Case I: Path traversal in read
        const resI = await readHandler(null, {
            raspunsPath: testRaspuns,
            filename: '../traversal_read.txt'
        });
        if (resI.success || !resI.error.includes("Securitate")) {
            throw new Error("Allowed path traversal in read: " + JSON.stringify(resI));
        }
        console.log("[PASS] Path traversal in read blocked successfully.");

    } catch (err) {
        console.error("[FAIL] IPC handler integration tests failed:", err);
        process.exit(1);
    }
}

await runIpcTests();

console.log("=== ALL NODE IPC SECURITY TESTS PASSED ===");
process.exit(0);
