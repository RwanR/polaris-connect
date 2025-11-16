const pool = require("../db");

const { fetchProductsFromERP } = require("../erpClient/products");
const { logErreur } = require("../helpers");

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function syncProductsFromERPToBDD() {
  console.log("syncProductsFromERP");
  const batchLimit = 1000;

  try {
    let fromCursor = "";
    let hasMore = true;
    let total = 0;

    // récupérer les clients de l’ERP
    while (hasMore) {
      const erpProducts = await fetchProductsFromERP(
        fromCursor,
        null,
        batchLimit,
        true
      );

      for (const product of erpProducts.Items) {
        await upsertFromERPProductInDB(product);
      }

      total += erpProducts.Items.length;
      console.log("total", total);
      if (!erpProducts.PagerNext) {
        hasMore = false;
        break;
      }
      fromCursor = erpProducts.PagerNext.From;
      if (erpProducts.Items.length < batchLimit) hasMore = false;
    }
  } catch (err) {
    console.log("err", err);
    logErreur(err, "Erreur lors de l'import vers la BDD");
  }
}

async function syncProductsFromBDDToShopify() {
  console.log("syncProductsFromBDDToShopify");
  const batchSize = 10;
  let currentIteration = 0;
  const maxIterations = 1000;
  let hasMore = true;
  // Étape 3 : traiter les produits à synchroniser vers Shopify
  try {
    const locations = await getShopifyLocationsWithMetafields();
    let total = await getTotalProductsToSend();

    while (hasMore && currentIteration < maxIterations) {
      currentIteration++;
      const productsToSend = await getProducts(batchSize);

      if (productsToSend.length === 0) {
        console.log("Aucun produit à traiter, arrêt de la boucle");
        break;
      }

      for (const product of productsToSend) {
        // récupérer les variants
        const variantOptions = await getVariantOptionsByNoModele(
          product.no_modele
        );

        if (!product.shopify_product_id) {
          await createShopifyVariants(product, variantOptions, locations);
        } else {
          await updateShopifyVariant(product, variantOptions, locations);
        }
        // sécurité évite la infinite loop
        await unflagToSendToShopify(product.id);
      }
      total -= productsToSend.length;
      console.log("total", total);
      console.log("currentIteration (batches)", currentIteration);

      hasMore = productsToSend.length >= batchSize;
    }

    if (currentIteration >= maxIterations) {
      console.warn(`Arrêt forcé après ${maxIterations} batches`);
    }
  } catch (err) {
    console.error("Erreur lors de l'envoie vers Shopify :", err);
  }
}

