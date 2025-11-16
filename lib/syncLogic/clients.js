const { fetchClientsFromERP } = require('../erpClient/clients');

async function syncClientsFromERP() {
    try {
        console.log('syncClientsFromERP');
        // Étape 1 : marquer tous les clients comme "supprimés"
        //await markAllClientsDeleted();
        // Étape 2 : récupérer les clients de l’ERP
        const erpClients = await fetchClientsFromERP();
        //console.log('erpClients', erpClients);
        for (const client of erpClients.Items) {
            console.log('client', client);
            //await upsertClientInDB(client);
        }
        // // Étape 3 : traiter les clients à synchroniser vers Shopify
        // const toSync = await getClientsToSync();
        // for (const client of toSync) {
        //     await syncClientToShopify(client);
        // }
        // // Étape 4 : traiter les clients supprimés de l’ERP
        // await cleanupDeletedClients();
        console.log("Synchronisation terminée");
        process.exit(0);
    } catch(err) {
        console.error("Erreur de synchro :", err);
        process.exit(1);
    }
}



async function markAllClientsDeleted() {
    console.log('markAllClientsDeleted');
}

module.exports = { syncClientsFromERP };