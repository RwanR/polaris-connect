# BRIEF TECHNIQUE - Connecteur Polaris ERP ↔ Shopify

## 📋 RÉSUMÉ EXÉCUTIF

**OUI, cette application est bien un connecteur bidirectionnel entre l'ERP Polaris et Shopify.**

Elle synchronise :
- **Polaris → Shopify** : Produits, prix, stocks multi-magasins
- **Shopify → Polaris** : Commandes clients

**OUI, ce code peut servir de base pour recréer un connecteur Polaris-Shopify pour votre client vendeur de chaussures.**

---

## 🎯 OBJECTIF DE L'APPLICATION

Cette application nommée "Owlblack Connector ERP" est un **middleware de synchronisation** qui :

1. **Import des produits** : Récupère les produits depuis l'API Polaris et les crée/met à jour dans Shopify
2. **Gestion des stocks multi-magasins** : Synchronise les stocks disponibles pour chaque point de vente
3. **Gestion des prix** : Prix TTC et prix comparatif (prix barré)
4. **Envoi des commandes** : Transmet les commandes Shopify vers l'ERP Polaris en temps réel via webhooks
5. **Suppression en cascade** : Gère la suppression de produits

---

## 🏗️ ARCHITECTURE GLOBALE

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   ERP POLARIS   │◄────────│  CONNECTEUR NODE.JS  │────────►│    SHOPIFY      │
│                 │  HTTPS  │                      │  GraphQL│                 │
│  - Produits     │         │  - Express API       │         │  - Products     │
│  - Stocks       │         │  - PostgreSQL        │         │  - Variants     │
│  - Ventes       │         │  - Sync Scripts      │         │  - Inventory    │
└─────────────────┘         │  - Webhooks          │         │  - Orders       │
                            └──────────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌──────────────────────┐
                            │   PostgreSQL DB      │
                            │                      │
                            │  - products          │
                            │  - variant_options   │
                            │  - stock_by_store    │
                            │  - shopify_orders    │
                            └──────────────────────┘
