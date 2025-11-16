const getFileEnvByEnv = (env) => {
    if(env === "production") {
        return ".env.prod";
    }
    if(env === "test") {
        return ".env.test";
    }

    return ".env.dev";
}

const logErreur = (err, contexte = "Erreur") => {
    console.error(`${contexte}`);
  
    if (err.isAxiosError) {
      console.error("➡️ Erreur Axios");
      console.error("Message :", err.message);
      
      if (err.response) {
        console.error("Statut HTTP :", err.response.status, err.response.statusText);
        console.error("Réponse API :", JSON.stringify(err.response.data, null, 2));
      } else if (err.request) {
        console.error("➡️ Aucune réponse reçue");
      } else {
        console.error("➡️ Autre erreur Axios :", err.message);
      }
    } else {
      console.error("➡️", err.stack || err.message || err);
    }
  }
  

module.exports = { getFileEnvByEnv, logErreur };