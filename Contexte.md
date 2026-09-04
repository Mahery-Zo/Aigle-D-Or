# Contexte du projet — Aigle d'Or

## Présentation générale

**Aigle d'Or** est une **Progressive Web App (PWA)** destinée à l'envoi rapide d'emails avec photos jointes. L'application permet aux utilisateurs de composer et envoyer des **rapports de versements de ventes** par email, accompagnés de photos (reçus, justificatifs, etc.).

C'est un outil métier conçu pour simplifier le processus de transmission des versements de ventes : l'utilisateur sélectionne des photos, renseigne les destinataires et les dates de vente, puis l'application génère automatiquement l'objet et le corps du message avant de l'envoyer par email via un serveur SMTP (Gmail).

---

## Architecture technique

Le projet suit une architecture **client-serveur** composée de deux parties :

### Frontend (PWA)
- **Technologies** : HTML, CSS, JavaScript vanilla (sans framework)
- **Fichiers principaux** :
  - `index.html` — Structure de l'interface utilisateur
  - `app.js` — Logique applicative (gestion des photos, emails, formulaire, envoi)
  - `style.css` — Styles de l'application
  - `sw.js` — Service Worker pour le fonctionnement hors ligne et l'installabilité PWA
  - `manifest.json` — Manifeste PWA (nom, icônes, thème, mode standalone)
- **Fonctionnalités frontend** :
  - Ajout et prévisualisation de photos (avec suppression individuelle)
  - Saisie de destinataires multiples sous forme de tags (avec validation)
  - Sélection de dates de vente (jours, mois, année) avec génération automatique de l'objet et du corps de l'email
  - Envoi du formulaire avec indicateur de chargement
  - Notifications toast (succès, erreur, info)
  - Overlay de confirmation après envoi réussi
  - Vérification du statut du serveur (en ligne / hors ligne)
  - Support hors ligne via le Service Worker (cache des assets statiques)

### Backend (Node.js / Express)
- **Technologies** : Node.js, Express, Nodemailer, Multer
- **Fichier principal** : `server.js`
- **Dépendances** :
  - `express` — Serveur HTTP et routage
  - `nodemailer` — Envoi d'emails via SMTP
  - `multer` — Gestion de l'upload de fichiers (photos en mémoire)
  - `cors` — Gestion des requêtes cross-origin
  - `dotenv` — Chargement des variables d'environnement
- **Routes API** :
  - `POST /api/send-email` — Envoi d'un email avec pièces jointes (photos), accepte jusqu'à 20 photos de 15 Mo max chacune
  - `GET /api/health` — Vérification du statut du serveur
- **Configuration SMTP** : Via un fichier `.env` (hôte, port, identifiants, adresse d'expéditeur). Configuré pour Gmail (port 587, mot de passe d'application).

---

## Flux de fonctionnement

1. L'utilisateur ouvre l'application (installable en tant que PWA sur mobile)
2. Il ajoute des **photos** (reçus de versement, justificatifs)
3. Il saisit un ou plusieurs **destinataires** (adresses email)
4. Il renseigne les **dates de vente** (jours, mois, année)
5. L'objet et le corps de l'email sont **générés automatiquement** au format :
   - Objet : `Versement des ventes du 11, 12, 13 / 07 / 2026`
   - Corps : `Bonjour, Voici les versements des ventes du 11, 12, 13 juillet 2026. Cordialement`
6. L'utilisateur peut modifier le message manuellement si nécessaire
7. Il clique sur **Envoyer** → le formulaire est validé côté client puis envoyé au backend
8. Le backend transmet l'email avec les photos en pièces jointes via Gmail SMTP
9. Un overlay de confirmation s'affiche en cas de succès

---

## Déploiement

- Le serveur backend sert également les fichiers statiques du frontend
- Le serveur écoute sur le port **3000** (`http://localhost:3000`)
- Un tunnel externe peut être créé via `npx untun` pour exposer le serveur localement à Internet (utile pour tester sur mobile)

---

## Résumé

| Aspect             | Détail                                                  |
|--------------------|----------------------------------------------------------|
| **Type**           | Progressive Web App (PWA)                                |
| **Objectif**       | Envoi d'emails de versements de ventes avec photos       |
| **Frontend**       | HTML / CSS / JS vanilla, Service Worker                  |
| **Backend**        | Node.js, Express, Nodemailer, Multer                     |
| **SMTP**           | Gmail (port 587, mot de passe d'application)             |
| **Port serveur**   | 3000                                                     |
| **Installable**    | Oui (PWA, mode standalone, icônes)                       |
| **Hors ligne**     | Partiel (cache des assets, API nécessite la connexion)   |
