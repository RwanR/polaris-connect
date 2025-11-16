const path = require("path");
const { getFileEnvByEnv } = require("../lib/helpers");
const envFile = getFileEnvByEnv(process.env.NODE_ENV);
require("dotenv").config({ path: path.resolve(__dirname, `../${envFile}`) });

const pool = require("../lib/db");

const createNonVarianteInVariantOptionsTable = async () => {
  const addColumnQuery = `
      ALTER TABLE variant_options
      ADD COLUMN nom_variante TEXT DEFAULT '' NOT NULL
    `;

  try {
    await pool.query(addColumnQuery);
    console.log('Table "variant_options" update');
  } catch (err) {
    console.error("Erreur update de table variant_options :", err);
  }
};

const updateDb = async () => {
  try {
    await createNonVarianteInVariantOptionsTable();
    console.log("Toutes les tables ont été update avec succès !");
  } catch (err) {
    console.error("Erreur lors de la mise à jour de la base :", err);
  } finally {
    await pool.end();
  }
};

updateDb();
