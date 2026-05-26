const socket = io();

function sendPilotAction(pilotCommand, commandValue) {
    if(pilotCommand === 'THROTTLE') document.getElementById('value-throttle').innerText = commandValue + '%';
    if(pilotCommand === 'TRIM') document.getElementById('value-trim').innerText = commandValue;
    if(pilotCommand === 'FLAPS') document.getElementById('value-flaps').innerText = commandValue;
    if(pilotCommand === 'OBS1') {
        document.getElementById('value-obs-1').innerText = commandValue + '°';
        CDI1.update({dialOffset: -commandValue});
    }

    socket.emit('pilotAction', { 
        command: pilotCommand, 
        value: commandValue
    });
}

function createFlightIndicator(elementId, type, options = {}) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const result = new FlightIndicators(el, type, options);

    return result;
}

// --- FONCTION POUR RENDRE LES JAUGES DÉPLAÇABLES, ZOOMABLES ET PERMANENTES ---

// function makeDraggableAndZoomable(element) {
//     const id = element.className; // Identifiant unique (ex: 'box1')
//     let isDragging = false;
//     let initialX, initialY;

//     // 💾 Récupère la position ET le zoom sauvegardés (ou valeurs par défaut)
//     // const savedData = JSON.parse(localStorage.getItem(`gauge_data_${id}`)) || { x: 0, y: 0, scale: 1.0 };
//     // let xOffset = savedData.x;
//     // let yOffset = savedData.y;
//     // let currentScale = savedData.scale;

//     let xOffset = 0;
//     let yOffset = 0;
//     let currentScale = 1;

//     // Applique la position et le zoom au chargement de la page
//     element.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${currentScale})`;
//     element.style.transformOrigin = "center center"; // Le zoom se fait par le milieu de la jauge
//     element.style.cursor = 'grab';

//     // --- ÉCOUTEURS POUR LE DÉPLACEMENT (DRAG) ---
//     element.addEventListener("mousedown", dragStart);
//     document.addEventListener("mouseup", dragEnd);
//     document.addEventListener("mousemove", drag);

//     // --- ÉCOUTEUR POUR LE ZOOM (MOLETTE) ---
//     element.addEventListener("wheel", handleWheel, { passive: false });

//     function dragStart(e) {
//         if (e.button === 0) { // Clic gauche
//             initialX = e.clientX - xOffset;
//             initialY = e.clientY - yOffset;
//             isDragging = true;
//             element.style.cursor = 'grabbing';
//             element.style.zIndex = 1000;
//         }
//     }

//     function dragEnd(e) {
//         if (isDragging) {
//             initialX = xOffset;
//             initialY = yOffset;
//             isDragging = false;
//             element.style.cursor = 'grab';
//             element.style.zIndex = '';
//             saveState(); // Sauvegarde après déplacement
//         }
//     }

//     function drag(e) {
//         if (isDragging) {
//             e.preventDefault();
//             xOffset = e.clientX - initialX;
//             yOffset = e.clientY - initialY;
//             updateTransform();
//         }
//     }

//     function handleWheel(e) {
//         e.preventDefault(); // Empêche la page entière de scroller

//         // Sens de la molette : e.deltaY < 0 signifie qu'on roule vers le haut (zoom avant)
//         const zoomFactor = 0.05; // Ajuste cette valeur pour rendre le zoom plus ou moins rapide
//         if (e.deltaY < 0) {
//             currentScale += zoomFactor;
//         } else {
//             currentScale -= zoomFactor;
//         }

//         // Limites de zoom pour éviter que la jauge devienne minuscule ou géante
//         currentScale = Math.max(0.3, Math.min(currentScale, 3.0));

//         updateTransform();
//         saveState(); // Sauvegarde après zoom
//     }

//     // Applique les modifications CSS combinées (important de mettre les deux ensemble)
//     function updateTransform() {
//         element.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${currentScale})`;
//     }

//     // Fonction unique pour sauvegarder la position ET le zoom
//     function saveState() {

//     //     localStorage.setItem(`gauge_data_${id}`, JSON.stringify({
//     //         x: xOffset,
//     //         y: yOffset,
//     //         scale: currentScale
//     //     }));
//     // }
//         const fileData = fs.readFile(fileName, "utf8");
//         const jsonData = JSON.parse(fileData);

//         jsonData["x"] = xOffset;
//         jsonData["y"] = yOffset;
//         jsonData["scale"] = currentScale;
    
//     }
// }

// Sélectionne et applique à toutes les boîtes (box1, box2, etc.)
// const allBoxes = document.querySelectorAll('div[class^="box"]');
// allBoxes.forEach(box => {
//     makeDraggableAndZoomable(box);
// });

function updateIndicators(data) {
    indicatorAttitude?.updateRoll(data.roll);
    indicatorAttitude?.updatePitch(data.pitch);

    indicatorHeading?.updateHeading(data.heading);

    indicatorVerticalSpeed?.updateVerticalSpeed(data.verticalSpeed);

    indicatorAltitude?.updateAltitude(data.altitude);

    indicatorTurnCoordinator?.updateCoordinator(data.turnRate);
    indicatorTurnCoordinator?.updateBall(data.ball);
}

function updateGauges(data) {
    if (gaugeAirSpeed) gaugeAirSpeed.value = data.airSpeed;
    if (gaugeEngineSpeed) gaugeEngineSpeed.value = data.engineSpeed;
    if (gaugeFuel) gaugeFuel.value = data.fuel;
    if (gaugeOil) gaugeOil.value = data.oil;
}

