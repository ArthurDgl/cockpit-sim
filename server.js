// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const path = require('path');

// CORRECTION ICI : On utilise bien des majuscules pour importer la classe
//const { SimConnect } = require('node-simconnect');

app.use(express.static(__dirname));

// Gestion des connexions WebSocket avec l'interface HTML
io.on('connection', (socket) => {
    console.log('💻 Un navigateur web est connecté au tableau de bord !');

    socket.on('actionPilote', (data) => {
        console.log(`Action reçue depuis le HTML : ${data.commande}`);
        // Ici, on pourra envoyer l'ordre à MSFS via sim.sendEvent(...)
    });

    socket.on('disconnect', () => {
        console.log('🔌 Tableau de bord web déconnecté.');
    });
});

// --- LE PONT AVEC FLIGHT SIMULATOR ---

// Création de l'instance avec la bonne majuscule
// --- LE PONT AVEC FLIGHT SIMULATOR ---

// On importe le module directement (sans accolades)
//const simConnect = require('node-simconnect');

// Pas de "new", on appelle la fonction "open" directement
// simConnect.open('Cockpit E3', (name, version) => {
//     console.log(`✅ Connecté avec succès à Flight Simulator ! (Moteur: ${name})`);
    
    // Demande des vraies données à MSFS
//     simConnect.requestDataOnSimObject([
//         ['INDICATED ALTITUDE', 'Feet'],
//         ['AIRSPEED INDICATED', 'Knots'],
//         ['PLANE PITCH DEGREES', 'Degrees'],
//         ['PLANE BANK DEGREES', 'Degrees'],
//         ['VERTICAL SPEED', 'Feet per minute'],
//         ['GENERAL ENG RPM:1', 'Rpm'],
//         ['FUEL TOTAL QUANTITY', 'Gallons'],
//         ['PLANE HEADING DEGREES MAGNETIC', 'Degrees']
//     ], (donnees) => {
        
//         // On formate les vraies données pour notre HTML
//         const donneesDeVol = {
//             altitude: Math.round(donnees['INDICATED ALTITUDE']),
//             vitesse: Math.round(donnees['AIRSPEED INDICATED']),
//             tangage: Math.round(donnees['PLANE PITCH DEGREES']),
//             roulis: Math.round(donnees['PLANE BANK DEGREES']),
//             vitesse_verticale: Math.round(donnees['VERTICAL SPEED']),
//             regime: Math.round(donnees['GENERAL ENG RPM:1']),
//             carburant: Math.round(donnees['FUEL TOTAL QUANTITY']),
//             cap: Math.round(donnees['PLANE HEADING DEGREES MAGNETIC'])
//         };

//         // Envoi direct à l'interface HTML
//         io.emit('donneesInstruments', donneesDeVol);

//     }, 
//     simConnect.objectId.USER,    // Cible : l'avion du joueur
//     simConnect.period.SIM_FRAME, // Fréquence : à chaque frame du simulateur
//     0);

// }, () => {
//     // Si MSFS est fermé manuellement
//     console.log('🔌 Simulateur fermé.');
// }, (exception) => {
//     // S'il y a une erreur interne dans les variables demandées
//     console.log('⚠️ Exception SimConnect :', exception);
// }, (error) => {
//     // Si MSFS n'est pas lancé au moment du démarrage de server.js
//     console.log('⚠️ Erreur de connexion (Flight Simulator est bien lancé ?) :', error);
// });

// Démarrage du serveur web
server.listen(3000, () => {
    console.log('🚀 Serveur démarré ! Ouvrez http://localhost:3000 dans votre navigateur.');
});

