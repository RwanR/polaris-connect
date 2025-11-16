const ERP_URL = process.env.ERP_URL;
const ERP_API_KEY = process.env.ERP_API_KEY;

const axios = require('axios');

async function fetchClientsFromERP() {
    const filtre = { ExEmail: true };
    const pager = { TI: false };

    const url = `${ERP_URL}/Clients/Clients?filtreClient=${encodeURIComponent(JSON.stringify(filtre))}&pager=${encodeURIComponent(JSON.stringify(pager))}`;

    const response = await axios.get(url, {
        headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': ERP_API_KEY
        },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });
    
    return response.data;
}

module.exports = { fetchClientsFromERP };