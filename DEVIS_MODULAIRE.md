# DEVIS MODULAIRE - Connecteur Polaris ERP ↔ Shopify
## Client : [Nom client - Vente de chaussures]

---

## 📋 RÉSUMÉ EXÉCUTIF

**Projet** : Développement d'un connecteur bidirectionnel entre l'ERP Polaris et la boutique Shopify pour automatiser la synchronisation des produits, prix, stocks et commandes.

**Avantages** :
- ✅ **Code existant réutilisable à 80%** : Gain de temps significatif
- ✅ **Architecture éprouvée** : Déjà en production chez un autre client
- ✅ **Infrastructure documentée** : Docker, PM2, PostgreSQL
- ✅ **Déploiement automatisé** : CI/CD GitHub Actions

**Durée estimée totale** : 10 à 33 jours selon modules choisis
**Budget estimé** : 5 000€ à 16 500€ selon modules choisis

---

## 🎯 MODULE 1 : BASE FONCTIONNELLE (OBLIGATOIRE)

### Périmètre fonctionnel

#### ✅ Synchronisation Produits (Polaris → Shopify)
- Import automatique des produits depuis l'ERP Polaris
- Gestion des variantes multi-dimensionnelles :
  - **Tailles** : 35, 36, 37, 38, 39, 40, 41, 42, etc.
  - **Couleurs** : Noir, Blanc, Marron, etc.
  - **SKU uniques** : par combinaison taille/couleur
- Prix TTC et prix barrés (promotions)
- Stocks multi-magasins :
  - Mapping via metafields `code_magasin`
  - Synchronisation des disponibilités par point de vente
- Détection automatique des changements (prix, stocks)
- Création/mise à jour des produits dans Shopify

#### ✅ Synchronisation Commandes (Shopify → Polaris)
- Réception temps réel via webhooks Shopify
- Récupération automatique du magasin assigné
- Transformation format Shopify → format Polaris
- Envoi vers l'API Polaris `/Ventes/Vente`
- Déduplication (évite les doublons)
- Tracking des commandes envoyées

#### ✅ Gestion Suppression
- Webhook produits supprimés dans Shopify
- Suppression en cascade (produit + variants + stocks)

#### ✅ Infrastructure technique
- Serveur API Express.js (Node.js)
- Base de données PostgreSQL
- Authentification sécurisée (API Keys, HMAC webhooks)
- Gestion du throttling API Shopify
- Scripts de synchronisation manuelle
- Scripts d'initialisation/migration BDD

### Champs Polaris mappés

**Produits (13 champs)** :
- NoModele, Libelle, Marque.Nom, Classification.Nom
- PrixTTC, PrixNormalTTC, NomVariante
- Niveau1.Nom (couleur), Tailles[].Taille, Tailles[].Refs[0] (SKU)
- Tailles[].Magasins[].CodeMagasin, Tailles[].Magasins[].Dispo
- DerniereChangement

**Commandes (16 champs)** :
- Informations client : Nom, Prénom, Email, Adresse complète
- Lignes de commande : SKU, Quantité, Prix, Remises
- Code magasin, Date vente, Montant total

### Livrables

- ✅ Code source complet (GitHub)
- ✅ Base de données PostgreSQL configurée
- ✅ Documentation technique complète
- ✅ Scripts de déploiement
- ✅ Configuration environnements (dev/test/prod)
- ✅ Support installation (2h incluses)

### Durée et tarif

| Tâche | Durée | Détail |
|-------|-------|--------|
| Configuration projet | 1 jour | Clonage, adaptation credentials, environnements |
| Tests synchronisation produits | 2 jours | Import ERP, création Shopify, vérification stocks |
| Tests commandes | 1 jour | Webhooks, envoi ERP, déduplication |
| Ajustements & corrections | 2 jours | Mapping spécifique client, bugs |
| Documentation & formation | 1 jour | Guide utilisateur, formation équipe |
| **TOTAL MODULE 1** | **7 jours** | **Taux journalier : 500€** |

**💰 Prix Module 1 : 3 500€ HT**

---

## 🔧 MODULE 2 : RETOURS PRODUITS (OPTIONNEL)