```

---

## 📂 STRUCTURE DES FICHIERS ET RESPONSABILITÉS

### 🔹 `/api` - Serveur API Express

#### **`/api/index.js`** - Point d'entrée principal
- Démarre le serveur Express sur le port 3000
- Configure middleware (morgan pour logs, express.raw pour webhooks)
- Route `/webhook` → shopifyRoutes

#### **`/api/routes/shopify.js`** - Routes webhooks Shopify
**3 endpoints principaux :**

| Endpoint | Méthode | Trigger Shopify | Action |
|----------|---------|-----------------|--------|
| `/webhook/products/delete` | POST | Product deletion | Supprime produit + variants + stocks en cascade |
| `/webhook/orders/create` | POST | Order created | Récupère le code magasin et envoie la commande à l'ERP |
| `/webhook/orders/delete` | POST | Order cancelled | Marque la commande comme supprimée en BDD |

**Flux de création de commande :**
1. Vérifie signature HMAC Shopify
2. Vérifie si commande déjà envoyée (évite les doublons)
3. Récupère le `code_magasin` depuis les metafields de location
4. Transforme les données Shopify → format ERP
5. Envoie à l'API Polaris `/Ventes/Vente`
6. Enregistre en BDD avec statut "Envoyé"

#### **`/api/services/erpService.js`** - Service d'envoi des commandes vers Polaris

**Méthode principale : `sendOrderToERP(codeMagasin, orderData)`**

**Endpoint Polaris utilisé :**
```
POST {ERP_URL}/Ventes/Vente
Headers: X-API-Key
```

**Structure du payload envoyé à Polaris :**
```javascript
{
  RefExt: "1234",                    // Numéro commande Shopify
  TypeVenteInternet: "Site",
  Client: {
    Nom: "Dupont",
    Prenom: "Jean",
    Telephone: { Numero: "" },
    Mobile: { Numero: "" },
    Adresse: {
      Nom: "Jean Dupont",
      Adresse1: "123 rue Example",
      CodePostal: "75001",
      Ville: "Paris",
      CodePays: "FR"
    },
    Mail: "jean@example.com",
    RefsExt: ["1234"]
  },
  CodeMagasin: "101",               // Code du magasin
  DateVente: "2025-11-16T10:00:00Z",
  Details: [
    {
      SKU: "REF-123-40",
      Qte: 2,
      MontantTTC: 89.90,
      RemiseTTC: 0,
      TypeRemise: "Normal"
    }
  ],
  Reglements: [
    {
      Code: "CC",                   // Carte de crédit
      Montant: 179.80
    }
  ]
}
```

#### **`/api/services/dbService.js`** - Service base de données

**Méthodes principales :**

| Méthode | Description |
|---------|-------------|
| `deleteProductCascade(shopifyProductId)` | Supprime produit + variants + stocks (transaction SQL) |
| `orderCreate(orderId, status)` | Enregistre une commande avec statut |
| `getOrderDataById(order_id)` | Récupère une commande par ID |
| `orderDelete(orderId)` | Marque une commande comme "Supprimé" |

#### **`/api/utils/verifyShopify.js`** - Sécurité webhooks

Vérifie la signature HMAC-SHA256 des webhooks Shopify pour s'assurer qu'ils proviennent bien de Shopify.

---

### 🔹 `/lib` - Logique métier et clients API

#### **`/lib/erpClient/products.js`** - Client API Polaris pour les produits

**Méthode : `fetchProductsFromERP(fromCursor, DerniereDateChangement, nb)`**

**Endpoint Polaris utilisé :**
```
GET {ERP_URL}/Catalog/Produits?filtreProduit={...}&pager={...}
Headers: X-API-Key
```

**Paramètres :**
- `filtreProduit` : Filtre JSON (ex: dernière date de modification)
- `pager` :
  - `TI: true` (Total Items)
  - `Nb: 1000` (nombre d'items par page)
  - `From: "cursor"` (pagination)

**Structure de réponse Polaris :**
```javascript
{
  Items: [
    {
      NoModele: 12345,
      Libelle: "Basket Sport Air",
      Marque: { Nom: "Nike" },
      Classification: { Nom: "Chaussures Sport" },
      PrixTTC: 89.90,
      PrixNormalTTC: 119.90,
      DerniereChangement: "2025-11-15T14:30:00Z",
      Niveau1: { Nom: "Noir" },      // Couleur
      NomVariante: "Basket Sport Air - Noir",
      Tailles: [
        {
          Taille: "40",
          Refs: ["REF-12345-40"],      // SKU
          Magasins: [
            {
              CodeMagasin: 101,
              Dispo: 5                  // Stock disponible
            },
            {
              CodeMagasin: 102,
              Dispo: 3
            }
          ]
        },
        {
          Taille: "41",
          Refs: ["REF-12345-41"],
          Magasins: [...]
        }
      ]
    }
  ],
  PagerNext: {
    From: "nextCursor"
  }
}
```

#### **`/lib/syncLogic/products.js`** - Logique de synchronisation

**C'est le CŒUR du connecteur** - 858 lignes de code

**Méthodes principales :**

##### 1. `syncProductsFromERPToBDD()`
Synchronise ERP → Base de données locale

**Flux :**
```
1. Boucle sur fetchProductsFromERP() avec pagination (1000 produits/batch)
2. Pour chaque produit :
   - upsertProducts() : Insère/met à jour le produit
   - Pour chaque taille :
     - upsertVariantOptions() : Insère/met à jour variant
     - Pour chaque magasin :
       - upsertStockByStore() : Insère/met à jour stock
```

**Détection des changements :**
- Compare prix, prix comparatif et stocks entre BDD et ERP
- Flag `to_send_to_shopify = true` si différence détectée

##### 2. `syncProductsFromBDDToShopify()`
Synchronise Base de données → Shopify

**Flux :**
```
1. Récupère locations Shopify avec leurs metafields (code_magasin)
2. Boucle sur les produits avec to_send_to_shopify = true (batch de 10)
3. Pour chaque produit :
   - Si nouveau → createShopifyVariants()
   - Si existant → updateShopifyVariant()
