# DEVIS - Adaptation Connecteur Polaris-Shopify
## Client : [Nom client - Vente de chaussures]

---

## 📋 CONTEXTE

**Situation** : Connecteur Polaris-Shopify déjà développé et en production chez un autre client.

**Objectif** : Adapter le connecteur existant pour un nouveau client avec :
- Multi-location (boutiques physiques + stocks)
- Mise en production sur VPS
- Ajout module retours produits
- Ajout poids des variantes

**Code existant réutilisable : 85%** ✅

---

## 🎯 PÉRIMÈTRE DU PROJET

### ✅ Fonctionnalités DÉJÀ développées (incluses)

**Synchronisation Produits (Polaris → Shopify)** :
- ✅ Import produits avec variantes (taille + couleur)
- ✅ Prix TTC + prix barrés (promotions)
- ✅ SKU uniques par combinaison taille/couleur
- ✅ Stocks multi-magasins (via metafields `code_magasin`)
- ✅ Détection automatique des changements
- ✅ Gestion du throttling Shopify

**Synchronisation Commandes (Shopify → Polaris)** :
- ✅ Webhooks temps réel
- ✅ Récupération magasin assigné
- ✅ Envoi vers Polaris `/Ventes/Vente`
- ✅ Déduplication commandes

**Infrastructure** :
- ✅ API Express.js + PostgreSQL
- ✅ Scripts déploiement (Docker, PM2)
- ✅ CI/CD GitHub Actions
- ✅ Sécurité (HMAC webhooks)

**Champs Polaris mappés** :
- ✅ 13 champs produits (NoModele, Libelle, Marque, Classification, Prix, SKU, Tailles, Couleurs, Stocks)
- ✅ 16 champs commandes (Client, Adresse, Lignes commande, CodeMagasin)

---

### 🔧 Travaux à réaliser

#### 1. ADAPTATION & CONFIGURATION (1.5 jour)

**Tâches** :
- Configuration environnements (dev/test/prod)
- Credentials Polaris du nouveau client (URL, API Key)
- Credentials Shopify (Access Token, Webhook Secret)
- Création base de données PostgreSQL
- Initialisation schéma BDD
- Configuration codes magasins (mapping Polaris ↔ Shopify)

**Livrables** :
- Fichiers `.env.dev`, `.env.test`, `.env.prod`
- BDD initialisée avec tables
- Documentation configuration spécifique client

---

#### 2. CONFIGURATION SHOPIFY MULTI-LOCATION (0.5 jour)

**Tâches** :
- Création des locations Shopify (boutiques physiques)
- Ajout metafields `code_magasin` sur chaque location
- Configuration webhooks :
  - `orders/create` → VPS
  - `products/delete` → VPS
  - `orders/delete` → VPS
- Génération Access Token (scopes produits, commandes, inventory, locations)
- Tests mapping locations

**Exemple configuration** :
```
Location Paris → metafield code_magasin = 101
Location Lyon → metafield code_magasin = 102
Location Marseille → metafield code_magasin = 103
```

**Livrables** :
- Locations configurées dans Shopify
- Metafields mappés
- Webhooks actifs

---

#### 3. TESTS & VALIDATION (1.5 jour)

**Tests synchronisation produits** :
- Import produits Polaris → BDD
- Création produits dans Shopify (mode DRAFT)
- Vérification variantes (tailles + couleurs)
- Vérification stocks multi-locations
- Tests changements prix/stocks

**Tests commandes** :
- Commande test sur Shopify
- Vérification webhook reçu
- Vérification code magasin récupéré
- Vérification envoi vers Polaris
- Validation création commande dans ERP

**Ajustements** :
- Correction bugs éventuels
- Ajustements mapping si spécificités client

**Livrables** :
- Rapport de tests
- Produits tests créés dans Shopify
- Commandes tests validées dans Polaris

---

#### 4. MISE EN PRODUCTION SUR VPS (1 jour)

