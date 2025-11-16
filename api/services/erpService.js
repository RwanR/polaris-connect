const axios = require('axios');

const ERP_URL = process.env.ERP_URL;
const ERP_API_KEY = process.env.ERP_API_KEY;

const sendOrderToERP = async (codeMagasin, orderData) => {

    try {
        const payload = getPayload(orderData, codeMagasin);

        const url = `${ERP_URL}/Ventes/Vente`;
        await axios.post(url, payload, {
            headers: { 
                'Content-Type': 'application/json',
                'X-API-Key': ERP_API_KEY
            },
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });

        return true;
    } catch (error) {
        throw error;
    }
}

function getPayload(orderData, CodeMagasin) {
    const client = orderData.customer;
    const default_address = orderData.customer.default_address;
    const lineItems = orderData.line_items || [];
    
    const payload = {
        RefExt: orderData.name,
        TypeVenteInternet: 'Site',
        Client: {
            Nom: client.last_name || '',
            Prenom: client.first_name || '',
            Telephone: {
                Numero: '',
            },
            Mobile: {
                Numero: '',
            },
            Adresse: {
                Nom: `${client.first_name} ${client.last_name}`,
                RaisonSociale: '',
                Adresse1: default_address?.address1 || '',
                Adresse2: default_address?.address2 || '',
                Adresse3: '',
                CodePostal: default_address?.zip || '',
                Ville: default_address?.city || '',
                CodePays: default_address?.country_code || '',
                Memo: '',
            },
            Mail: client.email,
            RefsExt: [orderData.name]
        },
        CodeMagasin,
        DateVente: new Date(orderData.created_at).toISOString(),
        Memo: '',
        Details: lineItems.map(item => ({
            SKU: item.sku,
            Qte: item.quantity,
            MontantTTC: parseFloat(item.price),
            RemiseTTC: parseFloat(item.total_discount || 0),
            TypeRemise: 'Normal',
        })),
        Reglements: [
            {
                Code: 'CC',
                Montant: parseFloat(orderData.total_price),
            }
        ],
    };

    return payload;

}

module.exports = {
    sendOrderToERP
};