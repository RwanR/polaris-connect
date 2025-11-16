const pool = require("../../lib/db");

const deleteProductCascade = async (shopifyProductId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const resProduct = await client.query(
      "SELECT no_modele FROM products WHERE shopify_product_id = $1",
      ["gid://shopify/Product/" + shopifyProductId]
    );

    if (resProduct.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const noModele = resProduct.rows[0].no_modele;

    // Récupérer les SKU liés
    const resVariants = await client.query(
      "SELECT sku FROM variant_options WHERE no_modele = $1",
      [noModele]
    );

    const skus = resVariants.rows.map((row) => row.sku);

    if (skus.length > 0) {
      await client.query(
        "DELETE FROM stock_by_store WHERE sku = ANY($1::text[])",
        [skus]
      );
    }

    // Supprimer les variants
    await client.query("DELETE FROM variant_options WHERE no_modele = $1", [
      noModele,
    ]);

    // Supprimer le produit
    await client.query("DELETE FROM products WHERE shopify_product_id = $1", [
      "gid://shopify/Product/" + shopifyProductId,
    ]);

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur suppression cascade :", err);
    throw err;
  } finally {
    client.release();
  }
};

const orderCreate = async (orderId, status) => {
  const client = await pool.connect();
 
  const query = `
    INSERT INTO shopify_orders (order_id, status)
    VALUES ($1, $2)
    ON CONFLICT (order_id) DO NOTHING;
  `;

  try {
    await client.query(query, [orderId, status]);
  } catch (err) {
    throw err
  }
};

async function getOrders()
{
  const client = await pool.connect();

  try {
      const order = await client.query(
          `SELECT * FROM shopify_orders WHERE status = 'En cours'`
      );
      if(order.rowCount === 0) return null;

      return order.rows;
  } catch (error) {
      throw error
  } finally {
      client.release();
  }
}


async function getOrderDataById(order_id) {
  const client = await pool.connect();

  try {
      const order = await client.query(
          'SELECT * FROM shopify_orders WHERE order_id = $1',
          [order_id]
      );
      
      if(order.rowCount === 0) return null;

      return order.rows[0];
  } catch (error) {
      throw error
  } finally {
      client.release();
  }
}

const orderDelete = async (orderId) => {
  const client = await pool.connect();
  const status = "Supprimé";

  const query = `
    UPDATE shopify_orders
    SET status = $2
    WHERE order_id = $1;
  `;

  try {
    await client.query(query, [orderId, status]);
  } catch (err) {
    console.error("Erreur orderDelete :", err);
  }
};

module.exports = {
  deleteProductCascade,
  getOrderDataById,
  getOrders,
  orderCreate,
  orderDelete,
};