4. Gère le throttling API Shopify
```

##### 3. `createShopifyVariants(productData, variantOptions, locations)`

**GraphQL Mutation utilisée : `productSet`**

**Création de variantes :**
```javascript
{
  productOptions: [
    { name: "Taille", values: ["40", "41", "42"] },
    { name: "Couleur", values: ["Noir", "Blanc"] }  // Si présent
  ],
  variants: [
    {
      sku: "REF-12345-40",
      price: "89.90",
      compareAtPrice: "119.90",       // Prix barré
      inventoryPolicy: "DENY",        // Ne pas vendre si rupture
      optionValues: [
        { optionName: "Taille", name: "40" },
        { optionName: "Couleur", name: "Noir" }
      ],
      inventoryItem: {
        tracked: true,
        sku: "REF-12345-40"
      },
      inventoryQuantities: [
        { locationId: "gid://shopify/Location/123", name: "available", quantity: 5 },
        { locationId: "gid://shopify/Location/124", name: "available", quantity: 3 }
      ],
      metafields: [
        {
          namespace: "erp",
          key: "nom_variante",
          value: "Basket Sport Air - Noir",
          type: "single_line_text_field"
        }
      ]
    }
  ],
  metafields: [
    { namespace: "erp", key: "no_modele", value: "12345" },
    { namespace: "erp", key: "derniere_modification", value: "2025-11-15T14:30:00Z" }
  ]
}
```

**Endpoint GraphQL Shopify :**
```
POST https://{SHOPIFY_DOMAIN}/admin/api/2025-01/graphql.json
Headers: X-Shopify-Access-Token
```

##### 4. `updateShopifyVariant()` - Mise à jour d'un produit existant
Même structure que create, mais avec `id: shopify_product_id`

##### 5. `getShopifyOrderDetails(orderId)` - Récupération détails commande

**GraphQL Query :**
```graphql
query GetOrderFullData($orderId: ID!) {
  order(id: $orderId) {
    id
    fulfillmentOrders(first: 5) {
      edges {
        node {
          assignedLocation {
            location {
              id
              name
              metafield(namespace: "erp", key: "code_magasin") {
                value
              }
            }
          }
        }
      }
    }
  }
}
```

**Récupère le `code_magasin` depuis les metafields de la location assignée à la commande.**

##### 6. `getShopifyLocationsWithMetafields()` - Récupération des locations Shopify

**GraphQL Query :**
```graphql
query {
  locations(first: 50) {
    edges {
      node {
        id
        name
        metafields(first: 20) {
          edges {
            node {
              id
              namespace
              key
              value
              type
            }
          }
        }
      }
    }
  }
}
```

**Retourne toutes les locations avec leurs metafields (notamment `code_magasin`).**

**Gestion du throttling Shopify :**
```javascript
const costInfo = result.extensions?.cost;
if (currentlyAvailable < 300) {
  const missing = 300 - currentlyAvailable;
  const secondsToWait = Math.ceil(missing / restoreRate);
  await new Promise(resolve => setTimeout(resolve, secondsToWait * 1000));
}
```

---

### 🔹 `/scripts` - Scripts de maintenance

#### **`/scripts/syncProducts.js`** - Script manuel de synchronisation
Lance la synchronisation complète :
1. `syncProductsFromERPToBDD()` - ERP → BDD
2. `syncProductsFromBDDToShopify()` - BDD → Shopify

**Exécution :**
```bash
npm run sync-products-prod    # Production
npm run sync-products-test    # Test
npm run sync-products-dev     # Development
```

#### **`/scripts/init-db.js`** - Initialisation base de données
Crée toutes les tables nécessaires.

#### **`/scripts/update-db.js`** - Migration base de données
Ajoute colonne `nom_variante` à `variant_options`.

#### **`/scripts/delete-db.js`** - Suppression base de données
Supprime toutes les tables (DANGER).

---

## 🗄️ SCHÉMA DE BASE DE DONNÉES PostgreSQL

### **Table : `products`**
| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL PRIMARY KEY | ID auto-incrémenté |
| no_modele | INTEGER UNIQUE | Numéro de modèle Polaris (clé unique) |
| shopify_product_id | TEXT | ID produit Shopify (gid://shopify/Product/xxx) |
| title | TEXT | Titre du produit |
| vendor | TEXT | Marque (ex: "Nike") |
| product_type | TEXT | Type de produit (ex: "Chaussures Sport") |
| tags | TEXT[] | Tags (non utilisé actuellement) |
| erp_last_change | TEXT | Date dernière modification ERP |
| to_send_to_shopify | BOOLEAN | Flag de synchronisation vers Shopify |
| to_send_to_erp | BOOLEAN | Flag de synchronisation vers ERP (non utilisé) |
| deleted_in_erp | BOOLEAN | Produit supprimé de l'ERP |
| created_at | TIMESTAMPTZ | Date création |
| updated_at | TIMESTAMPTZ | Date mise à jour |

### **Table : `variant_options`**
| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL PRIMARY KEY | ID auto-incrémenté |
| no_modele | INTEGER | Référence au produit |
| sku | TEXT UNIQUE | SKU unique (ex: "REF-12345-40") |
| size | TEXT | Taille (ex: "40") |
| color | TEXT | Couleur (ex: "Noir") |
| price | NUMERIC(10,2) | Prix TTC |
| compare_at_price | NUMERIC(10,2) | Prix normal TTC (prix barré) |
| nom_variante | TEXT | Nom de la variante |
| updated_at | TIMESTAMPTZ | Date mise à jour |

**Contraintes :**
- `UNIQUE(size, color, no_modele)` - Une seule variante par combinaison taille/couleur/produit

### **Table : `stock_by_store`**
| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL PRIMARY KEY | ID auto-incrémenté |
| sku | TEXT | Référence au variant |
| code_magasin | INTEGER | Code du magasin Polaris |
| dispo | INTEGER | Stock disponible |
| updated_at | TIMESTAMPTZ | Date mise à jour |

**Contraintes :**
- `UNIQUE(sku, code_magasin)` - Un seul stock par SKU et magasin

### **Table : `shopify_orders`**
| Colonne | Type | Description |
|---------|------|-------------|
| order_id | BIGINT PRIMARY KEY | ID commande Shopify |
| status | TEXT | Statut ("En cours", "Envoyé", "Supprimé") |

**Usage :** Éviter les doublons d'envoi de commandes vers l'ERP.

### **Table : `sync_status`**
| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL PRIMARY KEY | ID auto-incrémenté |
| source | TEXT UNIQUE | Source de sync ("erp") |
| last_sync | TIMESTAMPTZ | Date dernière synchronisation |

**Usage :** Track la dernière synchronisation (non utilisé activement).

### **Table : `clients`** (non implémenté)
Structure prête mais pas de code de synchronisation client.

---

## 🔄 FLUX DE DONNÉES COMPLETS

### **FLUX 1 : Synchronisation Produits (ERP → Shopify)**

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : Script manuel ou CRON                                │
│  npm run sync-products-prod                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : syncProductsFromERPToBDD()                           │
│  /lib/syncLogic/products.js                                     │
│                                                                  │
│  1. Boucle pagination (1000 produits/batch)                     │
│     fetchProductsFromERP() → GET {ERP_URL}/Catalog/Produits     │
│                                                                  │
│  2. Pour chaque produit :                                       │
│     a) upsertProducts(productERPData)                           │
│        - Détecte changements (prix, stock)                      │
│        - Flag to_send_to_shopify si changement                  │
│        - INSERT/UPDATE products                                 │
│                                                                  │
│     b) Pour chaque Taille :                                     │
│        upsertVariantOptions(productERPData, size)               │
│        - INSERT/UPDATE variant_options                          │
│                                                                  │
│     c) Pour chaque Magasin :                                    │
│        upsertStockByStore(sku, codeMagasin, dispo)              │
│        - INSERT/UPDATE stock_by_store                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : syncProductsFromBDDToShopify()                       │
│  /lib/syncLogic/products.js                                     │
│                                                                  │
│  1. getShopifyLocationsWithMetafields()                         │
│     - Récupère locations Shopify + metafields (code_magasin)    │
│                                                                  │
│  2. Boucle sur produits avec to_send_to_shopify = true          │
│     (batch de 10)                                               │
│                                                                  │
│  3. Pour chaque produit :                                       │
│     a) getVariantOptionsByNoModele(no_modele)                   │
│        - Récupère tous les variants du produit                  │
│                                                                  │
│     b) Pour chaque variant :                                    │
│        getStockByStoreBySKU(sku)                                │
│        - Récupère stocks multi-magasins                         │
│                                                                  │
│     c) Construit payload GraphQL :                              │
│        - productOptions (Taille, Couleur)                       │
│        - variants avec inventoryQuantities par location         │
│        - metafields (no_modele, derniere_modification)          │
│                                                                  │
│     d) Si nouveau produit :                                     │
│        createShopifyVariants()                                  │
│        POST GraphQL mutation productSet                         │
│        - Crée produit en DRAFT                                  │
│        - Stocke shopify_product_id en BDD                       │
│                                                                  │
│     e) Si produit existant :                                    │
│        updateShopifyVariant()                                   │
│        POST GraphQL mutation productSet (avec id)               │
│                                                                  │
│     f) Gestion throttling :                                     │
│        - Vérifie result.extensions.cost                         │
│        - Attend si currentlyAvailable < 300                     │
│                                                                  │
│     g) unflagToSendToShopify(product.id)                        │
│        - Met to_send_to_shopify = false                         │
└─────────────────────────────────────────────────────────────────┘
```

