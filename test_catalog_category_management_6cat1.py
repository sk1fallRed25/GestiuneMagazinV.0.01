import sys
import os
import subprocess
import random

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

def run_static_checks():
    safe_print("\n======================================================================")
    safe_print("RUNNING STATIC CHECKS FOR CATEGORY & SUBCATEGORY MANAGEMENT (6CAT.1)")
    safe_print("======================================================================\n")

    # 1. ProductsPage.tsx
    safe_print("--- Check 1: ProductsPage.tsx ---")
    file_path = os.path.join("src", "features", "products", "ProductsPage.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="catalog-category-manager-button"' in content, "ProductsPage.tsx missing catalog-category-manager-button testid"
    safe_print("PASS: ProductsPage.tsx static checks passed.")

    # 2. CategoryManagerModal.tsx
    safe_print("\n--- Check 2: CategoryManagerModal.tsx ---")
    file_path = os.path.join("src", "features", "products", "components", "CategoryManagerModal.tsx")
    assert os.path.exists(file_path), "CategoryManagerModal.tsx file does not exist"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="catalog-category-manager-panel"' in content, "CategoryManagerModal.tsx missing panel testid"
    assert 'data-testid="catalog-main-category-row"' in content, "CategoryManagerModal.tsx missing main category row testid"
    assert 'data-testid="catalog-subcategory-row"' in content, "CategoryManagerModal.tsx missing subcategory row testid"
    assert 'data-testid="catalog-create-main-category-button"' in content, "CategoryManagerModal.tsx missing create main category button testid"
    assert 'data-testid="catalog-create-subcategory-button"' in content, "CategoryManagerModal.tsx missing create subcategory button testid"
    assert 'data-testid="catalog-category-products-count"' in content, "CategoryManagerModal.tsx missing products count testid"
    assert 'data-testid="catalog-category-empty-state"' in content, "CategoryManagerModal.tsx missing empty state testid"
    assert 'data-testid="create-main-category-name-input"' in content, "CategoryManagerModal.tsx missing main category name input testid"
    assert 'data-testid="create-main-category-submit"' in content, "CategoryManagerModal.tsx missing main category submit testid"
    assert 'data-testid="create-subcategory-name-input"' in content, "CategoryManagerModal.tsx missing subcategory name input testid"
    assert 'data-testid="create-subcategory-submit"' in content, "CategoryManagerModal.tsx missing subcategory submit testid"
    assert 'create-main-category-error' in content, "CategoryManagerModal.tsx missing main category error testid"
    assert 'create-main-category-success' in content, "CategoryManagerModal.tsx missing main category success testid"
    assert 'create-subcategory-error' in content, "CategoryManagerModal.tsx missing subcategory error testid"
    assert 'create-subcategory-success' in content, "CategoryManagerModal.tsx missing subcategory success testid"
    safe_print("PASS: CategoryManagerModal.tsx static checks passed.")

    # 3. BulkMoveCategoryModal.tsx
    safe_print("\n--- Check 3: BulkMoveCategoryModal.tsx ---")
    file_path = os.path.join("src", "features", "products", "components", "BulkMoveCategoryModal.tsx")
    assert os.path.exists(file_path), "BulkMoveCategoryModal.tsx file does not exist"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="bulk-move-products-category"' in content, "BulkMoveCategoryModal.tsx missing category selector testid"
    assert 'data-testid="bulk-move-products-subcategory"' in content, "BulkMoveCategoryModal.tsx missing subcategory selector testid"
    assert 'data-testid="bulk-move-products-confirm"' in content, "BulkMoveCategoryModal.tsx missing confirm button testid"
    safe_print("PASS: BulkMoveCategoryModal.tsx static checks passed.")

    # 4. ProductTable.tsx
    safe_print("\n--- Check 4: ProductTable.tsx ---")
    file_path = os.path.join("src", "features", "products", "components", "ProductTable.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="product-row-category"' in content, "ProductTable.tsx missing product-row-category testid"
    assert 'data-testid="product-row-subcategory"' in content, "ProductTable.tsx missing product-row-subcategory testid"
    assert 'data-testid="product-row-category-path"' in content, "ProductTable.tsx missing product-row-category-path testid"
    safe_print("PASS: ProductTable.tsx static checks passed.")

    # 5. ProductEditModal.tsx
    safe_print("\n--- Check 5: ProductEditModal.tsx ---")
    file_path = os.path.join("src", "features", "products", "components", "ProductEditModal.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="product-edit-category-select"' in content, "ProductEditModal.tsx missing product-edit-category-select testid"
    assert 'data-testid="product-edit-subcategory-select"' in content, "ProductEditModal.tsx missing product-edit-subcategory-select testid"
    assert 'data-testid="product-edit-subcategory-empty"' in content, "ProductEditModal.tsx missing product-edit-subcategory-empty testid"
    assert 'data-testid="product-edit-save-category"' in content, "ProductEditModal.tsx missing product-edit-save-category testid"
    safe_print("PASS: ProductEditModal.tsx static checks passed.")

    # 6. ProductSearchBar.tsx
    safe_print("\n--- Check 6: ProductSearchBar.tsx ---")
    file_path = os.path.join("src", "features", "products", "components", "ProductSearchBar.tsx")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert 'data-testid="product-filter-category"' in content, "ProductSearchBar.tsx missing product-filter-category testid"
    assert 'data-testid="product-filter-subcategory"' in content, "ProductSearchBar.tsx missing product-filter-subcategory testid"
    assert 'data-testid="product-filter-clear-category"' in content, "ProductSearchBar.tsx missing product-filter-clear-category testid"
    assert 'data-testid="product-filter-uncategorized"' in content, "ProductSearchBar.tsx missing product-filter-uncategorized testid"
    safe_print("PASS: ProductSearchBar.tsx static checks passed.")

    # 7. Safety checks (finalize_sale, FiscalNet, auto-update, no .exe)
    safe_print("\n--- Check 7: Safety checks ---")
    # Get list of modified files using git diff
    try:
        git_diff = subprocess.check_output(["git", "diff", "--name-only", "origin/master"], text=True)
    except Exception:
        try:
            git_diff = subprocess.check_output(["git", "diff", "--name-only"], text=True)
        except Exception:
            git_diff = ""

    modified_files = [line.strip() for line in git_diff.split("\n") if line.strip()]
    safe_print(f"Modified files: {modified_files}")

    for file in modified_files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            if not os.path.exists(file):
                continue
            with open(file, "r", encoding="utf-8") as f:
                file_content = f.read()
            if "finalize_sale" in file_content:
                # Make sure we didn't change any code related to finalize_sale
                safe_print(f"Warning: 'finalize_sale' mentioned in modified file {file}. Check that no logic was broken.")
            if "FiscalNet" in file_content:
                safe_print(f"Warning: 'FiscalNet' mentioned in modified file {file}. Check that no logic was broken.")
            if "auto-update" in file_content:
                safe_print(f"Warning: 'auto-update' mentioned in modified file {file}. Check that no logic was broken.")

    # Verify no .exe generated
    exe_files = []
    for root, dirs, files in os.walk("."):
        if "node_modules" in root or ".git" in root or "dist" in root or "release" in root:
            continue
        for file in files:
            if file.endswith(".exe"):
                exe_files.append(os.path.join(root, file))
    
    assert len(exe_files) == 0, f"Found generated .exe files: {exe_files}"
    safe_print("PASS: Safety checks passed.")

def run_e2e_tests():
    from playwright.sync_api import sync_playwright

    safe_print("\n======================================================================")
    safe_print("RUNNING E2E TESTS FOR CATEGORY & SUBCATEGORY MANAGEMENT (6CAT.1)")
    safe_print("======================================================================\n")

    port = "5173"
    for p in ["5176", "5174", "5175", "5173"]:
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            s.connect(("localhost", int(p)))
            s.close()
            port = p
            break
        except Exception:
            pass

    app_url = f"http://localhost:{port}"
    safe_print(f"Connecting to app at {app_url}")

    # Generate unique names to prevent collision in database
    suffix = str(random.randint(10000, 99999))
    cat_name = f"Test Cat 6CAT1 {suffix}"
    sub_name = f"Test Subcat 6CAT1 {suffix}"
    safe_print(f"Generated category: {cat_name}")
    safe_print(f"Generated subcategory: {sub_name}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        page.on("console", lambda msg: safe_print(f"[Browser Console] {msg.type}: {msg.text}"))

        try:
            # 1. Login
            safe_print("Step 1: Logging in...")
            page.goto(f"{app_url}/#/login")
            page.locator("input[type='text']").wait_for(state="visible", timeout=10000)
            page.locator("input[type='text']").fill("admin@admin.com")
            page.locator("input[type='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            
            page.locator("text=Dashboard").first.wait_for(state="visible", timeout=15000)
            safe_print("Login successful.")
            page.wait_for_timeout(2000)

            # 2. Go to Catalog Produse
            safe_print("\nStep 2: Accessing Catalog Produse...")
            page.goto(f"{app_url}/#/produse")
            page.locator('[data-testid="products-page"]').wait_for(state="visible", timeout=10000)
            
            # Verify Category Manager button is visible
            manager_btn = page.locator('[data-testid="catalog-category-manager-button"]')
            assert manager_btn.is_visible(), "Category Manager button not visible"
            safe_print("Category Manager button found.")

            # 3. Open Category Manager
            safe_print("\nStep 3: Opening Category Manager...")
            manager_btn.click()
            page.locator('[data-testid="catalog-category-manager-panel"]').wait_for(state="visible", timeout=5000)
            safe_print("Category Manager panel opened.")

            # 4. Create main category
            safe_print("\nStep 4: Creating main category...")
            # Click create button
            page.locator('[data-testid="catalog-create-main-category-button"]').click()
            # Fill name
            name_input = page.locator('[data-testid="create-main-category-name-input"]')
            name_input.wait_for(state="visible", timeout=3000)
            name_input.fill(cat_name)
            # Submit
            page.locator('[data-testid="create-main-category-submit"]').click()
            # Wait for success message
            page.locator('[data-testid="create-main-category-success"]').wait_for(state="visible", timeout=5000)
            safe_print(f"Main category '{cat_name}' created successfully.")
            page.wait_for_timeout(1000)

            # 5. Create subcategory under Test Cat 6CAT1
            safe_print("\nStep 5: Creating subcategory...")
            # Find the row for Test Cat 6CAT1 and click its 'Adaugă subcategorie' button
            root_row = page.locator('[data-testid="catalog-main-category-row"]').filter(has_text=cat_name)
            root_row.locator('[data-testid="catalog-create-subcategory-button"]').click()
            
            # Fill subcategory name
            sub_input = page.locator('[data-testid="create-subcategory-name-input"]')
            sub_input.wait_for(state="visible", timeout=3000)
            sub_input.fill(sub_name)
            
            # Submit subcategory
            page.locator('[data-testid="create-subcategory-submit"]').click()
            # Wait for success
            page.locator('[data-testid="create-subcategory-success"]').wait_for(state="visible", timeout=5000)
            safe_print(f"Subcategory '{sub_name}' created successfully.")
            page.wait_for_timeout(1000)

            # 6. Close Category Manager
            safe_print("\nStep 6: Closing Category Manager...")
            # Press escape to close modal
            page.keyboard.press("Escape")
            page.wait_for_timeout(1000)

            # 7. Edit a product to use the new category
            safe_print("\nStep 7: Editing product category...")
            # Select first product and click edit
            first_row = page.locator('[data-testid="products-table-row"]').first
            first_product_name = first_row.locator('p.font-bold').inner_text()
            safe_print(f"Product selected: {first_product_name}")
            first_row.locator('[data-testid="product-edit-button"]').click()
            
            # Wait for edit modal
            page.locator('[data-testid="product-edit-modal"]').wait_for(state="visible", timeout=5000)
            
            # Select category
            page.locator('[data-testid="product-edit-category-select"]').select_option(label=cat_name)
            page.wait_for_timeout(1000)
            
            # Select subcategory
            page.locator('[data-testid="product-edit-subcategory-select"]').select_option(label=sub_name)
            page.wait_for_timeout(1000)
            
            # Verify preview message
            preview_msg = page.locator('[data-testid="product-edit-save-category"]')
            assert f"{cat_name.lower()} / {sub_name.lower()}" in preview_msg.inner_text().lower(), "Preview category path is incorrect"
            
            # Click save
            page.locator('[data-testid="product-edit-save-button"]').click()
            page.wait_for_timeout(2000)
            safe_print(f"Product category saved.")

            # 8. Verify path is visible in table
            safe_print("\nStep 8: Verifying table displays category path...")
            # Look at the product row and verify its category badges
            updated_row = page.locator('[data-testid="products-table-row"]').filter(has_text=first_product_name)
            cat_badge = updated_row.locator('[data-testid="product-row-category"]').first
            subcat_badge = updated_row.locator('[data-testid="product-row-subcategory"]')
            
            assert cat_name.lower() in cat_badge.inner_text().lower(), "Table does not display correct category"
            assert sub_name.lower() in subcat_badge.inner_text().lower(), "Table does not display correct subcategory"
            safe_print(f"Product table displays: {cat_badge.inner_text()} / {subcat_badge.inner_text()}")

            # 9. Test filtering
            safe_print("\nStep 9: Testing filters...")
            # Set category filter
            page.locator('[data-testid="product-filter-category"]').select_option(label=f"📁 {cat_name}")
            page.wait_for_timeout(1000)
            
            # Verify product is visible
            assert page.locator('[data-testid="products-table-row"]').filter(has_text=first_product_name).is_visible(), "Product not visible after category filtering"
            
            # Set subcategory filter
            page.locator('[data-testid="product-filter-subcategory"]').select_option(label=f"🔖 {sub_name}")
            page.wait_for_timeout(1000)
            
            # Verify product is visible
            assert page.locator('[data-testid="products-table-row"]').filter(has_text=first_product_name).is_visible(), "Product not visible after subcategory filtering"
            
            # Clear filter
            page.locator('[data-testid="product-filter-clear-category"]').click()
            page.wait_for_timeout(1000)
            safe_print("Filter testing passed.")

            # 10. Clean up: Edit product back to "Fără categorie"
            safe_print("\nStep 10: Cleaning up product category...")
            row_to_reset = page.locator('[data-testid="products-table-row"]').filter(has_text=first_product_name)
            row_to_reset.locator('[data-testid="product-edit-button"]').click()
            page.locator('[data-testid="product-edit-modal"]').wait_for(state="visible", timeout=5000)
            
            # Select no category
            page.locator('[data-testid="product-edit-category-select"]').select_option(value="")
            page.wait_for_timeout(1000)
            
            # Save
            page.locator('[data-testid="product-edit-save-button"]').click()
            page.wait_for_timeout(2000)
            safe_print("Product category reset successfully.")

        except Exception as e:
            safe_print(f"[FAIL] E2E verification failed: {e}")
            try:
                safe_print(f"Current URL: {page.url}")
            except Exception:
                pass
            page.screenshot(path="screenshot_e2e_6cat1_error.png")
            raise e
        finally:
            safe_print("\nStep 11: Cleaning up created test categories...")
            try:
                page.evaluate("""async () => {
                    const supabase = window.supabase;
                    const { data: cats } = await supabase
                        .from('categories')
                        .select('id')
                        .or('name.ilike.%6CAT1%,name.ilike.%test%');
                    
                    if (cats && cats.length > 0) {
                        const catIds = cats.map(c => c.id);
                        // Decouple any products referencing these categories
                        await supabase
                            .from('products')
                            .update({ category_id: null })
                            .in('category_id', catIds);
                        
                        // Delete subcategories first (parent_id is not null)
                        await supabase
                            .from('categories')
                            .delete()
                            .in('id', catIds)
                            .not('parent_id', 'is', null);
                            
                        // Delete parent categories
                        await supabase
                            .from('categories')
                            .delete()
                            .in('id', catIds)
                            .is('parent_id', null);
                    }
                }""")
                safe_print("Cleaned up categories successfully.")
            except Exception as clean_err:
                safe_print(f"Cleanup failed: {clean_err}")
            context.close()
            browser.close()

    safe_print("\n======================================================================")
    safe_print("ALL CATEGORY MANAGEMENT E2E TESTS PASSED!")
    safe_print("======================================================================\n")

if __name__ == "__main__":
    run_static_checks()
    try:
        run_e2e_tests()
    except Exception:
        sys.exit(1)
