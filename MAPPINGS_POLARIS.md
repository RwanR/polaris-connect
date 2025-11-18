# MAPPINGS POLARIS - Analyse complète

## 📊 RÉCAPITULATIF

### ✅ Mappings implémentés : **13 champs Polaris**
### ⚠️ Mappings potentiellement manquants : **~8 champs importants**

---

## 1️⃣ PRODUITS : Polaris → Base de données → Shopify

### ✅ CHAMPS ACTUELLEMENT MAPPÉS

#### Endpoint Polaris : `GET /Catalog/Produits`

| Champ Polaris | Type | Destination BDD | Destination Shopify | Fichier | Ligne |
|---------------|------|-----------------|---------------------|---------|-------|
| **NoModele** | INTEGER | `products.no_modele` | `metafield.erp.no_modele` | products.js | 739 |
| **Libelle** | TEXT | `products.title` | `product.title` | products.js | 740 |
| **Marque.Nom** | TEXT | `products.vendor` | `product.vendor` | products.js | 741 |
| **Classification.Nom** | TEXT | `products.product_type` | `product.productType` | products.js | 742 |
| **DerniereChangement** | DATETIME | `products.erp_last_change` | `metafield.erp.derniere_modification` | products.js | 744 |
| **PrixTTC** | NUMERIC | `variant_options.price` | `variant.price` | products.js | 793 |
| **PrixNormalTTC** | NUMERIC | `variant_options.compare_at_price` | `variant.compareAtPrice` | products.js | 794 |
| **NomVariante** | TEXT | `variant_options.nom_variante` | `variant.metafield.erp.nom_variante` | products.js | 795 |
| **Niveau1.Nom** | TEXT | `variant_options.color` | `variant.optionValues.Couleur` | products.js | 792 |
| **Tailles[].Taille** | TEXT | `variant_options.size` | `variant.optionValues.Taille` | products.js | 791 |
| **Tailles[].Refs[0]** | TEXT | `variant_options.sku` | `variant.sku` | products.js | 790 |
| **Tailles[].Magasins[].CodeMagasin** | INTEGER | `stock_by_store.code_magasin` | `inventoryQuantities.locationId` (mapping) | products.js | 635 |
| **Tailles[].Magasins[].Dispo** | INTEGER | `stock_by_store.dispo` | `inventoryQuantities.quantity` | products.js | 636 |

**Total : 13 champs mappés**

---

### ❌ CHAMPS POTENTIELLEMENT MANQUANTS (À VÉRIFIER DANS L'API POLARIS)

Ces champs sont **probablement disponibles** dans l'API Polaris mais **non utilisés** actuellement :

| Champ Polaris probable | Usage recommandé | Destination Shopify | Priorité |
|------------------------|------------------|---------------------|----------|
| **Description** / **DescriptionLongue** | Description produit | `product.descriptionHtml` | 🔴 HAUTE |
| **Images** / **Photos** | Images produit | `product.media` | 🔴 HAUTE |
| **CodeBarre** / **EAN** | Code barre variant | `variant.barcode` | 🟡 MOYENNE |
| **Poids** / **PoidsKg** | Poids pour livraison | `variant.weight` | 🟡 MOYENNE |
| **Genre** / **Categorie** | Catégorisation | `product.tags` | 🟢 BASSE |
| **Collection** / **Saison** | Collections Shopify | `product.tags` ou custom collection | 🟢 BASSE |
| **MatierePrincipale** | Composition | `product.descriptionHtml` ou metafield | 🟢 BASSE |
| **PaysOrigine** | Provenance | `product.metafield` | 🟢 BASSE |

---

### 🔍 STRUCTURE COMPLÈTE DE LA RÉPONSE POLARIS (SUPPOSÉE)

Basé sur le code actuel, voici la structure probable complète :