### **FLUX 2 : Commandes (Shopify → ERP)**

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : Client passe commande sur Shopify                   │
│  Shopify déclenche webhook "orders/create"                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : POST /webhook/orders/create                          │
│  /api/routes/shopify.js                                         │
│                                                                  │
│  1. verifyShopifyRequest(req)                                   │
│     - Vérifie signature HMAC-SHA256                             │
│     - Retourne 403 si invalide                                  │
│                                                                  │
│  2. getOrderDataById(orderData.id, "Envoyé")                    │
│     - Vérifie si commande déjà envoyée                          │
│     - Évite les doublons                                        │
│                                                                  │
│  3. getShopifyOrderDetails(orderData.id)                        │
│     POST GraphQL query GetOrderFullData                         │
│     - Récupère fulfillmentOrders.assignedLocation               │
│     - Extrait metafield "code_magasin"                          │
│                                                                  │
│  4. sendOrderToERP(codeMagasin, orderData)                      │
│     /api/services/erpService.js                                 │
│                                                                  │
│     a) getPayload(orderData, codeMagasin)                       │
│        - Transforme format Shopify → format Polaris             │
│        - Client (nom, prénom, adresse, email)                   │
│        - Details (SKU, Qte, MontantTTC, RemiseTTC)              │
│        - Reglements (Code: "CC", Montant)                       │
│                                                                  │
│     b) POST {ERP_URL}/Ventes/Vente                              │
│        Headers: X-API-Key                                       │
│        Body: payload JSON                                       │
│                                                                  │
│  5. orderCreate(orderData.id, "Envoyé")                         │
│     - INSERT INTO shopify_orders                                │
│     - Marque commande comme envoyée                             │
└─────────────────────────────────────────────────────────────────┘
```

### **FLUX 3 : Suppression de produit**

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : Suppression produit dans Shopify Admin               │
│  Shopify déclenche webhook "products/delete"                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : POST /webhook/products/delete                        │
│  /api/routes/shopify.js                                         │
│                                                                  │
│  1. verifyShopifyRequest(req)                                   │
│                                                                  │
│  2. deleteProductCascade(shopifyProductId)                      │
│     /api/services/dbService.js                                  │
│                                                                  │
│     Transaction SQL :                                            │
│     a) BEGIN                                                    │
│     b) SELECT no_modele FROM products WHERE shopify_product_id  │
│     c) SELECT sku FROM variant_options WHERE no_modele          │
│     d) DELETE FROM stock_by_store WHERE sku IN (...)            │
│     e) DELETE FROM variant_options WHERE no_modele              │
│     f) DELETE FROM products WHERE shopify_product_id            │
│     g) COMMIT                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 ENDPOINTS API

### **Endpoints Polaris ERP utilisés**

| Endpoint | Méthode | Usage | Fichier |
|----------|---------|-------|---------|
| `/Catalog/Produits` | GET | Récupération produits avec pagination | `/lib/erpClient/products.js` |
| `/Ventes/Vente` | POST | Création d'une vente (commande) | `/api/services/erpService.js` |

**Configuration :**
- Base URL : `process.env.ERP_URL`
- Authentification : Header `X-API-Key: {ERP_API_KEY}`
- HTTPS : `rejectUnauthorized: false` (certificat auto-signé accepté)

### **Endpoints Shopify GraphQL utilisés**

| Endpoint | Type | Usage | Fichier |
|----------|------|-------|---------|
| `productSet` | Mutation | Création/mise à jour produit + variants | `/lib/syncLogic/products.js` |
| `locations` | Query | Récupération locations + metafields | `/lib/syncLogic/products.js` |
| `order.fulfillmentOrders` | Query | Récupération location assignée commande | `/lib/syncLogic/products.js` |

**Configuration :**
- GraphQL URL : `https://{SHOPIFY_DOMAIN}/admin/api/2025-01/graphql.json`
- Authentification : Header `X-Shopify-Access-Token: {SHOPIFY_TOKEN}`

