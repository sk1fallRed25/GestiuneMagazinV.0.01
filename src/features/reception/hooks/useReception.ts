import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { 
    ReceptionProduct, 
    ReceptionLine, 
    ReceptionDocument,
    CreateReceptionPayload
} from '../types';
import { receptionService } from '../services/receptionService';

export const useReception = () => {
    const { currentStoreId, user, profile } = useAuth();
    
    // --- Document State ---
    const [document, setDocument] = useState<ReceptionDocument>({
        documentNumber: '',
        documentDate: new Date().toISOString().slice(0, 10),
        supplierText: '',
        supplierCui: '',
        observations: ''
    });

    // --- Products State ---
    const [availableProducts, setAvailableProducts] = useState<ReceptionProduct[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<ReceptionProduct | null>(null);

    // --- Line Input State ---
    const [isBax, setIsBax] = useState(false);
    const [quantityInput, setQuantityInput] = useState<string>('');
    const [bucatiPerBax, setBucatiPerBax] = useState<string>('1');
    const [totalValueInput, setTotalValueInput] = useState<string>('');
    const [adaos, setAdaos] = useState<number>(30);
    const [vatPercent, setVatPercent] = useState<number>(19);
    const [batchNumber, setBatchNumber] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>('');

    // --- Table State ---
    const [lines, setLines] = useState<ReceptionLine[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [xmlStatus, setXmlStatus] = useState('');

    const loadProducts = useCallback(async () => {
        if (!currentStoreId) return;
        setLoadingProducts(true);
        try {
            const data = await receptionService.listReceptionProducts(currentStoreId);
            setAvailableProducts(data);
        } catch (error: unknown) {
            console.error(error);
            toast.error("Nu s-au putut încărca datele.");
        } finally {
            setLoadingProducts(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const filteredProducts = useMemo(() => {
        if (search.length < 2) return [];
        return availableProducts.filter(p => 
            p.nume.toLowerCase().includes(search.toLowerCase()) || 
            p.cod_bare.includes(search)
        ).slice(0, 10);
    }, [availableProducts, search]);

    const selectProduct = (p: ReceptionProduct) => {
        setSelectedProduct(p);
        setSearch(p.nume);
    };

    // --- Calcule ---
    const qVal = parseFloat(quantityInput) || 0;
    const bVal = parseFloat(bucatiPerBax) || 1;
    const tVal = parseFloat(totalValueInput) || 0;

    const quantityTotal = isBax ? qVal * bVal : qVal;
    const purchasePriceUnit = (tVal > 0 && quantityTotal > 0) ? (tVal / quantityTotal) : 0;
    const salePriceNew = Number((purchasePriceUnit * (1 + adaos / 100)).toFixed(2));

    const addLine = () => {
        if (!selectedProduct) return toast.error("Selectează un produs!");
        if (quantityTotal <= 0) return toast.error("Cantitatea trebuie să fie pozitivă.");
        if (tVal <= 0) return toast.error("Valoarea totală trebuie să fie pozitivă.");

        const newLine: ReceptionLine = {
            tempId: crypto.randomUUID(),
            productId: selectedProduct.id,
            productName: selectedProduct.nume,
            barcode: selectedProduct.cod_bare,
            quantity: quantityTotal,
            purchasePrice: purchasePriceUnit,
            salePrice: salePriceNew,
            vatPercent,
            batchNumber: batchNumber || null,
            expiryDate: expiryDate || null,
            isBax,
            cantitateBaxuri: isBax ? qVal : 0,
            bucatiPerBax: isBax ? bVal : 1
        };

        setLines(prev => [...prev, newLine]);

        // Reset inputs
        setSelectedProduct(null);
        setSearch('');
        setQuantityInput('');
        setTotalValueInput('');
        setBatchNumber('');
        setExpiryDate('');
    };

    const removeLine = (tempId: string) => {
        setLines(prev => prev.filter(l => l.tempId !== tempId));
    };

    const submitReception = async () => {
        if (!navigator.onLine) {
            return toast.error("Nu poți finaliza recepții cât timp aplicația este offline.");
        }
        if (!currentStoreId || !user) {
            return toast.error("Sesiune invalidă.");
        }
        if (!document.documentNumber) {
            return toast.error("Numărul documentului lipsește.");
        }
        if (lines.length === 0) {
            return toast.error("Adaugă cel puțin un produs.");
        }

        const totalEst = lines.reduce((acc, l) => acc + (l.quantity * l.purchasePrice), 0).toFixed(2);
        const confirmMsg = `Confirmi recepția documentului "${document.documentNumber}" cu ${lines.length} linii și total estimat ${totalEst} lei?`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        setSubmitting(true);
        try {
            const payload: CreateReceptionPayload = {
                storeId: currentStoreId,
                profileId: user.id,
                document,
                lines
            };

            await receptionService.createReception(payload);
            toast.success("Recepție finalizată cu succes!");
            
            // Reset form
            setLines([]);
            setDocument({
                documentNumber: '',
                documentDate: new Date().toISOString().slice(0, 10),
                supplierText: '',
                supplierCui: '',
                observations: ''
            });
            setXmlStatus('');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Operațiunea nu a putut fi finalizată.";
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const parseXMLInvoice = async (xmlText: string) => {
        setXmlStatus('⏳ Analiză XML...');
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const supplierName = xmlDoc.getElementsByTagName("cbc:RegistrationName")[0]?.textContent || '';
            const supplierCUI = xmlDoc.getElementsByTagName("cbc:CompanyID")[0]?.textContent || '';
            const invoiceID = xmlDoc.getElementsByTagName("cbc:ID")[0]?.textContent || '';
            const invoiceDate = xmlDoc.getElementsByTagName("cbc:IssueDate")[0]?.textContent || '';

            setDocument(prev => ({
                ...prev,
                documentNumber: invoiceID || prev.documentNumber,
                documentDate: invoiceDate || prev.documentDate,
                supplierText: supplierName || prev.supplierText,
                supplierCui: supplierCUI || prev.supplierCui
            }));

            // Procesare Linii XML
            const xmlLines = xmlDoc.getElementsByTagName("cac:InvoiceLine");
            const newLines: ReceptionLine[] = [];
            let unknownProducts = 0;

            for (let i = 0; i < xmlLines.length; i++) {
                const xLine = xmlLines[i];
                const name = xLine.getElementsByTagName("cbc:Name")[0]?.textContent;
                const xmlBarcode = xLine.getElementsByTagName("cac:SellersItemIdentification")[0]?.getElementsByTagName("cbc:ID")[0]?.textContent;
                
                const qty = parseFloat(xLine.getElementsByTagName("cbc:InvoicedQuantity")[0]?.textContent || '0');
                const lineTotal = parseFloat(xLine.getElementsByTagName("cbc:LineExtensionAmount")[0]?.textContent || '0');
                
                if (name || xmlBarcode) {
                    // Caută întâi după barcode, apoi după nume exact (case-insensitive)
                    const found = availableProducts.find(p => 
                        (xmlBarcode && p.cod_bare === xmlBarcode) || 
                        (name && p.nume.toLowerCase() === name.toLowerCase())
                    );

                    if (found) {
                        const uPrice = lineTotal / qty;
                        newLines.push({
                            tempId: crypto.randomUUID(),
                            productId: found.id,
                            productName: found.nume,
                            barcode: found.cod_bare,
                            quantity: qty,
                            purchasePrice: uPrice,
                            salePrice: Number((uPrice * 1.3).toFixed(2)),
                            vatPercent: 19,
                            batchNumber: invoiceID || null,
                            expiryDate: null
                        });
                    } else {
                        unknownProducts++;
                    }
                }
            }

            if (newLines.length > 0) {
                setLines(prev => [...prev, ...newLines]);
                toast.success(`${newLines.length} produse identificate și adăugate.`);
            }
            if (unknownProducts > 0) {
                toast.error(`${unknownProducts} produse din factură nu au fost găsite în nomenclator.`);
            }
            setXmlStatus('✅ XML procesat');
        } catch (error: unknown) {
            console.error(error);
            setXmlStatus('❌ Eroare XML');
            toast.error("Format XML nevalid.");
        }
    };

    return {
        document, setDocument,
        search, setSearch,
        filteredProducts,
        selectedProduct, selectProduct,
        isBax, setIsBax,
        quantityInput, setQuantityInput,
        bucatiPerBax, setBucatiPerBax,
        totalValueInput, setTotalValueInput,
        adaos, setAdaos,
        vatPercent, setVatPercent,
        batchNumber, setBatchNumber,
        expiryDate, setExpiryDate,
        lines, removeLine,
        submitting, submitReception,
        xmlStatus, parseXMLInvoice,
        loadingProducts,
        calculations: {
            quantityTotal,
            purchasePriceUnit,
            salePriceNew
        },
        addLine
    };
};