```javascript
{
  Items: [
    {
      // ✅ MAPPÉ - Identifiant
      NoModele: 12345,

      // ✅ MAPPÉ - Informations générales
      Libelle: "Basket Sport Air",

      // ❌ MANQUANT - Descriptions
      Description: "Description courte du produit",           // NON MAPPÉ
      DescriptionLongue: "Description HTML complète...",      // NON MAPPÉ

      // ✅ MAPPÉ - Marque
      Marque: {
        Nom: "Nike",
        Code: "NIKE"
      },

      // ✅ MAPPÉ - Classification
      Classification: {
        Nom: "Chaussures Sport",
        Code: "CHAUSSPORT"
      },

      // ❌ MANQUANT - Images
      Images: [                                                // NON MAPPÉ
        {
          Url: "https://...",
          Ordre: 1,
          Type: "principale"
        }
      ],

      // ✅ MAPPÉ - Prix
      PrixTTC: 89.90,
      PrixNormalTTC: 119.90,

      // ❌ MANQUANT - Autres infos produit
      PoidsKg: 0.5,                                           // NON MAPPÉ
      Genre: "Homme",                                          // NON MAPPÉ
      Collection: "Printemps 2025",                           // NON MAPPÉ

      // ✅ MAPPÉ - Couleur (via Niveau1)
      Niveau1: {
        Nom: "Noir",
        Code: "BLK"
      },

      // ✅ MAPPÉ - Nom variante
      NomVariante: "Basket Sport Air - Noir",

      // ✅ MAPPÉ - Date modification
      DerniereChangement: "2025-11-15T14:30:00Z",

      // ✅ MAPPÉ - Tailles et stocks
      Tailles: [
        {
          Taille: "40",
          Refs: ["REF-12345-40"],           // ✅ SKU mappé
          CodeBarre: "3614273123456",       // ❌ NON MAPPÉ
          PoidsKg: 0.5,                      // ❌ NON MAPPÉ
          Magasins: [
            {
              CodeMagasin: 101,              // ✅ Mappé
              Dispo: 5,                      // ✅ Mappé
              Reserve: 2,                    // ❌ NON MAPPÉ (stock réservé)
              EnCommande: 10                 // ❌ NON MAPPÉ (stock en commande)
            }
          ]
        }
      ]
    }
  ],
  PagerNext: {
    From: "nextCursor"
  }
}
```

---

## 2️⃣ COMMANDES : Shopify → Polaris

### ✅ CHAMPS ACTUELLEMENT MAPPÉS

#### Endpoint Polaris : `POST /Ventes/Vente`

| Champ Shopify | Champ Polaris | Type | Fichier | Ligne |
|---------------|---------------|------|---------|-------|
| `order.name` | `RefExt` | TEXT | erpService.js | 32 |
| `customer.last_name` | `Client.Nom` | TEXT | erpService.js | 35 |
| `customer.first_name` | `Client.Prenom` | TEXT | erpService.js | 36 |
| `customer.email` | `Client.Mail` | TEXT | erpService.js | 54 |
| `default_address.address1` | `Client.Adresse.Adresse1` | TEXT | erpService.js | 46 |
| `default_address.address2` | `Client.Adresse.Adresse2` | TEXT | erpService.js | 47 |
| `default_address.zip` | `Client.Adresse.CodePostal` | TEXT | erpService.js | 49 |
| `default_address.city` | `Client.Adresse.Ville` | TEXT | erpService.js | 50 |
| `default_address.country_code` | `Client.Adresse.CodePays` | TEXT | erpService.js | 51 |
| `fulfillmentOrder.location.metafield.code_magasin` | `CodeMagasin` | INTEGER | erpService.js | 57 |
| `created_at` | `DateVente` | DATETIME | erpService.js | 58 |
| `line_items[].sku` | `Details[].SKU` | TEXT | erpService.js | 61 |
| `line_items[].quantity` | `Details[].Qte` | INTEGER | erpService.js | 62 |
| `line_items[].price` | `Details[].MontantTTC` | NUMERIC | erpService.js | 63 |
| `line_items[].total_discount` | `Details[].RemiseTTC` | NUMERIC | erpService.js | 64 |
| `total_price` | `Reglements[].Montant` | NUMERIC | erpService.js | 70 |

**Total : 16 champs mappés**

---

### ⚠️ CHAMPS SHOPIFY NON MAPPÉS VERS POLARIS

| Champ Shopify disponible | Utilité | Impact |
|--------------------------|---------|--------|
| `customer.phone` | Téléphone client | 🟡 Champs vides actuellement |
| `shipping_lines[].title` | Mode de livraison | ⚠️ Polaris pourrait en avoir besoin |
| `shipping_lines[].price` | Frais de port | ⚠️ Polaris pourrait en avoir besoin |
| `discount_codes[]` | Codes promo utilisés | 🟢 Info marketing |
| `note` | Note de commande | 🟢 Actuellement dans `Memo` (vide) |
| `tax_lines[]` | Détail des taxes | 🟢 Polaris calcule probablement lui-même |
| `financial_status` | Statut paiement (paid/pending) | ⚠️ Important pour validation |
| `gateway` | Passerelle de paiement réelle | 🟢 Info, Code fixé à "CC" |