### Périmètre fonctionnel

#### ✅ Synchronisation Retours (Shopify → Polaris)
- Webhook `refunds/create` de Shopify
- Récupération de la commande originale
- Extraction des produits retournés
- Envoi vers l'API Polaris (endpoint à valider)
- Remise en stock automatique (si applicable)
- Tracking des retours traités

### Workflow

```
1. Client demande retour sur Shopify
2. Webhook déclenché → API Node.js
3. Récupération détails retour (SKU, quantités, motif)
4. Envoi vers Polaris /Ventes/Retour (ou équivalent)
5. Mise à jour stocks Shopify si remise en stock
6. Enregistrement en BDD (éviter doublons)
```

### Gestion des cas

- Retour partiel vs complet
- Retour avec remise en stock vs sans (produit défectueux)
- Retour hors délai (configurable)
- Produit plus en catalogue

### Livrables

- ✅ Endpoint webhook `/webhook/refunds/create`
- ✅ Service `sendRefundToERP()`
- ✅ Table BDD `shopify_refunds`
- ✅ Tests scénarios retours
- ✅ Documentation workflow retours

### Prérequis CRITIQUES

⚠️ **Ce module nécessite la validation préalable de :**

1. **Endpoint Polaris pour retours existe ?**
   - `/Ventes/Retour` ou équivalent
   - Format de payload attendu
   - Codes retour acceptés

2. **Workflow retours client**
   - Délai acceptation retours (14j, 30j ?)
   - Remise en stock systématique ?
   - Gestion produits défectueux

**🚨 IMPORTANT** : Si l'endpoint Polaris n'existe pas ou n'est pas accessible, ce module **ne pourra pas être développé** dans sa version automatisée. Une solution manuelle devra être envisagée.

### Durée et tarif

| Tâche | Durée | Détail |
|-------|-------|--------|
| Analyse endpoint Polaris retours | 0.5 jour | Tests API, validation format |
| Développement webhook Shopify | 1 jour | Réception, parsing, validation |
| Service envoi ERP | 1.5 jour | Transformation données, gestion erreurs |
| Gestion stocks | 1 jour | Remise en stock, cas limites |
| Tests complets | 1 jour | Scénarios retour partiel/complet/défectueux |
| **TOTAL MODULE 2** | **5 jours** | **Taux journalier : 500€** |

**💰 Prix Module 2 : 2 500€ HT**

---

## 📸 MODULE 3 : IMAGES PRODUITS (OPTIONNEL)

### Périmètre fonctionnel

#### ✅ Synchronisation Images (Polaris → Shopify)
- Récupération URLs images depuis Polaris
- Téléchargement des images
- Upload vers Shopify via GraphQL `productCreateMedia`
- Gestion ordre des images (principale vs galerie)
- Gestion du throttling Shopify (limite 50 images/min)
- Retry automatique en cas d'échec

### Gestion des cas

- Multiple images par produit
- Image principale vs images secondaires
- Formats supportés : JPG, PNG, WebP
- Validation URLs (accessibilité)
- Gestion erreurs (image corrompue, URL morte)

### Infrastructure additionnelle (optionnelle)

Si les images Polaris ne sont pas accessibles publiquement :
- **CDN/Stockage S3** : ~10-30€/mois
- Service proxy d'images

### Livrables

- ✅ Fonction `uploadImagesToShopify()`
- ✅ Gestion queue d'upload (throttling)
- ✅ Logs upload (succès/échecs)
- ✅ Colonne BDD `images` (JSONB)
- ✅ Tests avec images réelles

### Prérequis CRITIQUES

⚠️ **Ce module nécessite la validation préalable de :**

