// Utilitare extrase din vechiul FastAdd

export const formateazaGramaj = (text: string) => {
    if (!text) return '';
    let t = text.toLowerCase().trim();
    t = t.replace('litri', 'L').replace('litru', 'L').replace('l', 'L');
    t = t.replace('mililitri', 'ml').replace('ml', 'ml');
    t = t.replace('kilograme', 'kg').replace('kilogram', 'kg').replace('kg', 'kg');
    t = t.replace('grame', 'g').replace('gram', 'g').replace('g', 'g');
    t = t.replace(/\s/g, '');

    if (t.endsWith('l') && !t.endsWith('ml')) {
        t = t.replace('l', 'L');
    }
    return t;
}

export const detecteazaCategorie = (nume: string) => {
    const n = nume.toLowerCase();

    if (n.includes('apa') || n.includes('mineral') || n.includes('borsec') || n.includes('dorna')) return { cat: 'Băuturi', sub: 'Apă' };
    if (n.includes('cola') || n.includes('pepsi') || n.includes('fanta') || n.includes('suc') || n.includes('schweppes') || n.includes('prigat')) return { cat: 'Băuturi', sub: 'Răcoritoare' };
    if (n.includes('hell') || n.includes('red bull') || n.includes('monster') || n.includes('energizant')) return { cat: 'Băuturi', sub: 'Energizante' };
    if (n.includes('bere') || n.includes('ciuc') || n.includes('ursus') || n.includes('heineken') || n.includes('timisoreana')) return { cat: 'Băuturi', sub: 'Bere' };
    if (n.includes('vin') || n.includes('cotnari') || n.includes('jidvei')) return { cat: 'Băuturi', sub: 'Vin' };
    if (n.includes('vodka') || n.includes('whisky') || n.includes('cognac') || n.includes('alexandrion')) return { cat: 'Băuturi', sub: 'Spirtoase' };
    if (n.includes('cafea') || n.includes('nes') || n.includes('jacobs')) return { cat: 'Băuturi', sub: 'Cafea' };

    if (n.includes('ciocolata') || n.includes('milka') || n.includes('kinder') || n.includes('snickers')) return { cat: 'Dulciuri', sub: 'Ciocolată' };
    if (n.includes('biscuit') || n.includes('napolitana') || n.includes('croissant') || n.includes('7days')) return { cat: 'Dulciuri', sub: 'Patiserie' };
    if (n.includes('chips') || n.includes('lays') || n.includes('chio') || n.includes('seminte')) return { cat: 'Dulciuri', sub: 'Snacks' };

    if (n.includes('paine') || n.includes('franzela')) return { cat: 'Panificație', sub: 'Pâine' };
    if (n.includes('iaurt') || n.includes('lapte') || n.includes('branza') || n.includes('smantana') || n.includes('unt')) return { cat: 'Lactate', sub: 'Derivate' };
    if (n.includes('salam') || n.includes('parizer') || n.includes('sunca') || n.includes('carnati')) return { cat: 'Mezeluri', sub: 'Carne' };

    if (n.includes('detergent') || n.includes('sapun') || n.includes('sampon') || n.includes('ariel')) return { cat: 'Non-Alimentare', sub: 'Curățenie' };
    if (n.includes('tigari') || n.includes('tutun') || n.includes('kent') || n.includes('marlboro')) return { cat: 'Tutun', sub: 'Țigări' };

    return { cat: 'General', sub: 'Diverse' };
}
