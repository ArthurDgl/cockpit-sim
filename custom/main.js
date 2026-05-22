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

function makeDraggableAndZoomable(element) {
    const id = element.className; // Identifiant unique (ex: 'box1')
    let isDragging = false;
    let initialX, initialY;

    // 💾 Récupère la position ET le zoom sauvegardés (ou valeurs par défaut)
    const savedData = JSON.parse(localStorage.getItem(`gauge_data_${id}`)) || { x: 0, y: 0, scale: 1.0 };
    let xOffset = savedData.x;
    let yOffset = savedData.y;
    let currentScale = savedData.scale;

    // Applique la position et le zoom au chargement de la page
    element.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${currentScale})`;
    element.style.transformOrigin = "center center"; // Le zoom se fait par le milieu de la jauge
    element.style.cursor = 'grab';

    // --- ÉCOUTEURS POUR LE DÉPLACEMENT (DRAG) ---
    element.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);

    // --- ÉCOUTEUR POUR LE ZOOM (MOLETTE) ---
    element.addEventListener("wheel", handleWheel, { passive: false });

    function dragStart(e) {
        if (e.button === 0) { // Clic gauche
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
            element.style.cursor = 'grabbing';
            element.style.zIndex = 1000;
        }
    }

    function dragEnd(e) {
        if (isDragging) {
            initialX = xOffset;
            initialY = yOffset;
            isDragging = false;
            element.style.cursor = 'grab';
            element.style.zIndex = '';
            saveState(); // Sauvegarde après déplacement
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            xOffset = e.clientX - initialX;
            yOffset = e.clientY - initialY;
            updateTransform();
        }
    }

    function handleWheel(e) {
        e.preventDefault(); // Empêche la page entière de scroller

        // Sens de la molette : e.deltaY < 0 signifie qu'on roule vers le haut (zoom avant)
        const zoomFactor = 0.05; // Ajuste cette valeur pour rendre le zoom plus ou moins rapide
        if (e.deltaY < 0) {
            currentScale += zoomFactor;
        } else {
            currentScale -= zoomFactor;
        }

        // Limites de zoom pour éviter que la jauge devienne minuscule ou géante
        currentScale = Math.max(0.3, Math.min(currentScale, 3.0));

        updateTransform();
        saveState(); // Sauvegarde après zoom
    }

    // Applique les modifications CSS combinées (important de mettre les deux ensemble)
    function updateTransform() {
        element.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${currentScale})`;
    }

    // Fonction unique pour sauvegarder la position ET le zoom
    function saveState() {
        localStorage.setItem(`gauge_data_${id}`, JSON.stringify({
            x: xOffset,
            y: yOffset,
            scale: currentScale
        }));
    }
}

// Sélectionne et applique à toutes les boîtes (box1, box2, etc.)
const allBoxes = document.querySelectorAll('div[class^="box"]');
allBoxes.forEach(box => {
    makeDraggableAndZoomable(box);
});

// function createGauge(elementId, title, max, units, size) {
//     const result = new RadialGauge({
//         renderTo: elementId,
//         width: size,
//         height: size,
//         units: units,
//         title: title,
//         minValue: 0,
//         maxValue: max,
//         majorTicks: ["0", (max/4).toString(), (max/2).toString(), (max*3/4).toString(), max.toString()],
//         minorTicks: 2,
//         highlights: [{ from: max*0.8, to: max, color: 'rgba(255,0,0,.3)' }],
//         colorPlate: "#222",
//         colorNumbers: "#eee",
//         needleType: "arrow",
//         animatedValue: true,
//         animationDuration: 500
//     });
//     result.draw();

//     return result;
// }

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

const indicatorAttitude = createFlightIndicator('instrument-attitude', FlightIndicators.TYPE_ATTITUDE);
const indicatorHeading = createFlightIndicator('instrument-heading', FlightIndicators.TYPE_HEADING);
const indicatorVerticalSpeed = createFlightIndicator('instrument-vertical', FlightIndicators.TYPE_VERTICAL_SPEED);
const indicatorAltitude = createFlightIndicator('instrument-altitude', FlightIndicators.TYPE_ALTIMETER);
const indicatorTurnCoordinator = createFlightIndicator('instrument-turn_coordinator', FlightIndicators.TYPE_TURN_COORDINATOR);

const gaugeAirSpeed = new AirSpeed('gauge-airSpeed', 'Kts');
const gaugeEngineSpeed = new EngineSpeed('gauge-engineSpeed', 'RPM');
const gaugeFuel = new Fuel ('gauge-fuel', 'Fuel %',);
const gaugeOil = new Oil('gauge-oil', 'Oil %');

const magneticCompass = new Compass('compass-1', 'Compass');
const adfNeedle = new Compass('compass-2', 'ADF');
const analogClock = new AnalogClock('analog-clock');
const thermometer = new Thermometer('thermometer');
const suctionGauge = new Suction_Gauge('suction-gauge');
const ammeter = new AMmeter('ammeter');
const CDI1 = new CourseDeviationIndicator('cdi-1');
const CDI2 = new CourseDeviationIndicator('cdi-2');


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

// socket.on('physicalAction', (data) => {
//     if (data.action === 'OBS1') {
//         CDI1.update({dialOffset: data.value});
//     }
// }); 