### **Webhooks Shopify configurés**

| Topic | URL | Action |
|-------|-----|--------|
| `products/delete` | `https://{VPS_URL}/webhook/products/delete` | Suppression cascade |
| `orders/create` | `https://{VPS_URL}/webhook/orders/create` | Envoi commande vers ERP |
| `orders/delete` | `https://{VPS_URL}/webhook/orders/delete` | Marquage suppression |

---

## ⚙️ CONFIGURATION ET ENVIRONNEMENT

### **Variables d'environnement requises**

Fichiers : `.env.dev`, `.env.test`, `.env.prod`

```bash
# Polaris ERP
ERP_URL=https://nur8.pl-vtest2-1221.polarisgestionmag.net:13543/api/WebConnect
ERP_API_KEY=votre_api_key_polaris

# Shopify
SHOPIFY_STORE_DOMAIN=votre-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx

# PostgreSQL
PGUSER=postgres
PGHOST=localhost
PGDATABASE=owlblack_connector
PGPASSWORD=votre_mot_de_passe
PGPORT=5432
```

### **Scripts NPM disponibles**

```bash
# Serveur API
npm run prod              # Production
npm run test              # Test
npm run dev               # Development (nodemon)

# Synchronisation produits
npm run sync-products-prod
npm run sync-products-test
npm run sync-products-dev

# Gestion base de données
npm run init-db-prod      # Créer tables
npm run update-db-prod    # Migrations
npm run delete-all-db-prod # Supprimer tables (DANGER)
```

