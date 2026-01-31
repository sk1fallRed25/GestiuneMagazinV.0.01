interface OpenFoodFactsResponse {
    status: number;
    product?: {
        product_name?: string;
        product_name_ro?: string;
        product_name_en?: string;
        common_name?: string;
        brands?: string;
        quantity?: string;
    };
}

class OpenFoodFactsService {
    private static BASE_URL = 'https://ro.openfoodfacts.org/api/v0/product';

    static async getProductByBarcode(barcode: string): Promise<string | null> {
        try {
            if (!barcode) return null;

            // Cerem datele de la API
            const response = await fetch(`${this.BASE_URL}/${barcode}.json`);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const json: OpenFoodFactsResponse = await response.json();

            if (json.status === 1 && json.product) {
                return this.formatStrictName(json.product);
            }

            return null;
        } catch (error) {
            console.error('[OpenFoodFactsService] Error:', error);
            return null;
        }
    }

    /**
     * Logica STRICTĂ: Brand + (Nume Scurt) + Gramaj
     * Elimină orice descriere lungă.
     */
    private static formatStrictName(product: any): string {
        // 1. BRAND (ex: "Pepsi")
        // Luăm doar primul cuvânt înainte de virgulă dacă sunt mai multe
        let brand = (product.brands || "").split(',')[0].trim();

        // 2. CANTITATE (ex: "1.25 L")
        const quantity = product.quantity || "";

        // 3. NUME PRODUS (Căutăm ceva scurt, nu descriere)
        // Colectăm toate variantele posibile
        const candidates = [
            product.product_name_en,
            product.product_name,
            product.product_name_ro,
            product.common_name
        ].filter(n => n && typeof n === 'string' && n.length > 1);

        // Sortăm crescător după lungime (cel mai scurt primul)
        candidates.sort((a, b) => a.length - b.length);

        // Luăm cel mai scurt nume disponibil
        let shortName = candidates[0] || "";

        // --- REGULA DE AUR ---
        // Dacă și cel mai scurt nume are peste 25 de caractere, înseamnă că e o descriere.
        // Îl ștergem complet! Rămânem doar cu Brandul.
        if (shortName.length > 25) {
            shortName = "";
        }

        // Curățăm numele scurt de brand (ca să nu avem "Pepsi Pepsi")
        if (brand && shortName.toLowerCase().includes(brand.toLowerCase())) {
            shortName = shortName.replace(new RegExp(brand, 'gi'), '').trim();
        }

        // Curățăm caractere ciudate de la început (ex: "- Sare")
        shortName = shortName.replace(/^[\s\-\,\.]+/, '');

        // 4. CONSTRUIRE FINALĂ
        // Format: Brand + NumeScurt (dacă există) + Cantitate
        let finalString = brand;

        if (shortName) {
            finalString += ` ${shortName}`;
        }

        if (quantity) {
            finalString += ` ${quantity}`;
        }

        // Capitalizare frumoasă (Prima literă mare, restul mici, păstrând unitățile de măsură)
        // Excepție: Dacă e totul gol, returnăm null
        if (!finalString.trim()) return "";

        return finalString.replace(/\s+/g, ' ').trim(); // Eliminăm spațiile duble
    }
}

export default OpenFoodFactsService;