const path = require("path");
const { getFileEnvByEnv } = require("../lib/helpers");
const envFile = getFileEnvByEnv(process.env.NODE_ENV);
require("dotenv").config({ path: path.resolve(__dirname, `../${envFile}`) });

const pool = require("../lib/db");

const createOrdersTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS shopify_orders (
        order_id BIGINT PRIMARY KEY,
        status TEXT DEFAULT 'En cours'
      );
    `;

    await pool.query(createTableQuery);

    console.log('Table "shopify_orders" créée');
  } catch (err) {
    console.error("Erreur création de table shopify_orders :", err);
  }
};

const createSyncStatusTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sync_status (
        id SERIAL PRIMARY KEY,
        source TEXT UNIQUE NOT NULL,
        last_sync TIMESTAMPTZ NOT NULL
      )
    `;
    await pool.query(createTableQuery);

    const insertSyncStatusDefautQuery = `
      INSERT INTO sync_status (source, last_sync)
        VALUES ($1, $2)
      ON CONFLICT (source) DO NOTHING;
    `;
    await pool.query(insertSyncStatusDefautQuery, [
      "erp",
      "2000-01-01T00:00:00Z",
    ]);

    console.log('Table "sync_status" créée');
  } catch (err) {
    console.error("Erreur création de table sync_status :", err);
  }
};

const createProductsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        no_modele INTEGER UNIQUE NOT NULL,
        shopify_product_id TEXT,
        title TEXT NOT NULL,
        vendor TEXT,
        product_type TEXT,
        tags TEXT[],
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        erp_last_change TEXT NOT NULL,
        to_send_to_erp BOOLEAN DEFAULT false,
        to_send_to_shopify BOOLEAN DEFAULT false,
        deleted_in_erp BOOLEAN DEFAULT false
      )
    `;
    await pool.query(createTableQuery);
    console.log('Table "products" créée');
  } catch (err) {
    console.error("Erreur création de table products :", err);
  }
};

const createVariantOptionsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS variant_options (
        id SERIAL PRIMARY KEY,
        no_modele INTEGER NOT NULL,
        sku TEXT UNIQUE NOT NULL ,
        price NUMERIC(10,2),
        compare_at_price NUMERIC(10,2),
        size TEXT NOT NULL,      
        color TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(size, color, no_modele)
      )
    `;
    await pool.query(createTableQuery);
    console.log('Table "variant_options" créée');
  } catch (err) {
    console.error("Erreur création de table variant_options :", err);
  }
};

const createStockToStoreTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS stock_by_store (
        id SERIAL PRIMARY KEY,
        sku TEXT NOT NULL,
        code_magasin INTEGER NOT NULL,
        dispo INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sku, code_magasin)
      )
    `;
    await pool.query(createTableQuery);
    console.log('Table "stock_by_store" créée');
  } catch (err) {
    console.error("Erreur création de table stock_by_store :", err);
  }
};

const createClientsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        no INTEGER UNIQUE NOT NULL,
        ident VARCHAR(10),
        nom VARCHAR(255),
        prenom VARCHAR(255),
        telephone VARCHAR(50),
        mobile VARCHAR(50),
        mail VARCHAR(255),
        adresse_nom VARCHAR(255),
        adresse_raison_sociale VARCHAR(255),
        adresse1 VARCHAR(255),
        adresse2 VARCHAR(255),
        adresse3 VARCHAR(255),
        code_postal VARCHAR(20),
        ville VARCHAR(255),
        code_pays VARCHAR(10),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_deleted BOOLEAN DEFAULT FALSE,
        to_send_to_erp BOOLEAN DEFAULT false,
        to_send_to_shopify BOOLEAN DEFAULT false,
        deleted_in_erp BOOLEAN DEFAULT false,
        sync_retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        last_synced_to_shopify TIMESTAMP,
        pending_deletion BOOLEAN DEFAULT false
      );
    `;

    await pool.query(createTableQuery);
    console.log('Table "clients" créée');
    process.exit();
  } catch (err) {
    console.error("Erreur création de table:", err);
    process.exit(1);
  }
};

const initDb = async () => {
  try {
    await createOrdersTable();
    await createSyncStatusTable();
    await createProductsTable();
    await createVariantOptionsTable();
    await createStockToStoreTable();
    
    console.log("Toutes les tables ont été créées avec succès !");
  } catch (err) {
    console.error("Erreur lors de l'initialisation de la base :", err);
  } finally {
    await pool.end();
  }
};

initDb();