### **Dépendances principales**

```json
{
  "@shopify/shopify-api": "^11.11.1",  // SDK Shopify officiel
  "axios": "^1.8.4",                    // Client HTTP pour ERP
  "express": "^4.21.2",                 // Serveur API
  "pg": "^8.14.1",                      // Driver PostgreSQL
  "dotenv": "^16.4.7",                  // Variables d'environnement
  "crypto": "^1.0.1",                   // Vérification HMAC webhooks
  "fast-deep-equal": "^3.1.3"           // Comparaison objets
}
```

### **Infrastructure recommandée**

- **VPS** : Serveur Node.js avec PM2
- **PostgreSQL 15** : Base de données (Docker Compose fourni)
- **PM2** : Process manager (fichier `ecosystem.config.js` fourni)
- **CI/CD** : GitHub Actions (`.github/workflows/deploy.yml`)

**Déploiement automatique :**
- Push sur branche `main` → Auto-deploy sur VPS
- PM2 restart automatique

---

## 🎓 CONCEPTS CLÉS POUR SHOPIFY + CHAUSSURES

### **Gestion des variantes chaussures**

L'application est **parfaitement adaptée aux chaussures** :

**Structure produit :**
```
Produit : "Nike Air Max 2024"
├── Variante 1 : Taille 40 - Couleur Noir (SKU: NIKE-AIR-40-BLK)
├── Variante 2 : Taille 41 - Couleur Noir (SKU: NIKE-AIR-41-BLK)
├── Variante 3 : Taille 42 - Couleur Noir (SKU: NIKE-AIR-42-BLK)
├── Variante 4 : Taille 40 - Couleur Blanc (SKU: NIKE-AIR-40-WHT)
└── ...
```

**Mapping Polaris → Shopify :**
- `Tailles[].Taille` → Option "Taille"
- `Niveau1.Nom` → Option "Couleur"
- `Tailles[].Refs[0]` → SKU unique

### **Gestion des stocks multi-magasins**

