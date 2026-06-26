export interface TextPart {
    text: string;
    isMatch: boolean;
}

/**
 * Normalizes text for accent-insensitive, case-insensitive search matching.
 * Trims whitespace and replaces multiple spaces with a single space.
 */
export function normalizeSearch(text: string | undefined | null): string {
    if (text === undefined || text === null) return '';
    return String(text)
        .toLowerCase()
        .replace(/ă/g, 'a')
        .replace(/â/g, 'a')
        .replace(/î/g, 'i')
        .replace(/ș/g, 's')
        .replace(/ț/g, 't')
        .replace(/ş/g, 's') // S with cedilla
        .replace(/ţ/g, 't') // T with cedilla
        .replace(/ă/gi, 'a')
        .replace(/â/gi, 'a')
        .replace(/î/gi, 'i')
        .replace(/ș/gi, 's')
        .replace(/ț/gi, 't')
        .replace(/ş/gi, 's')
        .replace(/ţ/gi, 't')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Checks if target fields contain the search query, in an accent-insensitive way.
 */
export function matchSearch(
    targets: (string | undefined | null) | (string | undefined | null)[],
    query: string
): boolean {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return true;

    const targetList = Array.isArray(targets) ? targets : [targets];
    return targetList.some(target => {
        if (!target) return false;
        return normalizeSearch(target).includes(normalizedQuery);
    });
}

/**
 * Splits text into match and non-match segments for highlighting.
 */
export function splitTextByQuery(text: string | undefined | null, query: string): TextPart[] {
    if (!text) return [];
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) {
        return [{ text, isMatch: false }];
    }

    const normalizedText = normalizeSearch(text);
    const parts: TextPart[] = [];
    let searchStart = 0;

    while (searchStart < text.length) {
        const matchIdx = normalizedText.indexOf(normalizedQuery, searchStart);
        if (matchIdx === -1) {
            const partText = text.slice(searchStart);
            if (partText) {
                parts.push({ text: partText, isMatch: false });
            }
            break;
        }

        if (matchIdx > searchStart) {
            const partText = text.slice(searchStart, matchIdx);
            if (partText) {
                parts.push({ text: partText, isMatch: false });
            }
        }

        const matchText = text.slice(matchIdx, matchIdx + normalizedQuery.length);
        if (matchText) {
            parts.push({ text: matchText, isMatch: true });
        }

        searchStart = matchIdx + normalizedQuery.length;
    }

    return parts;
}
