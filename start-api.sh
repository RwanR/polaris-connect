#!/bin/bash

APP_NAME="api"
SCRIPT="npm"
ARGS="run start"

echo "Démarrage de l'API avec PM2..."

# Démarre l'app avec PM2
pm2 start $SCRIPT --name "$APP_NAME" -- $ARGS

# Sauvegarde la config PM2 (pour le redémarrage auto)
pm2 save

# Configure PM2 pour redémarrer au reboot du serveur
pm2 startup

echo "API démarrée et configurée pour le redémarrage automatique."
