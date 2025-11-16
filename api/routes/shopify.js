const express = require("express");
const router = express.Router();
const verifyShopifyRequest = require("../utils/verifyShopify");
const {
  deleteProductCascade,
  orderCreate,
  orderDelete,
  getOrderDataById,
} = require("../services/dbService");
const { sendOrderToERP } = require("../services/erpService");
const { getShopifyOrderDetails } = require('../../lib/syncLogic/products');

router.post("/products/delete", async (req, res) => {
  if (!verifyShopifyRequest(req)) {
    return res.status(401).send("Invalid webhook");
  }
  res.sendStatus(200);

  const bodyString = req.body.toString("utf8");
  const data = JSON.parse(bodyString);

  try {
    await deleteProductCascade(data.id);
    console.log("Produit supprimé : " + data.id);
  } catch (error) {
    console.error("Erreur suppression produit :", error);
  }
});

router.post("/orders/create", async (req, res) => {
    if (!verifyShopifyRequest(req)) {
        return res.sendStatus(403);
    }
    res.sendStatus(200);
    const bodyString = req.body.toString("utf8");
    const orderData = JSON.parse(bodyString);
    
    try {
        const findOrder = await getOrderDataById(orderData.id, "Envoyé");
        if(findOrder) {
          throw new Error(`commande déjà envoyé vers l'erp: ${orderData.id}`); 
        }

        const orderDetails = await getShopifyOrderDetails(orderData.id);
        if(!orderDetails) {
          throw new Error(`orderDetails pas trouvé: ${orderData.id}`); 
        }
        const codeMagasin =  orderDetails.data?.order?.fulfillmentOrders?.edges[0]?.node?.assignedLocation?.location?.metafield?.value;
        if (!codeMagasin) throw new Error(`codeMagasin manquant: ${orderData.id}`);

        const isValid = await sendOrderToERP(codeMagasin, orderData);
        if(isValid) {
          await orderCreate(orderData.id, "Envoyé");
          console.log('commande crée ' + orderData.id);
        } else {
          if (!isValid) throw new Error(`Échec d'envoi ERP: ${orderData.id}`);
        }
      } catch (error) {
        console.error(
          "Erreur création commande :",
          error.response?.data || error.message || error
        );
    }
});

router.post("/orders/delete", express.json(), async (req, res) => {
  if (!verifyShopifyRequest(req)) {
    return res.sendStatus(403);
  }
  res.sendStatus(200);

  const bodyString = req.body.toString("utf8");
  const orderData = JSON.parse(bodyString);

  try {
    const findOrder = await getOrderDataById(orderData.id);
    if(findOrder) {
      await orderDelete(orderData.id);
      console.log("commande supprimé " + orderData.id);
      return
    }
    console.log("commande non trouvé en bdd " + orderData.id);
  } catch (error) {
    console.error(
      "Erreur suppression commande :",
      error.response?.data || error.message
    );
  }
});

module.exports = router;