---

### 🔍 PAYLOAD POLARIS ACTUEL (COMMANDES)

```javascript
{
  // ✅ Référence commande
  RefExt: "1234",

  // ✅ Type vente
  TypeVenteInternet: "Site",              // HARDCODÉ

  // ✅ Client
  Client: {
    Nom: "Dupont",
    Prenom: "Jean",
    Telephone: { Numero: "" },            // ⚠️ VIDE
    Mobile: { Numero: "" },               // ⚠️ VIDE
    Adresse: {
      Nom: "Jean Dupont",
      RaisonSociale: "",                  // ⚠️ VIDE (B2B?)
      Adresse1: "123 rue Example",
      Adresse2: "Apt 4",
      Adresse3: "",                       // ⚠️ VIDE
      CodePostal: "75001",
      Ville: "Paris",
      CodePays: "FR",
      Memo: ""                            // ⚠️ VIDE (note commande?)
    },
    Mail: "jean@example.com",
    RefsExt: ["1234"]
  },

  // ✅ Magasin
  CodeMagasin: "101",

  // ✅ Date
  DateVente: "2025-11-16T10:00:00Z",

  // ⚠️ Mémo vide
  Memo: "",                               // ⚠️ VIDE (note commande?)

  // ✅ Lignes de commande
  Details: [
    {
      SKU: "REF-123-40",
      Qte: 2,
      MontantTTC: 89.90,
      RemiseTTC: 0,
      TypeRemise: "Normal"                // HARDCODÉ
    }
  ],

  // ✅ Règlements
  Reglements: [
    {
      Code: "CC",                         // ⚠️ HARDCODÉ (carte crédit)
      Montant: 179.80
    }
  ]

  // ❌ MANQUANT potentiel
  // FraisPort: 5.99,                     // NON MAPPÉ
  // ModeLivraison: "Colissimo",          // NON MAPPÉ
  // StatutPaiement: "paid",              // NON MAPPÉ
}
```

---

## 3️⃣ RETOURS PRODUITS (❌ NON IMPLÉMENTÉ)

### Endpoint Polaris supposé : `POST /Ventes/Retour` (À CONFIRMER)

**Mapping à développer :**

| Champ Shopify | Champ Polaris probable | Priorité |
|---------------|------------------------|----------|
| `refund.order_id` | `RefVenteExt` | 🔴 HAUTE |
| `refund.id` | `RefRetourExt` | 🔴 HAUTE |
| `refund.created_at` | `DateRetour` | 🔴 HAUTE |
| `refund_line_items[].line_item.sku` | `Details[].SKU` | 🔴 HAUTE |
| `refund_line_items[].quantity` | `Details[].Qte` | 🔴 HAUTE |
| `refund.note` | `Motif` | 🟡 MOYENNE |
| `CodeMagasin` | `CodeMagasin` | 🔴 HAUTE |

---

## 🎯 RECOMMANDATIONS PAR PRIORITÉ

### 🔴 PRIORITÉ HAUTE (À implémenter rapidement)

1. **Images produits** (`Images[]`)
   - Critiques pour le e-commerce
   - Mapping : `product.media` dans Shopify
   - **Action** : Ajouter dans `createShopifyVariants()` et `updateShopifyVariant()`

2. **Description produit** (`Description`, `DescriptionLongue`)
   - Essentiel pour le SEO et conversions
   - Mapping : `product.descriptionHtml`
   - **Action** : Ajouter dans les mutations `productSet`

3. **Téléphone client** (`customer.phone`)
   - Important pour la livraison
   - Mapping : `Client.Telephone.Numero` ou `Client.Mobile.Numero`
   - **Action** : Modifier `getPayload()` dans `erpService.js`

4. **Retours produits** (Endpoint complet)
   - Requis par le cahier des charges client
   - **Action** : Développer webhook `refunds/create` + service ERP

### 🟡 PRIORITÉ MOYENNE (À valider avec client)

5. **Code barre** (`CodeBarre`)
   - Utile pour gestion stocks
   - Mapping : `variant.barcode`
   - **Action** : Ajouter dans `upsertVariantOptions()`

6. **Poids** (`PoidsKg`)
   - Nécessaire pour calcul frais de port
   - Mapping : `variant.weight` + `variant.weightUnit`
   - **Action** : Ajouter dans variantes Shopify