**Infrastructure** :
- Configuration serveur VPS (Ubuntu)
- Installation Node.js, PostgreSQL, PM2
- Configuration SSL/HTTPS (Let's Encrypt)
- Déploiement code via GitHub
- Configuration PM2 (auto-restart)
- Configuration CRON pour synchronisation produits (ex: toutes les heures)
- Tests charge

**Sécurité** :
- Firewall (ports 80, 443, 22 uniquement)
- SSL/TLS
- Variables d'environnement sécurisées
- Backup BDD automatique

**Livrables** :
- Application déployée sur VPS
- URL production configurée
- PM2 actif
- CRON synchronisation actif
- Accès SSH client (optionnel)

---

#### 5. DÉVELOPPEMENT RETOURS PRODUITS (3 jours)

**⚠️ PRÉREQUIS CRITIQUE** : Endpoint Polaris pour retours doit exister

**Nouveau développement** :

**a) Webhook Shopify `refunds/create`** (1 jour)
- Endpoint `/webhook/refunds/create`
- Vérification signature HMAC
- Parsing données retour
- Récupération commande originale
- Validation retour (délai, produit existe, etc.)

**b) Service envoi ERP** (1 jour)
- Fonction `sendRefundToERP()`
- Transformation Shopify → format Polaris
- Mapping vers endpoint Polaris (ex: `/Ventes/Retour`)
- Gestion erreurs

**c) Gestion BDD & Tests** (1 jour)
- Table `shopify_refunds` (tracking)
- Déduplication retours
- Tests scénarios :
  - Retour complet
  - Retour partiel
  - Retour hors délai
  - Produit inexistant

**Payload Polaris (exemple)** :
```javascript
{
  RefVenteExt: "1234",           // Commande originale
  RefRetourExt: "R-1234-1",      // ID retour Shopify
  CodeMagasin: "101",
  DateRetour: "2025-11-20T10:00:00Z",
  Motif: "Taille incorrecte",
  Details: [
    {
      SKU: "REF-123-40",
      Qte: 1,
      MontantTTC: 89.90
    }
  ]
}
```

**Livrables** :
- Webhook `/webhook/refunds/create` fonctionnel
- Service `sendRefundToERP()`
- Table BDD `shopify_refunds`
- Tests retours validés
- Documentation workflow retours

**⚠️ ATTENTION** : Si l'endpoint Polaris n'existe pas, ce module ne peut pas être développé. Validation nécessaire AVANT démarrage.

---

#### 6. AJOUT POIDS VARIANTES (0.5 jour)

**Modifications** :

**a) Base de données** :
```sql
ALTER TABLE variant_options ADD COLUMN weight NUMERIC(10,2);
```

**b) Mapping Polaris → BDD** (`lib/syncLogic/products.js`) :
```javascript
// Ligne ~788
await client.query(`
  INSERT INTO variant_options (
    no_modele, sku, size, color, price, compare_at_price, nom_variante, weight
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (sku)
  DO UPDATE SET
    price = EXCLUDED.price,
    compare_at_price = EXCLUDED.compare_at_price,
    nom_variante = EXCLUDED.nom_variante,
    weight = EXCLUDED.weight
`, [
  productERPData.NoModele,
  size.Refs[0],
  size.Taille,
  productERPData.Niveau1.Nom,
  productERPData.PrixTTC,
  productERPData.PrixNormalTTC,
  productERPData.NomVariante,
  size.PoidsKg || null  // NOUVEAU
]);
```

**c) Mapping BDD → Shopify** :
```javascript
// Ligne ~334 et ~156
const variantData = {
  sku: variant.sku,
  price: variant.price?.toString(),
  weight: variant.weight,           // NOUVEAU
  weightUnit: "KILOGRAMS",          // NOUVEAU
  inventoryPolicy: "DENY",
  optionValues,
  inventoryItem: {
    tracked: true,
    sku: variant.sku,
  },
  inventoryQuantities,
  metafields
};
```

**Gestion unités** :
- Polaris : kg (supposé)
- Shopify : kg, g, lb, oz
- Conversion si nécessaire

**Livrables** :
- Colonne `weight` ajoutée
- Mapping Polaris → Shopify
- Tests avec produits réels

---

## 📅 PLANNING

### Planning détaillé (8 jours)

