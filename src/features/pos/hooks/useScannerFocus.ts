import { useEffect, useCallback, useState, useRef } from 'react';

interface UseScannerFocusOptions {
    /** Whether any modal/dialog is currently open (prevents auto-refocus) */
    isModalOpen?: boolean;
    /** Delay in ms before refocusing after blur (allows legitimate clicks) */
    refocusDelay?: number;
    /** Whether the hook is enabled (e.g., only when shift is active) */
    enabled?: boolean;
}

/**
 * Hook that keeps the barcode scanner input permanently focused.
 * 
 * Features:
 * - Auto-focus on mount
 * - Refocus after blur with configurable delay
 * - Modal protection: won't steal focus from modals/dialogs
 * - Detects DOM overlays (z-50 fixed elements) as modal indicators
 * - Exposes `isScannerReady` for visual feedback
 */
export const useScannerFocus = (
    inputRef: React.RefObject<HTMLInputElement | null>,
    options: UseScannerFocusOptions = {}
) => {
    const {
        isModalOpen = false,
        refocusDelay = 200,
        enabled = true
    } = options;

    const [isScannerReady, setIsScannerReady] = useState(false);
    const refocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isModalOpenRef = useRef(isModalOpen);

    // Keep ref in sync with prop
    useEffect(() => {
        isModalOpenRef.current = isModalOpen;
    }, [isModalOpen]);

    /**
     * Checks whether there is an overlay modal in the DOM
     * (e.g., ShiftOpenModal, ShiftCloseModal, confirm dialogs).
     * These modals use `fixed inset-0 z-50` pattern.
     */
    const hasActiveOverlay = useCallback((): boolean => {
        if (isModalOpenRef.current) return true;

        // Check for fixed overlay elements with z-50 class (modal pattern used in POS)
        const overlays = document.querySelectorAll('.fixed.inset-0.z-50');
        return overlays.length > 0;
    }, []);

    /**
     * Checks whether the currently focused element is an interactive element
     * that should not lose focus (input, textarea, select inside modals or payment panel).
     */
    const isInteractiveElementFocused = useCallback((): boolean => {
        const activeEl = document.activeElement;
        if (!activeEl) return false;

        // Don't steal focus from our own input
        if (activeEl === inputRef.current) return false;

        // Check if active element is an input/textarea/select (e.g., payment fields, modal forms)
        const tag = activeEl.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
            return true;
        }

        // Check for contenteditable
        if (activeEl.getAttribute('contenteditable') === 'true') {
            return true;
        }

        return false;
    }, [inputRef]);

    /**
     * Attempt to focus the scanner input, respecting modal and interactive element protections.
     */
    const focusScanner = useCallback(() => {
        if (!enabled) return;
        if (!inputRef.current) return;
        if (hasActiveOverlay()) return;
        if (isInteractiveElementFocused()) return;

        inputRef.current.focus();
    }, [enabled, inputRef, hasActiveOverlay, isInteractiveElementFocused]);

    // Auto-focus on mount and when enabled changes
    useEffect(() => {
        if (!enabled) {
            setIsScannerReady(false);
            return;
        }

        // Small delay to ensure DOM is settled after route transitions
        const timer = setTimeout(() => {
            focusScanner();
        }, 100);

        return () => clearTimeout(timer);
    }, [enabled, focusScanner]);

    // Track focus/blur on the input to update isScannerReady
    useEffect(() => {
        const input = inputRef.current;
        if (!input || !enabled) {
            setIsScannerReady(false);
            return;
        }

        const handleFocus = () => {
            setIsScannerReady(true);
        };

        const handleBlur = () => {
            setIsScannerReady(false);

            // Clear any pending refocus timer
            if (refocusTimerRef.current) {
                clearTimeout(refocusTimerRef.current);
            }

            // Schedule refocus after delay (allows legitimate clicks to register)
            refocusTimerRef.current = setTimeout(() => {
                if (!hasActiveOverlay() && !isInteractiveElementFocused()) {
                    focusScanner();
                }
            }, refocusDelay);
        };

        input.addEventListener('focus', handleFocus);
        input.addEventListener('blur', handleBlur);

        // Check initial state
        if (document.activeElement === input) {
            setIsScannerReady(true);
        }

        return () => {
            input.removeEventListener('focus', handleFocus);
            input.removeEventListener('blur', handleBlur);
            if (refocusTimerRef.current) {
                clearTimeout(refocusTimerRef.current);
            }
        };
    }, [inputRef, enabled, refocusDelay, focusScanner, hasActiveOverlay, isInteractiveElementFocused]);

    // When modals close, refocus the scanner after a short delay
    useEffect(() => {
        if (!isModalOpen && enabled) {
            const timer = setTimeout(() => {
                focusScanner();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isModalOpen, enabled, focusScanner]);

    // Listen for clicks on the POS page body to refocus
    useEffect(() => {
        if (!enabled) return;

        const handleDocumentClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // Don't interfere if clicking on interactive elements
            const tag = target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'a') {
                return;
            }

            // Don't interfere if inside a modal overlay
            if (target.closest('.fixed.inset-0.z-50')) {
                return;
            }

            // Refocus scanner after clicking on non-interactive areas
            setTimeout(() => {
                if (!hasActiveOverlay() && !isInteractiveElementFocused()) {
                    focusScanner();
                }
            }, 100);
        };

        document.addEventListener('click', handleDocumentClick);
        return () => document.removeEventListener('click', handleDocumentClick);
    }, [enabled, focusScanner, hasActiveOverlay, isInteractiveElementFocused]);

    return {
        /** Whether the scanner input is currently focused and ready to receive barcode input */
        isScannerReady,
        /** Manually trigger focus on the scanner input */
        focusScanner
    };
};