7. **Frais de port** (`shipping_lines`)
   - Peut être attendu par Polaris
   - **Action** : Vérifier si Polaris l'accepte dans `/Ventes/Vente`

8. **Statut paiement** (`financial_status`)
   - Sécurité : ne créer commande que si `paid`
   - **Action** : Ajouter vérification dans webhook

### 🟢 PRIORITÉ BASSE (Nice to have)

9. **Tags / Collections** (`Genre`, `Collection`, `Saison`)
   - Marketing et catégorisation
   - Mapping : `product.tags` ou collections Shopify

10. **Composition / Matière** (`MatierePrincipale`)
    - Info produit complémentaire
    - Mapping : `product.metafield` ou description

---

## 📋 CHECKLIST DE VÉRIFICATION

Pour s'assurer d'avoir tous les mappings, il faut **accéder à la documentation Polaris** complète :

### ✅ Actions à réaliser :

1. [ ] **Accéder à l'API Swagger/OpenAPI Polaris**
   - URL : `https://nur8.pl-vtest2-1221.polarisgestionmag.net:13543/api/WebConnect`
   - Regarder le schéma complet de `/Catalog/Produits`
   - Regarder le schéma complet de `/Ventes/Vente`

2. [ ] **Tester un appel GET /Catalog/Produits en réel**
   ```bash
   curl -X GET "https://nur8.pl-vtest2-1221.polarisgestionmag.net:13543/api/WebConnect/Catalog/Produits" \
     -H "X-API-Key: YOUR_KEY" \
     -H "Content-Type: application/json"
   ```
   - Analyser la réponse JSON complète
   - Identifier les champs non mappés

3. [ ] **Vérifier les endpoints disponibles pour retours**
   - Chercher `/Ventes/Retour` ou `/Ventes/AvoirClient`
   - Obtenir le schéma attendu

4. [ ] **Demander au client ses besoins spécifiques**
   - Quels champs sont critiques pour lui ?
   - A-t-il besoin des images ?
   - A-t-il besoin des descriptions ?
   - Quels champs métier Polaris attend-il ?

---

## 🔧 FICHIERS À MODIFIER POUR AJOUTER DES MAPPINGS

### Pour ajouter des champs PRODUITS (Polaris → Shopify) :

1. **`/scripts/init-db.js`** - Ajouter colonnes BDD
   ```sql
   ALTER TABLE products ADD COLUMN description TEXT;
   ALTER TABLE products ADD COLUMN images JSONB;
   ALTER TABLE variant_options ADD COLUMN barcode TEXT;
   ALTER TABLE variant_options ADD COLUMN weight NUMERIC(10,2);
   ```

2. **`/lib/syncLogic/products.js`** - Fonction `upsertProducts()`
   ```javascript
   // Ligne ~724
   await client.query(`
     INSERT INTO products (
       no_modele, title, vendor, product_type, description, images, tags, ...
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, ...)
   `, [
     productERPData.NoModele,
     productERPData.Libelle,
     productERPData.Marque?.Nom,
     productERPData.Classification?.Nom,
     productERPData.Description,        // NOUVEAU
     productERPData.Images,             // NOUVEAU
     tags,
     ...
   ]);
   ```

3. **`/lib/syncLogic/products.js`** - Fonction `upsertVariantOptions()`
   ```javascript
   // Ligne ~778
   await client.query(`
     INSERT INTO variant_options (
       no_modele, sku, size, color, price, compare_at_price, barcode, weight, ...
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ...)
   `, [
     productERPData.NoModele,
     size.Refs[0],
     size.Taille,
     productERPData.Niveau1.Nom,
     productERPData.PrixTTC,
     productERPData.PrixNormalTTC,
     size.CodeBarre,                   // NOUVEAU
     size.PoidsKg,                     // NOUVEAU
     ...
   ]);
   ```

4. **`/lib/syncLogic/products.js`** - Fonction `createShopifyVariants()`
   ```javascript
   // Ligne ~400
   const variables = {
     productSet: {
       title: productData.title,
       descriptionHtml: productData.description,  // NOUVEAU
       vendor: productData.vendor,
       productType: productData.product_type,
       status: "DRAFT",
       productOptions,
       variants: [
         {
           sku: variant.sku,
           price: variant.price,
           barcode: variant.barcode,              // NOUVEAU
           weight: variant.weight,                // NOUVEAU
           weightUnit: "KILOGRAMS",               // NOUVEAU
           ...
         }
       ],
       media: productData.images?.map(img => ({  // NOUVEAU
         originalSource: img.Url,
         alt: productData.title,
         mediaContentType: "IMAGE"
       }))
     }
   };
   ```

