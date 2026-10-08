# Scan Carte

Mini-app iPhone : photo d'une carte de visite (prise sur le moment ou choisie dans la pellicule), lecture automatique, vérification, ajout aux Contacts.

- Lecture OCR **sur le téléphone** (Tesseract.js) : aucune photo ni donnée envoyée à un serveur.
- Champs détectés : prénom, nom, fonction, société, mobile, fixe, e-mail, site, adresse. Le reste part dans les notes.
- Enregistrement via une fiche vCard que l'iPhone ouvre dans Contacts.

## Mise en ligne (une fois)

1. Sur GitHub : **Settings > Pages > Source : Deploy from a branch**, branche `main` (ou la branche de travail), dossier `/ (root)`.
2. L'adresse apparaît après une minute : `https://<compte>.github.io/lecture-carte-visite-iphone/`.

GitHub Pages sur un dépôt privé demande un compte payant. Alternative gratuite : glisser le dossier sur https://app.netlify.com/drop.

## Installation sur l'iPhone

1. Ouvrir l'adresse dans **Safari**.
2. Bouton Partager > **Sur l'écran d'accueil**.

## Fichiers

- `index.html` : interface et OCR
- `parse.js` : tri du texte lu en champs de contact + génération vCard
- `manifest.webmanifest`, `icon.png` : icône d'écran d'accueil