**Exemple :**
```
SKU "NIKE-AIR-40-BLK" :
├── Magasin Paris (code 101) : 5 paires disponibles
├── Magasin Lyon (code 102) : 3 paires disponibles
└── Magasin Marseille (code 103) : 0 paires disponibles
```

**Configuration Shopify requise :**
1. Créer 3 locations dans Shopify (Paris, Lyon, Marseille)
2. Ajouter metafield `code_magasin` à chaque location :
   - Paris : `code_magasin = 101`
   - Lyon : `code_magasin = 102`
   - Marseille : `code_magasin = 103`

**Le connecteur :**
1. Récupère les locations avec leurs `code_magasin`
2. Pour chaque variant, récupère les stocks par `code_magasin`
3. Envoie les `inventoryQuantities` à Shopify pour chaque location

### **Gestion des prix**

- **Prix TTC** : `PrixTTC` → `price`
- **Prix barré** : `PrixNormalTTC` → `compareAtPrice`
- **Promotions** : Automatiquement affichées dans Shopify si `compareAtPrice > price`

---

## ✅ RÉPONSE AUX QUESTIONS DU CLIENT

### **1. Est-ce bien un connecteur Polaris ↔ Shopify ?**

**OUI, absolument.**

- ✅ Synchronise produits ERP Polaris → Shopify
- ✅ Synchronise commandes Shopify → ERP Polaris
- ✅ Gère stocks multi-magasins
- ✅ Gère prix et promotions

### **2. Puis-je m'en servir pour recréer un connecteur pour mon client vendeur de chaussures ?**

**OUI, c'est parfaitement adapté.**

**Fonctionnalités existantes répondant au cahier des charges :**

| Besoin client | Couverture | Fichier |
|---------------|------------|---------|
| ✅ Import des produits dans Shopify | 100% | `/lib/syncLogic/products.js` |
| ✅ Import des prix dans Shopify | 100% | `/lib/syncLogic/products.js` (price + compareAtPrice) |
| ✅ Sortie de stock (commandes) | 100% | `/api/routes/shopify.js` + `/api/services/erpService.js` |
| ❌ Retour produit | 0% | À développer |

**Ce qui fonctionne out-of-the-box :**
- ✅ Gestion variantes chaussures (taille + couleur)
- ✅ Stocks multi-magasins
- ✅ Webhooks commandes temps réel
- ✅ Déduplication commandes
- ✅ Prix promotionnels

**Ce qui nécessite adaptation :**
- ⚠️ **Retours produits** : Non implémenté
  - Besoin d'un webhook `refunds/create` ou `returns/request`
  - Ajouter endpoint `/webhook/returns/create`
  - Créer méthode `sendReturnToERP()` dans `erpService.js`
  - Mapper vers endpoint Polaris (ex: `/Ventes/Retour`)

- ⚠️ **Configuration spécifique client** :
  - URL ERP Polaris du client
  - API Key Polaris
  - Credentials Shopify
  - Codes magasins

### **3. Mapping vers la documentation Polaris fournie**

Le client fournit l'URL : `https://nur8.pl-vtest2-1221.polarisgestionmag.net:13543/api/WebConnect`

**Cette URL correspond exactement à celle utilisée dans le code :**
- `lib/erpClient/products.js:1` : `const ERP_URL = process.env.ERP_URL;`
- Variable d'environnement à définir : `ERP_URL=https://nur8.pl-vtest2-1221...`

**Documentation API Polaris :**
L'application utilise déjà les endpoints documentés :
- `/Catalog/Produits` - Récupération produits
- `/Ventes/Vente` - Création vente

**Pour les retours, il faudra consulter la doc Polaris pour identifier l'endpoint adapté** (probablement `/Ventes/Retour` ou similaire).

---

## 🚀 RECOMMANDATIONS POUR LE PROJET CLIENT

### **Architecture recommandée**

```
┌──────────────────┐         ┌────────────────────┐         ┌──────────────────┐
│  Polaris Client  │◄────────│  VPS Dédié Client  │────────►│ Shopify Client   │
│                  │         │                    │         │                  │
│  - Produits      │         │  - Node.js App     │         │  - Store shoes   │
│  - Stocks        │         │  - PostgreSQL      │         │  - 3 locations   │
│  - Ventes        │         │  - PM2             │         │  - Webhooks      │
│  - Retours (?)   │         │  - SSL/HTTPS       │         │                  │
└──────────────────┘         └────────────────────┘         └──────────────────┘
```