### Pour ajouter des champs COMMANDES (Shopify → Polaris) :

**`/api/services/erpService.js`** - Fonction `getPayload()`
```javascript
// Ligne ~26
function getPayload(orderData, CodeMagasin) {
  const client = orderData.customer;
  const default_address = orderData.customer.default_address;
  const lineItems = orderData.line_items || [];
  const shippingLines = orderData.shipping_lines || [];  // NOUVEAU

  const payload = {
    RefExt: orderData.name,
    TypeVenteInternet: 'Site',
    Client: {
      Nom: client.last_name || '',
      Prenom: client.first_name || '',
      Telephone: {
        Numero: client.phone || default_address?.phone || '',  // NOUVEAU
      },
      Mobile: { Numero: '' },
      Adresse: {
        Nom: `${client.first_name} ${client.last_name}`,
        RaisonSociale: client.company || '',                   // NOUVEAU
        Adresse1: default_address?.address1 || '',
        Adresse2: default_address?.address2 || '',
        Adresse3: '',
        CodePostal: default_address?.zip || '',
        Ville: default_address?.city || '',
        CodePays: default_address?.country_code || '',
        Memo: orderData.note || ''                             // NOUVEAU
      },
      Mail: client.email,
      RefsExt: [orderData.name]
    },
    CodeMagasin,
    DateVente: new Date(orderData.created_at).toISOString(),
    Memo: orderData.note || '',                                // NOUVEAU
    ModeLivraison: shippingLines[0]?.title || '',              // NOUVEAU
    FraisPort: parseFloat(shippingLines[0]?.price || 0),       // NOUVEAU
    Details: lineItems.map(item => ({
      SKU: item.sku,
      Qte: item.quantity,
      MontantTTC: parseFloat(item.price),
      RemiseTTC: parseFloat(item.total_discount || 0),
      TypeRemise: 'Normal',
    })),
    Reglements: [
      {
        Code: 'CC',                                            // À améliorer
        Montant: parseFloat(orderData.total_price),
      }
    ],
  };

  return payload;
}
```

---

## 🚨 POINTS D'ATTENTION

### Données sensibles NON mappées :

1. **Numéro de téléphone** : Actuellement vide, peut poser problème pour la livraison
2. **Méthode de paiement réelle** : Hardcodé "CC", ne reflète pas Stripe/PayPal/etc.
3. **Statut paiement** : Pas de vérification si commande payée
4. **Images produits** : Absentes, impact fort sur conversions e-commerce

### Données Polaris potentielles non exploitées :

1. **Stock réservé** (`Reserve`) : Pourrait être utile pour gestion fine
2. **Stock en commande** (`EnCommande`) : Prévisions de réapprovisionnement
3. **Niveau2, Niveau3** : Autres dimensions (matière, style, etc.)
4. **Collections/Saisons** : Organisation catalogue

---

## 📞 QUESTIONS À POSER AU CLIENT

Avant de compléter les mappings, demander au client :

1. ✅ **Images** : Polaris fournit-il des URLs d'images ? Format ?
2. ✅ **Descriptions** : Polaris fournit-il des descriptions HTML ?
3. ✅ **Téléphone** : Obligatoire pour créer une commande dans Polaris ?
4. ✅ **Frais de port** : Polaris attend-il les frais de port séparés ?
5. ✅ **Mode de livraison** : Polaris a-t-il des codes spécifiques (Colissimo, Chronopost, etc.) ?
6. ✅ **Retours** : Quel endpoint utiliser ? Quel format de payload ?
7. ✅ **Paiement** : Polaris attend-il le vrai moyen de paiement ou "CC" suffit ?
8. ✅ **Code barre** : Nécessaire dans Shopify ?

---

## ✅ CONCLUSION

**État actuel :**
- ✅ **29 champs mappés** au total (13 produits + 16 commandes)
- ✅ **Fonctionnel** pour le flux de base (produits + commandes)
- ⚠️ **Manques critiques** : Images, descriptions, téléphone, retours

**Prochaines étapes :**
1. Accéder à la documentation Polaris complète
2. Tester un appel réel pour voir la structure exacte
3. Prioriser les mappings manquants selon besoins client
4. Développer les retours produits

**Gain de temps avec code existant : 70-80%** - Les mappings critiques sont là, il faut juste enrichir avec les champs manquants selon les besoins spécifiques du client.
