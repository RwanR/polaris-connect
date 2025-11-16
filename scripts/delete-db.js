const path = require('path');
const { getFileEnvByEnv } = require('../lib/helpers');
const envFile = getFileEnvByEnv(process.env.NODE_ENV);
require('dotenv').config({ path: path.resolve(__dirname, `../${envFile}`) });

const pool = require('../lib/db');


const dropOrdersTable = async() => {
    const client = await pool.connect();
    try {
        await client.query('DROP TABLE IF EXISTS shopify_orders CASCADE;');
        console.log('Table "shopify_orders" supprimée avec succès.');
    } catch (err) {
        console.error('Erreur lors de la suppression de la table shopify_orders : ', err);
    } finally {
        client.release();
    }
}

const dropSyncStatusTable = async() => {
    const client = await pool.connect();
    try {
        await client.query('DROP TABLE IF EXISTS sync_status CASCADE;');
        console.log('Table "sync_status" supprimée avec succès.');
    } catch (err) {
        console.error('Erreur lors de la suppression de la table sync_status : ', err);
    } finally {
        client.release();
    }
}

const dropProductsTable = async() => {
    const client = await pool.connect();
    try {
        await client.query('DROP TABLE IF EXISTS products CASCADE;');
        console.log('Table "products" supprimée avec succès.');
    } catch (err) {
        console.error('Erreur lors de la suppression de la table products : ', err);
    } finally {
        client.release();
    }
}

const dropVariantOptionsTable = async() => {
    const client = await pool.connect();
    try {
        await client.query('DROP TABLE IF EXISTS variant_options CASCADE;');
        console.log('Table "variant_options" supprimée avec succès.');
    } catch (err) {
        console.error('Erreur lors de la suppression de la table variant_options : ', err);
    } finally {
        client.release();
    }
}

const dropStockByStoreTable = async() => {
    const client = await pool.connect();
    try {
        await client.query('DROP TABLE IF EXISTS stock_by_store CASCADE;');
        console.log('Table "stock_by_store" supprimée avec succès.');
    } catch (err) {
        console.error('Erreur lors de la suppression de la table stock_by_store : ', err);
    } finally {
        client.release();
    }
}

const deleteDb = async () => {
    try {
        await dropOrdersTable();
        await dropSyncStatusTable();
        await dropProductsTable();
        await dropVariantOptionsTable();
        await dropStockByStoreTable();
        console.log("Toutes les tables ont été supprimés avec succès !");
    } catch (err) {
      console.error("Erreur lors de la suppréssion de la base :", err);
    } finally {
      await pool.end();
    }
}

deleteDb();