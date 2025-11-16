const crypto = require('crypto');
const SHOPIFY_SECRET = process.env.SHOPIFY_SECRET;

function verifyShopifyRequest(req) {
    const shopifyHmac = req.headers['x-shopify-hmac-sha256'];
    const byteArray = req.body;
    const calculatedHmacDigest = crypto.createHmac('sha256', SHOPIFY_SECRET).update(byteArray).digest('base64');
    const hmacValid = crypto.timingSafeEqual(Buffer.from(calculatedHmacDigest), Buffer.from(shopifyHmac));
   
    return hmacValid
}

module.exports = verifyShopifyRequest;