| Jour | Tâche |
|------|-------|
| J1 matin | Configuration environnements + credentials |
| J1 après-midi | Init BDD + config Shopify locations |
| J2 | Tests synchronisation produits |
| J3 matin | Tests commandes |
| J3 après-midi | Ajustements & corrections |
| J4 | Mise en production VPS + SSL |
| J5-J6 | Développement retours (webhook + service ERP) |
| J7 | Tests retours + ajout poids variantes |
| J8 | Tests finaux + documentation + formation |

**📆 Délai de livraison : 2 semaines** (10 jours ouvrés)

---

## 💰 TARIFICATION

### Détail des coûts

| Tâche | Durée | Taux jour | Coût |
|-------|-------|-----------|------|
| 1. Adaptation & configuration | 1.5 j | 500€ | 750€ |
| 2. Configuration Shopify multi-location | 0.5 j | 500€ | 250€ |
| 3. Tests & validation | 1.5 j | 500€ | 750€ |
| 4. Mise en prod VPS | 1 j | 500€ | 500€ |
| 5. Développement retours produits | 3 j | 500€ | 1 500€ |
| 6. Ajout poids variantes | 0.5 j | 500€ | 250€ |
| **TOTAL** | **8 jours** | | **4 000€ HT** |

### Optionnel : Phase de cadrage (+0.5 jour = +250€)

**Recommandé** pour valider AVANT engagement :
- ✅ Accès documentation Polaris
- ✅ Test API `/Catalog/Produits` avec produit réel
- ✅ **Vérification endpoint `/Ventes/Retour` existe** (critique)
- ✅ Analyse champs disponibles (poids, images, etc.)
- ✅ Rapport de faisabilité

**Prix cadrage : 250€ HT**

---

## 💼 PRIX TOTAL

### Option A : Sans cadrage préalable
**💰 4 000€ HT** (8 jours)

**⚠️ Risque** : Si endpoint retours Polaris n'existe pas, module retours non développable (-1 500€ remboursé = **2 500€ HT**)

---

### Option B : Avec cadrage préalable (RECOMMANDÉ)
**💰 4 250€ HT** (8.5 jours)

**✅ Avantage** : Validation technique AVANT engagement, zéro surprise

---

## 🎁 OFFRE SPÉCIALE

**Si signature avant [DATE + 15 jours]** :

✅ **Cadrage OFFERT** (250€)
✅ **1 mois support OFFERT** (200€)

**Prix total : 4 000€ HT au lieu de 4 450€**

---

## 📋 CONDITIONS COMMERCIALES

### Paiement

**Option 1 : Échelonné** (recommandé)
- 40% à la commande : **1 600€**
- 40% à mi-projet (tests validés) : **1 600€**
- 20% à la livraison : **800€**

**Option 2 : 50/50**
- 50% à la commande : **2 000€**
- 50% à la livraison : **2 000€**

### Garanties

- ✅ **Correction bugs** : 30 jours après livraison
- ✅ **Support installation** : 4h incluses
- ✅ **Code source** : Livré sur GitHub privé
- ✅ **Documentation** : Technique + utilisateur

### Support maintenance (optionnel)

**200€ HT/mois** (sans engagement)

Inclus :
- Monitoring VPS
- Correction bugs mineurs
- Support email (réponse <48h)
- Mises à jour sécurité Node.js
- 1h d'ajustements/mois

### Exclusions

**Ce devis ne couvre PAS** :
- ❌ Hébergement VPS (20-40€/mois client)
- ❌ Ajout images/descriptions produits (géré par client dans Shopify)
- ❌ Formation équipe Shopify (hors connecteur)
- ❌ Migration données historiques
- ❌ Développements hors périmètre défini

---

## ⚠️ CLAUSE DE RISQUE - RETOURS

**Condition suspensive Module Retours** :

Le développement du module retours (1 500€) est **conditionné à l'existence** d'un endpoint Polaris fonctionnel pour les retours (ex: `/Ventes/Retour`).

**Si endpoint inexistant** :
- Option 1 : Gestion manuelle retours (formation client)
- Option 2 : Remboursement 1 500€ (prix final = **2 500€ HT**)

**✅ Validation recommandée lors de la phase de cadrage (offerte)**

---

## 📦 LIVRABLES FINAUX