async function updateShopifyVariant(productData, variantOptions, locations) {
  const hasColor = variantOptions.some((v) => v.color && v.color.trim() !== "");
  const productOptions = [
    {
      name: "Taille",
      values: [...new Set(variantOptions.map((v) => v.size))].map((name) => ({
        name,
      })),
    },
  ];

  if (hasColor) {
    productOptions.push({
      name: "Couleur",
      values: [...new Set(variantOptions.map((v) => v.color))].map((name) => ({
        name,
      })),
    });
  }

  const variants = [];
  for (const variant of variantOptions) {
    const optionValues = [];

    optionValues.push({ optionName: "Taille", name: variant.size }); // Taille
    if (hasColor && variant.color) {
      optionValues.push({ optionName: "Couleur", name: variant.color }); // Couleur
    }

    const stockByStore = await getStockByStoreBySKU(variant.sku);

    const inventoryQuantities = [];
    for (const location of locations) {
      const metafield = location?.metafields?.find(
        (metafield) => metafield.key === "code_magasin" && metafield.value
      );
      if (metafield) {
        //console.log("metafield", metafield);
        const stocks = stockByStore.find(
          (store) =>
            parseInt(store.code_magasin, 10) === parseInt(metafield.value, 10)
        );
        const inventoryQuantitie = {
          locationId: location.id,
          name: "available",
          quantity: stocks?.dispo || 0,
        };

        inventoryQuantities.push(inventoryQuantitie);
      }
    }

    const metafields = [
      {
        namespace: "erp",
        key: "nom_variante",
        value: variant.nom_variante,
        type: "single_line_text_field",
      }
    ];

    const variantData = {
      price: variant.price?.toString(),
      inventoryPolicy: "DENY",
      optionValues,
      inventoryItem: {
        tracked: true,
        sku: variant.sku,
      },
      inventoryQuantities,
      metafields
    };

    if (
      productData.compare_at_price &&
      parseFloat(productData.compare_at_price) > parseFloat(productData.price)
    ) {
      variantData.compareAtPrice = productData.compare_at_price?.toString();
    }

    variants.push(variantData);
  }

  if (variants.length === 0) {
    return false;
  }

  const query = `
    mutation productSet($productSet: ProductSetInput!) {
      productSet(input: $productSet) {
        product {
          id
          title
          variants(first: 10) {
            edges {
              node {
                id
                sku
                price
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const metafields = [
    {
      namespace: "erp",
      key: "no_modele",
      value: productData.no_modele.toString(),
      type: "single_line_text_field",
    },
    {
      namespace: "erp",
      key: "derniere_modification",
      value: new Date(productData.erp_last_change).toISOString(),
      type: "date_time",
    }
  ];

  const variables = {
    productSet: {
      id: productData.shopify_product_id,
      productOptions,
      variants,
      metafields,
    },
  };

  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const result = await response.json();

  const costInfo = result.extensions?.cost;
  if (costInfo) {
    const {
      requestedQueryCost,
      actualQueryCost,
      throttleStatus: { maximumAvailable, currentlyAvailable, restoreRate },
    } = costInfo;

    const pointsNeeded = 300;
    if (currentlyAvailable < pointsNeeded) {
      const missing = pointsNeeded - currentlyAvailable;
      const secondsToWait = Math.ceil(missing / restoreRate);
      const waitMs = secondsToWait * 1000;
      console.log(`Attente ${waitMs}ms pour éviter le throttling`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  const errors = result.data?.productSet?.userErrors || result.errors;

  if (errors && errors.length > 0) {
    console.error("Erreur utpdate Shopify :", errors);
    return false;
  } else {
    await unflagToSendToShopify(productData.id);
  }

  return true;
}

async function createShopifyVariants(productData, variantOptions, locations) {
  const hasColor = variantOptions.some((v) => v.color && v.color.trim() !== "");

  const productOptions = [
    {
      name: "Taille",
      values: [...new Set(variantOptions.map((v) => v.size))].map((name) => ({
        name,
      })),
    },
  ];

  if (hasColor) {
    productOptions.push({
      name: "Couleur",
      values: [...new Set(variantOptions.map((v) => v.color))].map((name) => ({
        name,
      })),
    });
  }

  const variants = [];
  for (const variant of variantOptions) {
    const optionValues = [];

    optionValues.push({ optionName: "Taille", name: variant.size }); // Taille
    if (hasColor && variant.color) {
      optionValues.push({ optionName: "Couleur", name: variant.color }); // Couleur
    }

    const stockByStore = await getStockByStoreBySKU(variant.sku);

    const inventoryQuantities = [];
    for (const location of locations) {
      const metafield = location?.metafields?.find(
        (metafield) => metafield.key === "code_magasin" && metafield.value
      );
      if (metafield) {
        const stocks = stockByStore.find(
          (store) =>
            parseInt(store.code_magasin, 10) === parseInt(metafield.value, 10)
        );
        const inventoryQuantitie = {
          locationId: location.id,
          name: "available",
          quantity: stocks?.dispo || 0,
        };
        inventoryQuantities.push(inventoryQuantitie);
      }
    }

    const metafields = [
      {
        namespace: "erp",
        key: "nom_variante",
        value: variant.nom_variante,
        type: "single_line_text_field",
      }
    ];

    const variantData = {
      sku: variant.sku,
      price: variant.price?.toString(),
      inventoryPolicy: "DENY",
      optionValues,
      inventoryItem: {
        tracked: true,
        sku: variant.sku,
      },
      inventoryQuantities,
      metafields
    };

    if (
      productData.compare_at_price &&
      parseFloat(productData.compare_at_price) > parseFloat(productData.price)
    ) {
      variantData.compareAtPrice = productData.compare_at_price?.toString();
    }

    variants.push(variantData);
  }

  if (variants.length === 0) {
    return;
  }

  const query = `
      mutation productSet($productSet: ProductSetInput!) {
        productSet(input: $productSet) {
          product {
            id
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  sku
                  price
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

  const metafields = [
    {
      namespace: "erp",
      key: "no_modele",
      value: productData.no_modele.toString(),
      type: "single_line_text_field",
    },
    {
      namespace: "erp",
      key: "derniere_modification",
      value: new Date(productData.erp_last_change).toISOString(),
      type: "date_time",
    },
  ];

  const variables = {
    productSet: {
      title: productData.title,
      vendor: productData.vendor,
      productType: productData.product_type,
      status: "DRAFT",
      productOptions,
      variants,
      metafields
    },
  };

  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const result = await response.json();
  const costInfo = result.extensions?.cost;
  if (costInfo) {
    const {
      requestedQueryCost,
      actualQueryCost,
      throttleStatus: { maximumAvailable, currentlyAvailable, restoreRate },
    } = costInfo;

    const pointsNeeded = 300;
    if (currentlyAvailable < pointsNeeded) {
      const missing = pointsNeeded - currentlyAvailable;
      const secondsToWait = Math.ceil(missing / restoreRate);
      const waitMs = secondsToWait * 1000;
      console.log(`Attente ${waitMs}ms pour éviter le throttling`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  const errors = result.data?.productSet?.userErrors || result.errors;

  if (errors && errors.length > 0) {
    console.error("Erreur Shopify :", errors);
  } else {
    //console.log("Produit et variantes créés :", result.data.productSet.product);
    const shopify_product_id = result.data.productSet.product.id;
    await await updateProduct(productData.id, shopify_product_id);
  }
  return null;
}

async function updateProduct(id, shopify_product_id = null) {
  const client = await pool.connect();
  try {
    await client.query(
      `
          UPDATE products
          SET shopify_product_id = $2, to_send_to_shopify = false
          WHERE id = $1
      `,
      [id, shopify_product_id]
    );
  } catch (err) {
    console.error("erreur dans updateProduct: ", err);
  } finally {
    client.release();
  }
}

async function getStockByStoreBySKU(sku) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
            SELECT * FROM stock_by_store
            WHERE sku = $1
            ORDER BY id ASC
        `,
      [sku]
    );

    return result.rows;
  } catch (err) {
    console.error("Erreur getStockByStoreBySKU :", err);
  } finally {
    client.release();
  }
}

async function getShopifyLocationsWithMetafields() {
  const query = `
      query {
        locations(first: 50) {
          edges {
            node {
              id
              name
              legacyResourceId
              address {
                address1
                address2
                city
                zip
                country
              }
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
    `;

  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query }),
    }
  );

  const result = await response.json();

  if (result.errors) {
    console.error("Erreur Shopify (locations):", result.errors);
  }

  const locations = result.data?.locations?.edges.map((edge) => {
    const location = edge.node;
    const metafields = location.metafields?.edges.map((mf) => mf.node) || [];
    return {
      ...location,
      metafields,
    };
  });

  return locations;
}

async function getVariantOptionsByNoModele(noModele) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
            SELECT * FROM variant_options
            WHERE no_modele = $1
            ORDER BY id ASC
        `,
      [noModele]
    );

    return result.rows;
  } catch (err) {
    console.error("Erreur getVariants :", err);
  } finally {
    client.release();
  }
}

async function getTotalProductsToSend() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
        SELECT COUNT(*) FROM products
        WHERE to_send_to_shopify = true
      `);

    return parseInt(result.rows[0].count, 10);
  } catch (err) {
    console.error("Erreur getTotalProductsToSend :", err);
    return 0;
  } finally {
    client.release();
  }
}

async function getProducts(limit = 100) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
            SELECT * FROM products
            WHERE to_send_to_shopify = true
            ORDER BY id ASC
            LIMIT $1
        `,
      [limit]
    );

    return result.rows;
  } catch (err) {
    console.error("Erreur getProducts :", err);
  } finally {
    client.release();
  }
}

async function upsertFromERPProductInDB(productERPData) {
  console.log(
    "Inserting product: ",
    productERPData.NoModele + " " + new Date().toISOString()
  );
  const tags = [];

  try {
    // si le produit n'a pas de Tailles alors il n'a pas de stock
    if (productERPData.Libelle !== "" && productERPData.Tailles) {
      // on crée le produit
      await upsertProducts(productERPData, tags);

      // on créer tous les variants de tailles avec la couleur
      for (const size of productERPData.Tailles) {
        await upsertVariantOptions(productERPData, size);

        // on créer l'entrée dans le stock_to_store
        for (const store of size.Magasins) {
          await upsertStockByStore(
            size.Refs[0],
            store.CodeMagasin,
            store.Dispo
          );
        }
      }
    }

    return true;
  } catch (err) {
    console.error("Erreur lors de upsertFromERPProductInDB: ", err);
  }
}

async function unflagToSendToShopify(id) {
  const client = await pool.connect();
  try {
    await client.query(
      `
          UPDATE products
          SET to_send_to_shopify = false
          WHERE id = $1
      `,
      [id]
    );
  } catch (err) {
    console.error("erreur dans unflagToSendToShopify: ", err);
  } finally {
    client.release();
  }
}

async function upsertProducts(productERPData, tags) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
        SELECT p.id, p.shopify_product_id, p.no_modele, vo.sku, sb.dispo, vo.price, vo.compare_at_price, sb.code_magasin
        FROM products p
        JOIN variant_options vo ON p.no_modele = vo.no_modele
        JOIN stock_by_store sb ON vo.sku = sb.sku
        WHERE p.no_modele = $1
      `,
      [productERPData.NoModele]
    );

    let to_send_to_shopify = true;

    // Le prduict existe déjà en bdd et on souhaite savoir si il a changé
    if (result.rows.length > 0) {
      const alreadySent = !!result.rows[0].shopify_product_id;
      // si le produit a un product_id alors il a été envoyé vers Shopify
      to_send_to_shopify = !alreadySent;

      const oldProducts = result.rows;
      const dispoERPMap = new Map();
      for (const size of productERPData.Tailles) {
        for (const store of size.Magasins) {
          dispoERPMap.set(`${size.Refs[0]}-${store.CodeMagasin}`, {
            dispo: store.Dispo ?? 0,
            price: productERPData.PrixTTC ?? 0,
            compare: productERPData.PrixNormalTTC ?? 0,
          });
        }
      }

      for (const product of oldProducts) {
        const key = `${product.sku}-${product.code_magasin}`;

        const erp = dispoERPMap.get(key);

        if (erp) {
          const priceChanged =
            parseFloat(product.price ?? 0) !== parseFloat(erp.price);
          const compareChanged =
            parseFloat(product.compare_at_price ?? 0) !==
            parseFloat(erp.compare);
          const stockChanged =
            parseInt(product.dispo ?? 0) !== parseInt(erp.dispo);

          to_send_to_shopify =
            to_send_to_shopify ||
            priceChanged ||
            compareChanged ||
            stockChanged;
        }
      }
    }

    await client.query(
      `
        INSERT INTO products (
            no_modele, title, vendor, product_type, tags, erp_last_change, to_send_to_shopify
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT (no_modele)
        DO UPDATE SET
            erp_last_change = EXCLUDED.erp_last_change,
            to_send_to_shopify = EXCLUDED.to_send_to_shopify,
            deleted_in_erp = false,
            updated_at = CURRENT_TIMESTAMP
      `,
      [
        productERPData.NoModele,
        productERPData.Libelle,
        productERPData.Marque?.Nom || null,
        productERPData.Classification?.Nom || null,
        tags || [],
        productERPData.DerniereChangement,
        to_send_to_shopify,
      ]
    );
  } catch (err) {
    console.error("erreur dans upsertProducts: ", err);
    throw err;
  } finally {
    client.release();
  }
}

async function upsertStockByStore(sky, code_magasin, dispo) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO stock_by_store (
        sku, code_magasin, dispo
        ) VALUES ($1, $2, $3)
            ON CONFLICT (sku, code_magasin)
            DO UPDATE SET
                dispo = EXCLUDED.dispo;`,
      [sky, code_magasin, dispo]
    );
  } catch (err) {
    console.error("erreur dans upsertStockByStore: ", err);
  } finally {
    client.release();
  }
}

async function upsertVariantOptions(productERPData, size) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO 
            variant_options (no_modele, sku, size, color, price, compare_at_price, nom_variante)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (sku)
            DO UPDATE SET
              price = EXCLUDED.price,
              compare_at_price = EXCLUDED.compare_at_price,
              nom_variante = EXCLUDED.nom_variante
            `,
      [
        productERPData.NoModele,
        size.Refs[0],
        size.Taille,
        productERPData.Niveau1.Nom,
        productERPData.PrixTTC,
        productERPData.PrixNormalTTC,
        productERPData.NomVariante,
      ]
    );
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
}

async function getShopifyOrderDetails(orderId) {
  const globalOrderId = `gid://shopify/Order/${orderId}`;

  const query = `
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
  `;

  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables: { orderId: globalOrderId } }),
    }
  );

  const result = await response.json();

  if (result.errors) {
    throw result.errors;
  }

  return result;
}

module.exports = {
  syncProductsFromERPToBDD,
  syncProductsFromBDDToShopify,
  getShopifyLocationsWithMetafields,
  getShopifyOrderDetails,
};
