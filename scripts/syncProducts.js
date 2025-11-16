#!/usr/bin/env node
const path = require('path');
const { getFileEnvByEnv } = require('../lib/helpers');
const envFile = getFileEnvByEnv(process.env.NODE_ENV);
require('dotenv').config({ path: path.resolve(__dirname, `../${envFile}`) });

const { syncProductsFromERPToBDD, syncProductsFromBDDToShopify } = require('../lib/syncLogic/products');

(async () => {
  try {
    console.log("Lancement de la synchro products ERP → BDD → Shopify");
    await syncProductsFromERPToBDD();
    await syncProductsFromBDDToShopify();
    console.log("Synchronisation terminée");
    process.exit(0);
  } catch (err) {
    console.error("Erreur dans la synchro products :", err);
    process.exit(1);
  }
})();
