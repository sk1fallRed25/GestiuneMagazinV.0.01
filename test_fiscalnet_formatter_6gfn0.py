import os
import subprocess
import sys
import shutil

def run_test():
    print("=== STARTING FISCALNET FORMATTER TESTS ===")

    # 1. Setup paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    scratch_dir = os.path.join(base_dir, "scratch", "test-build")
    artifacts_bonuri = os.path.join(base_dir, "artifacts", "fiscalnet", "bonuri")

    # Clean up previous builds/artifacts
    if os.path.exists(scratch_dir):
        shutil.rmtree(scratch_dir)
    if os.path.exists(artifacts_bonuri):
        shutil.rmtree(artifacts_bonuri)

    # 2. Compile TS to JS in scratch directory
    # We override target, module, and noEmit so tsc actually writes the files
    print("\n1. Compiling TypeScript test files...")
    tsc_cmd = [
        "npx", "tsc",
        "--module", "CommonJS",
        "--target", "ES2022",
        "--moduleResolution", "Node",
        "--noEmit", "false",
        "--outDir", os.path.join("scratch", "test-build"),
        os.path.join("src", "features", "fiscal-net", "types.ts"),
        os.path.join("src", "features", "fiscal-net", "fiscalNetMappings.ts"),
        os.path.join("src", "features", "fiscal-net", "fiscalNetFormatter.ts"),
        os.path.join("src", "features", "fiscal-net", "fiscalNetExportService.ts"),
        os.path.join("src", "features", "fiscal-net", "responseParser.ts"),
        os.path.join("src", "features", "fiscal-net", "fiscalNetTest.ts")
    ]
    
    print(f"Executing: {' '.join(tsc_cmd)}")
    compile_res = subprocess.run(tsc_cmd, shell=True, capture_output=True, text=True)
    if compile_res.returncode != 0:
        print("[FAIL] TypeScript Compilation Failed!")
        print("STDOUT:", compile_res.stdout)
        print("STDERR:", compile_res.stderr)
        sys.exit(1)
    print("[PASS] TypeScript compiled successfully.")

    # Write a temporary package.json to the scratch directory to treat JS files as CommonJS
    with open(os.path.join(scratch_dir, "package.json"), "w") as pkg_f:
        pkg_f.write('{"type": "commonjs"}')

    # 3. Run the compiled tests with Node
    print("\n2. Running compiled test file in Node.js...")
    node_cmd = ["node", os.path.join("scratch", "test-build", "fiscalNetTest.js")]
    print(f"Executing: {' '.join(node_cmd)}")
    run_res = subprocess.run(node_cmd, capture_output=True, text=True)
    
    print("Node.js Output:")
    print(run_res.stdout)
    if run_res.stderr:
        print("Node.js Errors:")
        print(run_res.stderr)

    if run_res.returncode != 0:
        print("[FAIL] Node.js test execution failed!")
        sys.exit(1)
        
    if "[SUCCESS] All FiscalNet TypeScript unit tests passed!" not in run_res.stdout:
        print("[FAIL] Test completion message not found in output!")
        sys.exit(1)
        
    print("[PASS] Node.js unit tests executed successfully.")

    # 4. Verify dry-run output file
    print("\n3. Verifying generated dry-run file...")
    expected_file = os.path.join(artifacts_bonuri, "SALE-002.txt")
    if not os.path.exists(expected_file):
        print(f"[FAIL] Expected file '{expected_file}' was not created!")
        sys.exit(1)
        
    with open(expected_file, "r", newline="", encoding="utf8") as f:
        file_content = f.read()
        
    print("Generated file content:")
    print(repr(file_content))
    
    expected_lines = [
        "S^HELL FOCUS 0.25L^450^1000^buc^1^1\r\n",
        "S^GARANTIE SGR METAL^50^1000^buc^4^1\r\n",
        "P^1^500\r\n"
    ]
    
    expected_full_content = "".join(expected_lines)
    if file_content != expected_full_content:
        print("[FAIL] Generated file content does not match expected output!")
        print(f"Expected: {repr(expected_full_content)}")
        print(f"Actual:   {repr(file_content)}")
        sys.exit(1)
        
    print("[PASS] Dry-run file output verified successfully.")
    print("\n=== ALL TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_test()