### **Étapes de mise en place**

**Phase 1 : Configuration (1-2 jours)**
1. Cloner ce repository
2. Configurer variables d'environnement :
   - URL API Polaris client
   - API Key Polaris
   - Credentials Shopify
3. Configurer PostgreSQL
4. Initialiser BDD : `npm run init-db-prod`
5. Déployer sur VPS

**Phase 2 : Configuration Shopify (1 jour)**
1. Créer locations pour les magasins
2. Ajouter metafields `code_magasin` sur chaque location
3. Configurer webhooks :
   - `orders/create` → `https://{VPS}/webhook/orders/create`
   - `products/delete` → `https://{VPS}/webhook/products/delete`
4. Générer Access Token avec scopes :
   - `read_products`, `write_products`
   - `read_orders`, `write_orders`
   - `read_inventory`, `write_inventory`
   - `read_locations`

**Phase 3 : Test synchronisation produits (2-3 jours)**
1. Lancer sync test : `npm run sync-products-test`
2. Vérifier import en BDD
3. Vérifier création produits Shopify
4. Vérifier stocks multi-locations
5. Ajuster mapping si nécessaire

**Phase 4 : Test commandes (2 jours)**
1. Passer commande test sur Shopify
2. Vérifier webhook reçu
3. Vérifier envoi vers Polaris
4. Vérifier création commande dans ERP

**Phase 5 : Développement retours (3-5 jours)** ⚠️ À développer
1. Analyser documentation Polaris pour endpoint retours
2. Créer webhook `refunds/create`
3. Développer `sendRefundToERP()`
4. Tester flux retour

**Phase 6 : Mise en production (1 jour)**
1. Configuration SSL/HTTPS sur VPS
2. Configuration PM2
3. Tests charge
4. Go live

**Durée totale estimée : 10-15 jours de développement**

### **Points d'attention**

⚠️ **IMPORTANT :**

1. **Retours produits** : Non implémenté, nécessite développement custom
2. **Certificat SSL** : ERP Polaris utilise certificat auto-signé (`rejectUnauthorized: false`)
3. **Rate limiting** : Throttling Shopify géré, mais vérifier limites Polaris
4. **Codes magasins** : Doivent correspondre entre Polaris et Shopify metafields
5. **CRON** : Synchronisation produits à planifier (ex: toutes les heures)

### **Estimation budgétaire**

**Développement :**
- Configuration + déploiement : 2-3 jours
- Tests + ajustements : 3-4 jours
- Développement retours : 3-5 jours
- **Total : 8-12 jours de développement**

**Infrastructure mensuelle :**
- VPS (2 CPU, 4GB RAM) : ~20-40€/mois
- PostgreSQL : Inclus dans VPS
- Shopify : Plan client existant
- **Total : ~20-40€/mois**

---

## 📊 MÉTRIQUES DE QUALITÉ DU CODE

✅ **Points forts :**
- Architecture claire et modulaire
- Séparation responsabilités (API / Sync / DB)
- Gestion transactions SQL
- Déduplication commandes
- Throttling API géré
- Détection changements produits
- CI/CD automatisé

⚠️ **Points d'amélioration :**
- Pas de gestion d'erreurs centralisée
- Logs basiques (console.log)
- Pas de tests unitaires
- Pas de monitoring/alerting
- Retours non implémentés
- Synchronisation clients non implémentée

---

## 🔍 CONCLUSION

**Ce connecteur est un excellent point de départ** pour le projet client vendeur de chaussures.

**Couverture du cahier des charges :**
- ✅ Import produits : 100%
- ✅ Import prix : 100%
- ✅ Sortie de stock (commandes) : 100%
- ❌ Retours produits : 0% (à développer)

**Réutilisabilité : 80-90%**

Le code nécessite principalement :
1. Configuration des credentials
2. Développement du module retours
3. Tests avec les données client
4. Déploiement sur VPS

**Gain de temps estimé : 70-80%** par rapport à un développement from scratch.