// const indicatorAttitude = createFlightIndicator('instrument-attitude', FlightIndicators.TYPE_ATTITUDE);
// const indicatorHeading = createFlightIndicator('instrument-heading', FlightIndicators.TYPE_HEADING);
// const indicatorVerticalSpeed = createFlightIndicator('instrument-vertical', FlightIndicators.TYPE_VERTICAL_SPEED);
// const indicatorAltitude = createFlightIndicator('instrument-altitude', FlightIndicators.TYPE_ALTIMETER);
// const indicatorTurnCoordinator = createFlightIndicator('instrument-turn_coordinator', FlightIndicators.TYPE_TURN_COORDINATOR);

// const gaugeAirSpeed = new AirSpeed('gauge-airSpeed', 'Kts');
// const gaugeEngineSpeed = new EngineSpeed('gauge-engineSpeed', 'RPM');
// const gaugeFuel = new Fuel ('gauge-fuel', 'Fuel %',);
// const gaugeOil = new Oil('gauge-oil', 'Oil %');

// const magneticCompass = new Compass('compass-1', 'Compass');
// const adfNeedle = new Compass('compass-2', 'ADF');
// const analogClock = new AnalogClock('analog-clock');
// const thermometer = new Thermometer('thermometer');
// const suctionGauge = new Suction_Gauge('suction-gauge');
// const ammeter = new AMmeter('ammeter');
// const CDI1 = new CourseDeviationIndicator('cdi-1');
// const CDI2 = new CourseDeviationIndicator('cdi-2');

let indicatorHeading;
let indicatorVerticalSpeed;
let indicatorAltitude;
let indicatorTurnCoordinator;
let gaugeAirSpeed;
let gaugeEngineSpeed;
let gaugeFuel;
let gaugeOil;
let magneticCompass;
let adfNeedle;
let analogClock;
let thermometer;
let suctionGauge;
let ammeter;
let CDI1;
let CDI2;


socket.on('planeData', (data) => {
    updateIndicators(data);

    updateGauges(data);

    magneticCompass.update({angle: data.heading});
    adfNeedle.update({angle: data.adfHeading});
    analogClock.update({time: data.time});
    thermometer.update({angle: (data.temperature + 50)*2.5+210});
    suctionGauge.update({angle: data.suction*30+210});
    ammeter.update({angle: (data.ammeter+60)*1.5+270});
    CDI1.update({needleOffset: data.cdi1, toFromFlag: data.navToFrom1, dialOffset: data.navOBS1});
    CDI2.update({needleOffset: data.cdi2, toFromFlag: data.navToFrom2, dialOffset: data.navOBS2});
    gaugeFuel.update({angle: data.fuel*3+210});
    gaugeOil.update({angle: data.oil*3+210});
    gaugeAirSpeed.update({airSpeed: data.airSpeed});
    gaugeEngineSpeed.update({angle: data.engineSpeed*0.07714+225})
});

socket.on('loadConfig', (data) => {

    if (data && data.components) {
        
        data.components.forEach((component) => {
            console.log(component.type);
            switch (component.type) {
                
                case "instrument-attitude":
                    indicatorAttitude = createFlightIndicator('instrument-attitude', FlightIndicators.TYPE_ATTITUDE);
                    break; 
                    
                case "instrument-heading":
                    indicatorHeading = createFlightIndicator('instrument-heading', FlightIndicators.TYPE_HEADING);
                    break;

                case "instrument-vertical":
                    indicatorVerticalSpeed = createFlightIndicator('instrument-vertical', FlightIndicators.TYPE_VERTICAL_SPEED);
                    break;

                case "instrument-altitude": 
                    elementId = 'instrument-altitude';
                    indicatorAltitude = createFlightIndicator('instrument-altitude', FlightIndicators.TYPE_ALTIMETER);
                    break;

                case "instrument-turn_coordinator":
                    indicatorTurnCoordinator = createFlightIndicator('instrument-turn_coordinator', FlightIndicators.TYPE_TURN_COORDINATOR);
                    break;
                
                case "gauge-airSpeed":
                    gaugeAirSpeed = new AirSpeed('gauge-airSpeed', 'Kts');
                    
                    break;
                
                case "gauge-engineSpeed":
                    gaugeEngineSpeed = new EngineSpeed('gauge-engineSpeed', 'RPM');
                    break;
                
                case "gauge-fuel":
                    gaugeFuel = new Fuel ('gauge-fuel', 'Fuel %',);
                    break;
                
                case "gauge-oil":
                    gaugeOil = new Oil('gauge-oil', 'Oil %');
                    break;

                case "compass-1":
                    magneticCompass = new Compass('compass-1', 'Compass');
                    break;

                case "compass-2":
                    adfNeedle = new Compass('compass-2', 'ADF');
                    break;

                case "analog-clock":
                    analogClock = new AnalogClock('analog-clock');
                    break;

                case "thermometer":
                    thermometer = new Thermometer('thermometer');
                    break;

                case "suction-gauge":
                    suctionGauge = new Suction_Gauge('suction-gauge');
                    break;

                case "ammeter":
                    ammeter = new AMmeter('ammeter');
                    break;

                case "cdi-1":
                    CDI1 = new CourseDeviationIndicator('cdi-1');
                    break;

                case "cdi-2":
                    CDI2 = new CourseDeviationIndicator('cdi-2');
                    break;
            }
            console.log(component.type, "créé")
            const elem = document.getElementById(component.type);
            elem.style.transform = `translate3d(${component.x}px, ${component.y}px, 0) scale(${component.scale})`;
            elem.style.transformOrigin = "center center"; // Le zoom se fait par le milieu de la jauge
        });
    }

    // boucle sur data.components
    // --- creer l'indicateur en utilisant le type du composant
});

// socket.on('physicalAction', (data) => {
//     if (data.action === 'OBS1') {
//         CDI1.update({dialOffset: data.value});
//     }
// }); 