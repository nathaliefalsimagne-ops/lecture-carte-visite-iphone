// Sert la fiche contact comme un vrai fichier .vcf venu du site.
// Safari sur iPhone n'ouvre l'aperçu Contacts que pour un fichier reçu ainsi,
// pas pour une fiche fabriquée dans la page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || !url.pathname.endsWith('/contact.vcf')) return;
  const b64 = (url.searchParams.get('d') || '').replace(/-/g, '+').replace(/_/g, '/');
  let vcf = '';
  try { vcf = new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))); } catch (err) { /* fiche vide */ }
  e.respondWith(new Response(vcf, {
    headers: { 'Content-Type': 'text/vcard; charset=utf-8', 'Content-Disposition': 'inline; filename="contact.vcf"' }
  }));
});
