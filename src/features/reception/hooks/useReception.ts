import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { 
    ReceptionProduct, 
    ReceptionLine, 
    ReceptionDocument,
    ReceptionDbRow
} from '../types';
import { receptionService } from '../services/receptionService';

export const useReception = () => {
    const { currentStoreId, user } = useAuth();
    
    // --- Navigation / View state ---
    // form: editing or creating a reception
    // history: listing previous receptions
    // detail: read-only view of a posted/cancelled reception
    const [view, setView] = useState<'form' | 'history' | 'detail'>('form');

    // --- Active Draft ID ---
    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

    // --- Document State ---
    const [document, setDocument] = useState<ReceptionDocument>({
        documentNumber: '',
        documentDate: new Date().toISOString().slice(0, 10),
        receptionDate: new Date().toISOString().slice(0, 10),
        nirNumber: '',
        supplierText: '',
        supplierCui: '',
        observations: '',
        status: 'draft'
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

    // --- Table & XML state ---
    const [lines, setLines] = useState<ReceptionLine[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [xmlStatus, setXmlStatus] = useState('');

    // --- History Log State ---
    const [receptionsHistory, setReceptionsHistory] = useState<ReceptionDbRow[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({
        date: '',
        supplier: '',
        status: ''
    });

    // --- Detail View State ---
    const [selectedReceptionDetails, setSelectedReceptionDetails] = useState<any | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // --- Actions ---
    const loadProducts = useCallback(async () => {
        if (!currentStoreId) return;
        setLoadingProducts(true);
        try {
            const data = await receptionService.listReceptionProducts(currentStoreId);
            setAvailableProducts(data);
        } catch (error: unknown) {
            console.error(error);
            toast.error("Nu s-au putut încărca datele nomenclatorului.");
        } finally {
            setLoadingProducts(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const loadHistory = useCallback(async () => {
        if (!currentStoreId) return;
        setLoadingHistory(true);
        try {
            const data = await receptionService.listReceptions(currentStoreId, historyFilters);
            setReceptionsHistory(data);
        } catch (error) {
            console.error(error);
            toast.error("Nu s-a putut încărca istoricul recepțiilor.");
        } finally {
            setLoadingHistory(false);
        }
    }, [currentStoreId, historyFilters]);

    useEffect(() => {
        if (view === 'history') {
            loadHistory();
        }
    }, [view, loadHistory]);

    const filteredProducts = useMemo(() => {
        if (search.length < 2) return [];
        return availableProducts.filter(p => 
            p.nume.toLowerCase().includes(search.toLowerCase()) || 
            p.cod_bare.includes(search)
        ).slice(0, 10);
    }, [availableProducts, search]);

    const handleSetSearch = (val: string) => {
        setSearch(val);
        if (selectedProduct && val !== selectedProduct.nume) {
            setSelectedProduct(null);
        }
    };

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

    // --- Reset/New Form ---
    const startNewReception = () => {
        setActiveDraftId(null);
        setLines([]);
        setDocument({
            documentNumber: '',
            documentDate: new Date().toISOString().slice(0, 10),
            receptionDate: new Date().toISOString().slice(0, 10),
            nirNumber: '',
            supplierText: '',
            supplierCui: '',
            observations: '',
            status: 'draft'
        });
        setXmlStatus('');
        setView('form');
    };

    // --- Save Draft ---
    const saveCurrentDraft = async (silent: boolean = false): Promise<string | null> => {
        if (!currentStoreId || !user) {
            toast.error("Sesiune invalidă.");
            return null;
        }
        if (!document.documentNumber) {
            toast.error("Numărul facturii/documentului este obligatoriu.");
            return null;
        }
        if (lines.length === 0) {
            toast.error("Adăugați cel puțin un produs.");
            return null;
        }

        setSavingDraft(true);
        try {
            const draftId = await receptionService.saveDraft(
                currentStoreId,
                user.id,
                document,
                lines,
                activeDraftId || undefined
            );
            setActiveDraftId(draftId);
            if (!silent) {
                toast.success("Draft salvat cu succes!");
            }
            return draftId;
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Draftul nu a putut fi salvat.");
            return null;
        } finally {
            setSavingDraft(false);
        }
    };

    // --- Confirm / Post ---
    const confirmReception = async () => {
        if (!navigator.onLine) {
            return toast.error("Nu poți confirma recepții cât timp aplicația este offline.");
        }
        if (!document.documentNumber) {
            return toast.error("Numărul documentului lipsește.");
        }
        if (lines.length === 0) {
            return toast.error("Adaugă cel puțin un produs.");
        }

        // First save draft to ensure DB has all the current client-side data
        const draftId = await saveCurrentDraft(true);
        if (!draftId) return;

        setSubmitting(true);
        try {
            await receptionService.postReception(draftId, currentStoreId!, user!.id);
            toast.success("Recepție confirmată și postată în stoc cu succes!");
            
            // Go to detail view of the posted reception
            await viewDetails(draftId);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Eroare la confirmarea recepției.");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Cancel Draft ---
    const cancelActiveDraft = async () => {
        if (!activeDraftId) return;
        if (!window.confirm("Sigur dorești să anulezi acest draft de recepție? Această acțiune nu poate fi anulată.")) {
            return;
        }
        try {
            await receptionService.cancelReception(activeDraftId, currentStoreId!);
            toast.success("Recepția a fost anulată.");
            startNewReception();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Nu s-a putut anula recepția.");
        }
    };

    // --- Load Draft for Editing ---
    const editDraft = async (receptionId: string) => {
        setLoadingDetails(true);
        try {
            const data = await receptionService.getReceptionDetails(currentStoreId!, receptionId);
            if (data.status !== 'draft') {
                toast.error("Doar recepțiile în starea Draft pot fi editate.");
                return;
            }
            setActiveDraftId(data.id);
            setDocument({
                documentNumber: data.document_number,
                documentDate: data.document_date,
                receptionDate: data.reception_date || data.document_date,
                nirNumber: data.nir_number || '',
                supplierText: data.supplier_text || '',
                supplierCui: data.supplier_cui || '',
                observations: data.observations || '',
                status: data.status
            });

            // Map Db rows to Lines
            const mappedLines: ReceptionLine[] = data.items.map((it: any) => ({
                tempId: crypto.randomUUID(),
                productId: it.product_id,
                productName: it.products?.name || 'Produs',
                barcode: it.products?.barcode || '',
                quantity: Number(it.quantity),
                purchasePrice: Number(it.purchase_price),
                salePrice: Number(it.sale_price_new || 0),
                vatPercent: Number(it.vat_percent || 19),
                batchNumber: it.batch_number || null,
                expiryDate: it.expiry_date || null
            }));

            setLines(mappedLines);
            setView('form');
            toast.success("Draftul a fost încărcat pentru editare.");
        } catch (error) {
            console.error(error);
            toast.error("Nu s-au putut încărca detaliile draftului.");
        } finally {
            setLoadingDetails(false);
        }
    };

    // --- View Detail ---
    const viewDetails = async (receptionId: string) => {
        setLoadingDetails(true);
        setView('detail');
        try {
            const data = await receptionService.getReceptionDetails(currentStoreId!, receptionId);
            setSelectedReceptionDetails(data);
        } catch (error) {
            console.error(error);
            toast.error("Nu s-au putut încărca detaliile recepției.");
        } finally {
            setLoadingDetails(false);
        }
    };

    // --- XML Invoice Parsing ---
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
                receptionDate: new Date().toISOString().slice(0, 10),
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
                toast.success(`${newLines.length} produse identificate din XML.`);
            }
            if (unknownProducts > 0) {
                toast.error(`${unknownProducts} produse din XML nu au fost găsite în nomenclator.`);
            }
            setXmlStatus('✅ XML procesat');
        } catch (error: unknown) {
            console.error(error);
            setXmlStatus('❌ Eroare XML');
            toast.error("Format XML nevalid.");
        }
    };

    return {
        view, setView,
        activeDraftId,
        document, setDocument,
        search, setSearch: handleSetSearch,
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
        submitting, confirmReception,
        savingDraft, saveCurrentDraft,
        cancelActiveDraft,
        startNewReception,
        editDraft,
        viewDetails,
        receptionsHistory,
        loadingHistory,
        historyFilters, setHistoryFilters,
        selectedReceptionDetails,
        loadingDetails,
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
