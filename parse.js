// Transforme le texte brut lu sur une carte de visite en champs de contact.
// Fonction pure, utilisable dans le navigateur (window.parseCard) et dans Node (tests).
(function (root) {
  const WEBMAILS = /^(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|mac|orange|free|sfr|laposte|wanadoo|neuf|aol|proton|protonmail|gmx|bbox)\./i;

  const TITLE_WORDS = /(?<![A-Za-zÀ-ÿ])(expert|comptable|commissaire|directeur|directrice|dirigeant|dirigeante|g[ée]rant|g[ée]rante|pr[ée]sident|pr[ée]sidente|fondateur|fondatrice|associ[ée]|manager|responsable|charg[ée]|consultant|consultante|conseill[eè]re?|avocat|avocate|notaire|ing[ée]nieur|commercial|commerciale|assistant|assistante|chef|head|ceo|cto|cfo|coo|founder|partner|director|sales|developer|d[ée]veloppeur|designer|coach|architecte|m[ée]decin|docteur|juriste|collaborateur|collaboratrice|secr[ée]taire|agent|technicien|technicienne|formateur|formatrice)(?![A-Za-zÀ-ÿ])/i;

  const COMPANY_WORDS = /(?<![A-Za-zÀ-ÿ])(sas|sasu|sarl|eurl|sa|sci|scp|selarl|selas|sc|ltd|inc|gmbh|group|groupe|cabinet|soci[ée]t[ée]|agence|studio|conseil|consulting|expertise|audit|associ[ée]s|partners|holding|banque|assurances?)(?![A-Za-zÀ-ÿ])/i;

  const NOISE = /(t[ée]l|tel|mob|mobile|port|fax|e-?mail|mail|web|site|www\.|https?:|@|\d{2}[ .]?\d{2}[ .]?\d{2})/i;

  // Nettoie une ligne OCR : symboles, et débris d'icônes en début/fin de ligne ("E", "@", "[w)")
  function clean(s) {
    let words = s.replace(/[|•·©®™_~*=<>{}\[\]()«»"“”]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
    const junk = w => !/[A-Za-zÀ-ÿ0-9]/.test(w) || (/^[A-Za-zÀ-ÿ]$/.test(w));
    while (words.length > 1 && junk(words[0]) && !/^\+/.test(words[1] || '') && !/^@/.test(words[0])) words.shift();
    while (words.length > 1 && words[0] === '@') words.shift();
    while (words.length > 1 && junk(words[words.length - 1])) words.pop();
    return words.join(' ').replace(/^[^A-Za-zÀ-ÿ0-9+]+|[^A-Za-zÀ-ÿ0-9.)]+$/g, '').trim();
  }

  function capitalize(w) {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }

  // "EXPERT-COMPTABLE" -> "Expert-comptable"
  function l2title(l) {
    return l === l.toUpperCase() ? l.charAt(0) + l.slice(1).toLowerCase() : l;
  }

  function normPhone(raw) {
    let d = raw.replace(/[^\d+]/g, '');
    if (d.startsWith('00')) d = '+' + d.slice(2);
    if (/^33[1-9]\d{8}$/.test(d)) d = '+' + d; // "+" perdu à la lecture
    if (d.startsWith('+33')) {
      const n = d.slice(3).replace(/^0/, '');
      if (n.length !== 9) return null;
      return '+33 ' + n[0] + ' ' + n.slice(1).match(/.{2}/g).join(' ');
    }
    if (/^0\d{9}$/.test(d)) return d.match(/.{2}/g).join(' ');
    if (d.startsWith('+') && d.length >= 9 && d.length <= 16) return d;
    return null;
  }

  function isMobile(p) {
    return /^(\+33 [67]|0[67])/.test(p);
  }

  function parseCard(text) {
    const lines = text.split(/\r?\n/).map(clean).filter(l => l.length > 1);
    const out = { prenom: '', nom: '', fonction: '', societe: '', mobile: '', tel: '', email: '', web: '', adresse: '', notes: '' };
    const used = new Set();

    // E-mail
    const emailRe = /[A-Z0-9._%+-]+\s?@\s?[A-Z0-9.-]+\.[A-Z]{2,}/i;
    lines.forEach((l, i) => {
      const m = l.match(emailRe);
      if (m && !out.email) { out.email = m[0].replace(/\s/g, '').toLowerCase(); used.add(i); }
    });

    // Site web
    const webRe = /\b((?:https?:\/\/)?(?:www\.)[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}(?:\/\S*)?|(?:https?:\/\/)[^\s]+)/i;
    lines.forEach((l, i) => {
      if (out.web) return;
      const m = l.replace(emailRe, '').match(webRe);
      if (m) { out.web = m[0].replace(/^https?:\/\//i, '').toLowerCase(); used.add(i); }
    });
    if (!out.web && out.email) {
      const dom = out.email.split('@')[1];
      if (dom && !WEBMAILS.test(dom)) out.web = 'www.' + dom;
    }

    // Téléphones
    const phoneRe = /\b33\s?[1-9](?:[\s.\-]*\d){8}\b|(?:\+|00)\s?\d{1,3}[\s.\-()]*\d(?:[\s.\-()]*\d){7,10}|0\d(?:[\s.\-]*\d{2}){4}/g;
    lines.forEach((l, i) => {
      const ms = l.match(phoneRe);
      if (!ms) return;
      ms.forEach(raw => {
        const p = normPhone(raw);
        if (!p) return;
        used.add(i);
        if (/fax/i.test(l)) return;
        if (isMobile(p) || /mob|port|cell/i.test(l)) { if (!out.mobile) out.mobile = p; else if (!out.tel) out.tel = p; }
        else if (!out.tel) out.tel = p;
        else if (!out.mobile) out.mobile = p;
      });
    });

    // Adresse : ligne avec code postal à 5 chiffres (+ la ligne précédente si c'est une rue)
    lines.forEach((l, i) => {
      if (out.adresse || used.has(i)) return;
      if (/\b\d{5}\b\s+[A-Za-zÀ-ÿ]/.test(l)) {
        const prev = lines[i - 1];
        if (prev && !used.has(i - 1) && /\d+.*\b(rue|avenue|av\.?|bd|boulevard|place|chemin|all[ée]e|impasse|route|quai|cours)\b/i.test(prev)) {
          out.adresse = prev + ', ' + l; used.add(i - 1);
        } else out.adresse = l;
        used.add(i);
      }
    });

    // Fonction : la ligne qui contient le plus de mots-métier
    const titleRe = new RegExp(TITLE_WORDS.source, 'gi');
    let ti = -1, tScore = 0;
    lines.forEach((l, i) => {
      if (used.has(i) || l.length >= 60) return;
      const n = (l.match(titleRe) || []).length - (COMPANY_WORDS.test(l) ? 1 : 0);
      if (n > 0 && (n > tScore || (n === tScore && l.length > lines[ti].length))) { tScore = n; ti = i; }
    });
    if (ti >= 0) { out.fonction = l2title(lines[ti]); used.add(ti); }

    // Nom : 2 à 4 mots alphabétiques, idéalement avec un mot en MAJUSCULES (nom de famille)
    let best = -1, bestScore = 0;
    lines.forEach((l, i) => {
      if (used.has(i) || NOISE.test(l) || COMPANY_WORDS.test(l) || TITLE_WORDS.test(l)) return;
      const words = l.split(' ').filter(Boolean);
      if (words.length < 2 || words.length > 4) return;
      if (!words.every(w => /^[A-Za-zÀ-ÿ'\-]+$/.test(w))) return;
      if (words.some(w => w.length < 2) || l.replace(/\s/g, '').length < 6) return;
      let score = 1;
      if (words.some(w => w.length > 2 && w === w.toUpperCase())) score += 2;
      if (words.every(w => w.length >= 3)) score += 1;
      if (words.some(w => /^[A-ZÀ-Ý][a-zà-ÿ]+/.test(w))) score += 1;
      if (i < lines.length / 2) score += 0.5;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) {
      const words = lines[best].split(' ');
      const upper = words.filter(w => w.length > 1 && w === w.toUpperCase());
      const rest = words.filter(w => !(w.length > 1 && w === w.toUpperCase()));
      if (upper.length && rest.length) {
        out.prenom = rest.join(' ');
        out.nom = upper.map(capitalize).join(' ');
      } else {
        out.prenom = words[0];
        out.nom = words.slice(1).join(' ');
      }
      used.add(best);
    }

    // Société : déduite du domaine e-mail (fiable), sauf si une ligne "société" lui ressemble
    const dom = (out.email.split('@')[1] || '');
    const core = WEBMAILS.test(dom) ? '' : dom.split('.')[0].toLowerCase();
    const coreFlat = core.replace(/[^a-z0-9]/g, '');
    lines.forEach((l, i) => {
      if (out.societe || used.has(i) || l.length >= 60 || !COMPANY_WORDS.test(l)) return;
      const flat = l.toLowerCase();
      if (!core || flat.normalize('NFD').replace(/[^a-z0-9]/g, '').includes(coreFlat) || coreFlat.includes(flat)) { out.societe = l; used.add(i); }
    });
    if (!out.societe && core) out.societe = core.split('-').map(capitalize).join(' ');

    // Le reste en notes, pour que rien ne se perde
    out.notes = lines.filter((_, i) => !used.has(i)).join(' / ');
    return out;
  }

  function esc(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  }

  function toVCard(c) {
    const L = ['BEGIN:VCARD', 'VERSION:3.0'];
    L.push('N:' + esc(c.nom) + ';' + esc(c.prenom) + ';;;');
    L.push('FN:' + esc([c.prenom, c.nom].filter(Boolean).join(' ') || c.societe || 'Contact'));
    if (c.societe) L.push('ORG:' + esc(c.societe));
    if (c.fonction) L.push('TITLE:' + esc(c.fonction));
    if (c.mobile) L.push('TEL;TYPE=CELL:' + c.mobile);
    if (c.tel) L.push('TEL;TYPE=WORK,VOICE:' + c.tel);
    if (c.email) L.push('EMAIL;TYPE=INTERNET,WORK:' + c.email);
    if (c.web) L.push('URL:' + (/^https?:/i.test(c.web) ? c.web : 'https://' + c.web));
    if (c.adresse) L.push('ADR;TYPE=WORK:;;' + esc(c.adresse) + ';;;;');
    const note = ['Carte scannée le ' + new Date().toLocaleDateString('fr-FR'), c.notes].filter(Boolean).join(' - ');
    L.push('NOTE:' + esc(note));
    L.push('END:VCARD');
    return L.join('\r\n') + '\r\n';
  }

  root.parseCard = parseCard;
  root.toVCard = toVCard;
  if (typeof module !== 'undefined') module.exports = { parseCard, toVCard };
})(typeof window !== 'undefined' ? window : globalThis);