1. **Polaris fournit des URLs d'images ?**
   - Format : `Images: [{ Url: "https://...", Ordre: 1 }]`
   - URLs accessibles publiquement (pas d'auth)

2. **Ou fichiers binaires ?**
   - Si binaires → besoin CDN (coût infra +10-30€/mois)

**🚨 IMPORTANT** : Tester l'API Polaris AVANT engagement pour vérifier disponibilité images.

### Durée et tarif

| Tâche | Durée | Détail |
|-------|-------|--------|
| Analyse format images Polaris | 0.5 jour | Tests API, validation URLs |
| Développement download images | 1 jour | Téléchargement, validation format |
| Upload Shopify GraphQL | 1.5 jour | Mutation media, gestion throttling |
| Gestion ordre & retry | 0.5 jour | Image principale, retry logic |
| Tests performance | 0.5 jour | 100+ produits avec images multiples |
| **TOTAL MODULE 3** | **4 jours** | **Taux journalier : 500€** |

**💰 Prix Module 3 : 2 000€ HT**

**💰 Prix Module 3 + CDN (si nécessaire) : 2 200€ HT + 10-30€/mois**

---

## 📝 MODULE 4 : DESCRIPTIONS PRODUITS (OPTIONNEL)

### Périmètre fonctionnel

#### ✅ Synchronisation Descriptions (Polaris → Shopify)
- Récupération descriptions depuis Polaris
- Nettoyage HTML (sanitization XSS)
- Conversion Markdown → HTML (si besoin)
- Mapping vers `product.descriptionHtml` Shopify
- Préservation formatage (gras, italique, listes)

### Gestion des formats

**Si Polaris fournit HTML** :
- Sanitization (retirer scripts malveillants)
- Garder images inline
- Fixer URLs relatives

**Si Polaris fournit texte brut** :
- Conversion auto-paragraphes
- Préservation retours à la ligne

### Librairies utilisées

```json
{
  "sanitize-html": "^2.11.0",  // Nettoyage HTML
  "turndown": "^7.1.2"          // Markdown si besoin
}
```

### Livrables

- ✅ Fonction `sanitizeDescription()`
- ✅ Colonne BDD `description` (TEXT)
- ✅ Mapping dans mutations Shopify
- ✅ Tests formats HTML/texte

### Durée et tarif

| Tâche | Durée | Détail |
|-------|-------|--------|
| Analyse format descriptions Polaris | 0.5 jour | Tests API, identification format |
| Développement sanitization | 1 jour | Nettoyage HTML, conversion |
| Integration Shopify | 0.5 jour | Mapping descriptionHtml |
| Tests qualité | 0.5 jour | Vérification rendu Shopify |
| **TOTAL MODULE 4** | **2.5 jours** | **Taux journalier : 500€** |

**💰 Prix Module 4 : 1 250€ HT**

---

## 🔐 MODULE 5 : DONNÉES AVANCÉES (OPTIONNEL)

### Périmètre fonctionnel

#### ✅ Champs additionnels

**Produits** :
- Code barre (barcode) → `variant.barcode`
- Poids (weight) → `variant.weight` + `variant.weightUnit`
- Tags / Collections → `product.tags`

**Commandes** :
- Téléphone client → `Client.Telephone.Numero`
- Note commande → `Memo`
- Frais de port → `FraisPort` (si Polaris l'accepte)
- Mode de livraison → `ModeLivraison`

### Livrables

- ✅ Colonnes BDD additionnelles
- ✅ Mappings Polaris → Shopify
- ✅ Tests validation données

### Durée et tarif

| Tâche | Durée | Détail |
|-------|-------|--------|
| Code barre | 0.5 jour | Mapping + tests |
| Poids | 0.5 jour | Conversion unités (kg/g/lb) |
| Téléphone client | 0.2 jour | Mapping simple |
| Frais de port & livraison | 1 jour | Validation format Polaris |
| Tags / Collections | 0.5 jour | Mapping + catégorisation |
| **TOTAL MODULE 5** | **2.7 jours** | **Taux journalier : 500€** |

**💰 Prix Module 5 (complet) : 1 350€ HT**

**💰 Prix Module 5 (téléphone uniquement) : 100€ HT**

---

## 🔍 MODULE 6 : PHASE DE CADRAGE (RECOMMANDÉ)

### Périmètre

**Objectif** : Valider AVANT développement que toutes les données nécessaires sont disponibles dans l'API Polaris.

#### ✅ Actions

1. **Accès documentation Polaris complète**
   - Swagger/OpenAPI à `https://nur8.pl-vtest2-1221.polarisgestionmag.net:13543/api/WebConnect`
   - Liste exhaustive des endpoints
   - Schémas de données

2. **Tests API réels**
   - Appel `GET /Catalog/Produits` avec produit chaussure réel
   - Analyse structure JSON complète
   - Identification champs disponibles vs manquants

3. **Validation endpoints critiques**
   - `/Catalog/Produits` - produits ✅
   - `/Ventes/Vente` - commandes ✅
   - `/Ventes/Retour` - retours ❓ (à vérifier)

4. **Mapping complet**
   - Liste tous les champs Polaris disponibles
   - Recommandations champs à utiliser
   - Identification bloqueurs éventuels

5. **Rapport de cadrage**
   - Document détaillé (10-15 pages)
   - Faisabilité technique validée
   - Recommandations modules à retenir
   - Ajustement devis si nécessaire

### Livrables

- ✅ Rapport de cadrage technique (PDF)
- ✅ Tableau mapping exhaustif Polaris ↔ Shopify
- ✅ Capture d'écran réponses API réelles
- ✅ Recommandations priorisées
- ✅ Devis ajusté selon findings

### Durée et tarif

| Tâche | Durée | Détail |
|-------|-------|--------|
| Accès & analyse doc Polaris | 0.5 jour | Swagger, schémas API |
| Tests API réels | 0.5 jour | Appels GET/POST, analyse réponses |
| Rédaction rapport | 0.5 jour | Synthèse, recommandations |
| **TOTAL MODULE 6** | **1.5 jour** | **Taux journalier : 500€** |

**💰 Prix Module 6 : 750€ HT**

**🎁 OFFERT si commande Module 1 + 2 autres modules**

---

## 📊 RÉCAPITULATIF BUDGÉTAIRE

### Scénarios recommandés

#### 🥉 SCÉNARIO MINIMAL (Cahier des charges strict)

**Modules inclus** :
- ✅ Module 1 : Base fonctionnelle (obligatoire)
- ✅ Module 2 : Retours produits
- ✅ Module 5 : Téléphone client uniquement

**Durée totale** : 12.2 jours
**💰 Prix total : 6 100€ HT**

**Avantages** :
- Répond exactement au cahier des charges
- Budget maîtrisé
- Images ajoutées manuellement dans Shopify

---

#### 🥈 SCÉNARIO STANDARD (Recommandé e-commerce)

**Modules inclus** :
- ✅ Module 1 : Base fonctionnelle
- ✅ Module 2 : Retours produits
- ✅ Module 3 : Images produits
- ✅ Module 5 : Téléphone client
- ✅ Module 6 : Phase de cadrage (OFFERT)

**Durée totale** : 16.2 jours
**💰 Prix total : 8 100€ HT** (au lieu de 8 850€)

**Avantages** :
- Synchronisation complète produits avec visuels
- Meilleur taux de conversion (images)
- Cadrage offert = sécurité technique

---

#### 🥇 SCÉNARIO PREMIUM (Complet + optimisé SEO)

**Modules inclus** :
- ✅ Module 1 : Base fonctionnelle
- ✅ Module 2 : Retours produits
- ✅ Module 3 : Images produits
- ✅ Module 4 : Descriptions produits
- ✅ Module 5 : Données avancées (complet)
- ✅ Module 6 : Phase de cadrage (OFFERT)

**Durée totale** : 21.7 jours
**💰 Prix total : 10 850€ HT** (au lieu de 11 600€)

**Avantages** :
- Solution 100% automatisée
- SEO optimisé (descriptions)
- Données logistiques (poids, codes barres)
- Meilleure expérience client

---

### Tableau comparatif

| Fonctionnalité | Minimal | Standard | Premium |
|----------------|---------|----------|---------|
| Produits + Prix + Stocks | ✅ | ✅ | ✅ |
| Commandes automatiques | ✅ | ✅ | ✅ |
| Retours automatiques | ✅ | ✅ | ✅ |
| Images produits | ❌ Manuel | ✅ Auto | ✅ Auto |
| Descriptions SEO | ❌ | ❌ | ✅ |
| Téléphone client | ✅ | ✅ | ✅ |
| Code barre + Poids | ❌ | ❌ | ✅ |
| Frais de port | ❌ | ❌ | ✅ |
| Phase de cadrage | ❌ | ✅ Offert | ✅ Offert |
| **Prix HT** | **6 100€** | **8 100€** | **10 850€** |
| **Durée** | **12 jours** | **16 jours** | **22 jours** |

---

## 📅 PLANNING PRÉVISIONNEL

### Scénario STANDARD (16 jours)

#### Semaine 1-2 : Configuration & Tests
- **J1-2** : Phase de cadrage (validation API Polaris)
- **J3** : Configuration projet (credentials, BDD, environnements)
- **J4-5** : Tests synchronisation produits (import, création, stocks)
- **J6** : Tests commandes (webhooks, envoi ERP)

#### Semaine 3 : Modules additionnels
- **J7-10** : Développement images produits
- **J11** : Tests images

#### Semaine 4 : Retours & Livraison
- **J12-15** : Développement retours produits
- **J16** : Tests finaux, documentation, formation

**📆 Livraison estimée : 4 semaines** (si démarrage immédiat)

---

## 💼 CONDITIONS COMMERCIALES

### Modalités de paiement

**Option A : Paiement échelonné**
- 30% à la commande (validation devis)
- 40% à mi-parcours (Module 1 livré et testé)
- 30% à la livraison finale (tous modules validés)

**Option B : Paiement par module**
- Paiement à la livraison de chaque module
- Flexibilité ajout/retrait modules en cours de route

### Garanties

- ✅ **Garantie correction bugs** : 30 jours après livraison
- ✅ **Support installation** : 2h incluses dans Module 1
- ✅ **Code source** : Livré complet sur repository GitHub privé
- ✅ **Documentation** : Technique + utilisateur

### Support maintenance (optionnel)

**Forfait mensuel recommandé** : 250€ HT/mois

Inclus :
- Monitoring serveur VPS
- Correction bugs mineurs
- Ajustements mappings (<1h/mois)
- Support technique par email (réponse <48h)
- Mise à jour dépendances Node.js (sécurité)

Non inclus :
- Nouvelles fonctionnalités majeures
- Migration infrastructure
- Formation additionnelle

### Exclusions

**Ce devis ne couvre PAS** :
- Hébergement VPS (estimé 20-40€/mois, à la charge du client)
- Configuration Shopify initiale (création locations, metafields)
- Accès API Polaris (API Key fournie par le client)
- Migration données historiques (produits/commandes existantes)
- Développements custom hors périmètre modules

---

## ⚠️ CLAUSES DE RISQUE & MITIGATION

### Risques techniques identifiés

#### 🔴 RISQUE 1 : Endpoint retours Polaris inexistant

**Probabilité** : Moyenne (30%)
**Impact** : Bloquant pour Module 2

**Mitigation** :
- ✅ Validation lors Phase de cadrage (Module 6)
- ✅ Si absent : proposition solution manuelle
- ✅ Remboursement Module 2 si blocage technique confirmé

---

#### 🔴 RISQUE 2 : Images Polaris non accessibles

**Probabilité** : Faible (10%)
**Impact** : Bloquant pour Module 3

**Mitigation** :
- ✅ Validation lors Phase de cadrage
- ✅ Si URLs privées : proposition CDN proxy (+10-30€/mois)
- ✅ Si aucune image : gestion manuelle Shopify

---

#### 🟡 RISQUE 3 : Codes paiement incompatibles

**Probabilité** : Moyenne (20%)
**Impact** : Moyen (erreurs comptables)

**Mitigation** :
- ✅ Table mapping custom codes paiement
- ✅ Fallback "CC" pour méthodes inconnues
- ✅ Documentation mapping client

---

#### 🟡 RISQUE 4 : Volumétrie élevée (>10 000 produits)

**Probabilité** : Faible (5%)
**Impact** : Performance dégradée

**Mitigation** :
- ✅ Pagination déjà gérée (1000 produits/batch)
- ✅ Throttling Shopify implémenté
- ✅ Si >50 000 produits : ajustements techniques (+1-2 jours)

---

### Conditions de résiliation

**Clause de sortie anticipée** :
- Résiliation possible après livraison de chaque module
- Paiement des modules livrés uniquement
- Délai de préavis : 7 jours

**Clause de suspension** :
- Projet suspendable si blocage technique API Polaris
- Reprise possible sous 6 mois sans surcoût
- Frais déjà engagés dus

---

## 📞 PROCHAINES ÉTAPES

### Pour démarrer le projet

1. **Validation devis** : Choix du scénario (Minimal/Standard/Premium)
2. **Signature contrat** : Conditions commerciales
3. **Accès techniques** :
   - URL API Polaris complète
   - API Key Polaris (test + production)
   - Accès Shopify Admin (création Access Token)
   - Accès serveur VPS (si déjà provisionné)

4. **Kickoff meeting** (visio 1h) :
   - Présentation équipe
   - Validation planning
   - Réponses questions techniques

### Questions à préparer AVANT démarrage

**Pour le client** :
1. Combien de magasins physiques ? (codes magasins Polaris)
2. Combien de produits estimés ? (volumétrie)
3. Méthodes de paiement Shopify utilisées ? (CB, PayPal, virement ?)
4. Délai acceptation retours ? (14j, 30j ?)
5. Images déjà dans Polaris ? (URL accessible ?)

**Tests nécessaires** :
1. Appel API Polaris `/Catalog/Produits` avec 1 produit chaussure réel
2. Vérification endpoint `/Ventes/Retour` (existe ?)
3. Liste codes paiement acceptés par Polaris

---

## 🎁 OFFRE DE LANCEMENT

**Valable jusqu'au [DATE + 30 jours]**

### Bonus si commande Scénario STANDARD ou PREMIUM

- ✅ **Phase de cadrage OFFERTE** (valeur 750€)
- ✅ **1 mois de support maintenance OFFERT** (valeur 250€)
- ✅ **Formation équipe 2h** (visio incluse)

**Total avantages : 1 000€ HT**

---

## 📄 ANNEXES

### A. Stack technique

**Backend** :
- Node.js 18+ (LTS)
- Express.js 4.x
- PostgreSQL 15
- PM2 (process manager)

**APIs** :
- Polaris ERP REST API
- Shopify GraphQL Admin API (2025-01)

**Infrastructure** :
- VPS Linux (Ubuntu 22.04 LTS)
- Docker Compose (PostgreSQL)
- GitHub Actions (CI/CD)
- SSL/TLS (Let's Encrypt)

### B. Sécurité

- ✅ Vérification HMAC webhooks Shopify (SHA256)
- ✅ API Keys stockées en variables d'environnement
- ✅ Transactions SQL (évite corruption données)
- ✅ Retry logic (résilience pannes réseau)
- ✅ Logs structurés (audit trail)

### C. Conformité

- ✅ RGPD : Données clients chiffrées en BDD
- ✅ PCI-DSS : Aucune donnée bancaire stockée
- ✅ Shopify compliance : Utilisation API officielle
- ✅ Code source : Licence MIT (réutilisable)

---

## ✍️ VALIDATION DEVIS

**Entreprise** : ___________________________________

**Nom du signataire** : ___________________________________

**Fonction** : ___________________________________

**Date** : ___________________________________

**Signature** :


**Scénario choisi** :
☐ Minimal (6 100€ HT)
☐ Standard (8 100€ HT) - **RECOMMANDÉ**
☐ Premium (10 850€ HT)
☐ Sur-mesure (modules à la carte)

**Modules additionnels à la carte** :
- ☐ Module 2 : Retours (+2 500€)
- ☐ Module 3 : Images (+2 000€)
- ☐ Module 4 : Descriptions (+1 250€)
- ☐ Module 5 : Données avancées (+1 350€)
- ☐ Module 6 : Phase de cadrage (+750€)

**Support maintenance** :
☐ Oui (250€ HT/mois)
☐ Non

---

**Contact** :
Email : [votre-email@exemple.com]
Téléphone : [+33 X XX XX XX XX]
Site web : [www.votre-site.com]

**Validité de l'offre** : 30 jours à compter du [DATE]

---

*Document généré le [DATE] - Version 1.0*
*Devis basé sur l'analyse technique complète du connecteur Polaris-Shopify existant*
