const ERP_URL = process.env.ERP_URL;
const ERP_API_KEY = process.env.ERP_API_KEY;

const axios = require('axios');

async function fetchProductsFromERP(fromCursor, DerniereDateChangement = '', nb = 1000) {
    const filtre = { DerniereDateChangement: ''};
    const pager = { TI: true, Nb: nb, From: fromCursor };

    const url = `${ERP_URL}/Catalog/Produits?filtreProduit=${encodeURIComponent(JSON.stringify(filtre))}&pager=${encodeURIComponent(JSON.stringify(pager))}`;

    const response = await axios.get(url, {
        headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': ERP_API_KEY
        },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });
    
    return response.data;
}

module.exports = { fetchProductsFromERP };