### Code & Infrastructure
- ✅ Code source complet sur GitHub (branche dédiée)
- ✅ Base de données PostgreSQL configurée
- ✅ Application déployée sur VPS production
- ✅ PM2 configuré (auto-restart)
- ✅ SSL/HTTPS actif
- ✅ Webhooks Shopify configurés

### Documentation
- ✅ Guide installation/déploiement
- ✅ Guide utilisateur (lancement syncs, monitoring)
- ✅ Documentation technique (architecture, mappings)
- ✅ Procédure gestion retours
- ✅ FAQ troubleshooting

### Formation
- ✅ Session formation équipe (2h visio)
  - Utilisation scripts sync
  - Monitoring logs
  - Gestion erreurs courantes
  - Workflow retours

---

## 🚀 PROCHAINES ÉTAPES

### Pour démarrer

1. ✅ **Validation devis** (signature)
2. ✅ **Paiement acompte** (40% = 1 600€)
3. ✅ **Accès techniques fournis par client** :
   - URL API Polaris + API Key
   - Accès Shopify Admin
   - Accès VPS (SSH) si déjà provisionné
   - Liste codes magasins (nom + code Polaris)

4. ✅ **Kickoff meeting** (1h visio)
   - Validation planning
   - Questions/réponses
   - Lancement projet

### Questions client à préparer

1. Combien de boutiques physiques ? (codes magasins Polaris)
2. URL exacte API Polaris ? (ex: https://...polarisgestionmag.net:13543/api/WebConnect)
3. Volumétrie produits estimée ? (pour dimensionnement BDD)
4. VPS déjà provisionné ? (sinon, recommandation fournisseur)
5. Délai acceptation retours ? (14j, 30j ?)

---

## 📊 COMPARAISON AVANT/APRÈS

### Situation actuelle (manuelle)

❌ **Gestion produits** :
- Import manuel CSV Polaris → Shopify
- Mise à jour prix manuelle
- Synchronisation stocks manuelle (erreurs fréquentes)
- Temps : ~2-4h/jour

❌ **Gestion commandes** :
- Saisie manuelle commandes Shopify → Polaris
- Risques erreurs (adresse, SKU, quantités)
- Temps : ~15-30min/commande

❌ **Gestion retours** :
- Traitement 100% manuel
- Suivi Excel
- Temps : ~20min/retour

**💸 Coût mensuel main d'œuvre** : ~40-60h/mois = **600-900€/mois**

---

### Situation future (automatisée)

✅ **Gestion produits** :
- Synchronisation auto toutes les heures
- Détection changements prix/stocks
- Zéro intervention manuelle
- Temps : 0h/jour

✅ **Gestion commandes** :
- Envoi automatique vers Polaris (temps réel)
- Zéro erreur de saisie
- Temps : 0min/commande

✅ **Gestion retours** :
- Envoi automatique vers Polaris
- Tracking BDD
- Temps : 0min/retour

**💸 Coût mensuel** : 200€ support (optionnel) + 30€ VPS = **230€/mois**

**💰 Économie mensuelle : 370-670€/mois**
**💰 ROI : 6-11 mois**

---

## ✍️ VALIDATION DEVIS

**Entreprise** : ___________________________________

**Nom du signataire** : ___________________________________

**Fonction** : ___________________________________

**Date** : ___________________________________

**Signature** :


**Option choisie** :
☐ **Option A : 4 000€ HT** (sans cadrage, risque retours)
☐ **Option B : 4 250€ HT** (avec cadrage, sécurisé) - **RECOMMANDÉ**

**Modalité de paiement** :
☐ Échelonné 40/40/20 (recommandé)
☐ 50/50

**Support maintenance optionnel** :
☐ Oui (200€ HT/mois)
☐ Non

**Offre spéciale (signature avant [DATE])** :
☐ Oui → **4 000€ HT tout inclus** (cadrage + 1 mois support OFFERTS)

---

**Contact** :
Email : [votre-email@exemple.com]
Téléphone : [+33 X XX XX XX XX]

**Validité de l'offre** : 15 jours à compter du [DATE]

---

*Devis basé sur le connecteur Polaris-Shopify existant (85% réutilisable)*
*Version 2.0 - Réaliste & Adapté*
