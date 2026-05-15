// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const path = require('path');

const express = require('express');
const { Server } = require('socket.io');
// Import de la librairie SimConnect pour Node
const { SimConnect } = require('une-librairie-simconnect-npm');

app.use(express.static(__dirname));

//app.use('/flight-indicators', express.static(path.join(__dirname, 'flight-indicators')));

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
    console.log('✈️ Un nouveau cockpit est connecté !');

    // Écoute des actions venant des boutons de l'interface HTML
    socket.on('actionPilote', (data) => {
        console.log(`Action reçue depuis le HTML : ${data.commande}`);
        // Plus tard, c'est ici que vous ferez le lien vers votre code C/C++ pour MSFS
    });

    let fauxEtatTrain = 0;
    const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
    // Simulation de données de vol (à remplacer plus tard par les vraies données C++)
    const simulateur = setInterval(() => {
        fauxEtatTrain = (fauxEtatTrain + 1) % 3;
        const donneesDeVol = {
            altitude: randomBetween(30000, 30500),
            vitesse: randomBetween(240, 260),
            roulis: randomBetween(-5, 5),
            tangage: randomBetween(-5, 5),
            vitesse_verticale: randomBetween(-100, 100),
            regime: randomBetween(70, 95),
            carburant: randomBetween(0, 100),
            cap: randomBetween(0, 359), // Le cap s'ajoutera tout seul au HTML !
            etatTrain: fauxEtatTrain // Faux état du train d'atterrissage (0 = rentré, 1 = en transition, 2 = sorti)

        };
        // Envoi des données vers client.html
        socket.emit('donneesInstruments', donneesDeVol);
    }, 1000); // Mise à jour toutes les secondes

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
        console.log('🔌 Cockpit déconnecté.');
        clearInterval(simulateur);
    });
});

const sim = new SimConnect();
sim.connect('Mon Cockpit Web');

sim.on('connect', () => {
    console.log('✅ Connecté à Flight Simulator !');
    
    // Demande de données en boucle
    sim.requestDataOnSimObject([
        ['INDICATED ALTITUDE', 'Feet'],
        ['AIRSPEED INDICATED', 'Knots']
    ], (donnees) => {
        // Envoi direct à l'interface HTML dès réception
        io.emit('donneesInstruments', {
            altitude: donnees['INDICATED ALTITUDE'],
            vitesse: donnees['AIRSPEED INDICATED']
        });
    });
});

// Démarrage du serveur
server.listen(3000, () => {
    console.log('Serveur démarré ! Ouvrez http://localhost:3000 dans votre navigateur.');
});