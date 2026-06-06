const socket = io();

window.addEventListener('DOMContentLoaded', () => {
    
    // Le pop-up s'ouvre dès que la structure de la page est prête
    // const presetToLoad = prompt("Enter the name of your preset (ex: cessna172) :", "default");
    
    // if (presetToLoad) {
    //     // On envoie le nom saisi au serveur
    //     socket.emit('loadPreset', presetToLoad);
    // } else {
    //     // Sécurité : si l'utilisateur clique sur Annuler ou laisse vide
    //     socket.emit('loadPreset', 'default');
    // }
    socket.emit('loadPreset', 'default');
    var select = document.getElementById("select_preset");
    socket.on("files", (files)=>{
        files.forEach(element => {
            var option = document.createElement('option');
            option.text = option.value = element;
            select.add(option);
        });
    });
    
    select.addEventListener('change', () => {
        socket.emit('loadPreset', select.value);

    });
});

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

// --- FONCTION POUR RENDRE LES JAUGES DÉPLAÇABLES ET ZOOMABLES ---
function makeDraggableAndZoomable(element, startX, startY, startScale) {
    const id = element.id; 
    let isDragging = false;
    let initialX, initialY;

    let xOffset = startX || 0;
    let yOffset = startY || 0;
    let currentScale = startScale || 1.0;
    let displayed = true;

    element.style.cursor = 'grab';

    // --- ÉCOUTEURS ---
    element.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);
    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("mouseover", (e) => {
        console.log("mouse entered");
        element.addEventListener("keydown", hideComponent);
    });
    element.addEventListener("mouseout", (e) =>{
        console.log("mouse left");
        element.removeEventListener("keydown", hideComponent);
    });

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
            saveState(); // Sauvegarde automatique vers le serveur
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
        e.preventDefault(); 
        const zoomFactor = 0.025; 
        if (e.deltaY < 0) {
            currentScale += zoomFactor;
        } else {
            currentScale -= zoomFactor;
        }
        currentScale = Math.max(0.3, Math.min(currentScale, 3.0));
        updateTransform();
        saveState(); 
    }

    function hideComponent(e){
        console.log(e.key);
        if (e.key == "d"){
            console.log("hidden")
            displayed=false;
            updateTransform();
            saveState();
        }

    }

    function updateTransform() {
        element.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${currentScale})`;
        if(displayed == false){
            element.style.display = 'none';
        }

    }

    function saveState() {
        socket.emit('saveGaugeConfig', {
            type: id,
            x: xOffset,
            y: yOffset,
            scale: currentScale,
            visible: displayed
        });
    }

    // Applique la position de départ immédiatement
    updateTransform();
}

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

let indicatorAttitude;
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
            switch (component.type) {
                
                case "instrument-attitude":
                    if(!indicatorAttitude){
                        indicatorAttitude = createFlightIndicator('instrument-attitude', FlightIndicators.TYPE_ATTITUDE);
                    }
                    break; 
                    
                case "instrument-heading":
                    if(!indicatorHeading){
                        indicatorHeading = createFlightIndicator('instrument-heading', FlightIndicators.TYPE_HEADING);
                    }
                    break;

                case "instrument-vertical":
                    if(!indicatorVerticalSpeed){
                        indicatorVerticalSpeed = createFlightIndicator('instrument-vertical', FlightIndicators.TYPE_VERTICAL_SPEED);
                    }

                    break;

                case "instrument-altitude": 
                    if(!indicatorAltitude){
                        indicatorAltitude = createFlightIndicator('instrument-altitude', FlightIndicators.TYPE_ALTIMETER);
                    }
                    break;

                case "instrument-turn_coordinator":
                    if(!indicatorTurnCoordinator){
                        indicatorTurnCoordinator = createFlightIndicator('instrument-turn_coordinator', FlightIndicators.TYPE_TURN_COORDINATOR);
                    }
                break;
                
                case "gauge-airSpeed":
                    if(!gaugeAirSpeed){
                        gaugeAirSpeed = new AirSpeed('gauge-airSpeed', 'Kts');

                    }                    
                    break;
                
                case "gauge-engineSpeed":
                    if(!gaugeEngineSpeed){
                        gaugeEngineSpeed = new EngineSpeed('gauge-engineSpeed', 'RPM');
                    }
                    break;
                
                case "gauge-fuel":
                    if(!gaugeFuel){
                        gaugeFuel = new Fuel ('gauge-fuel', 'Fuel %',);
                    }
                    break;
                
                case "gauge-oil":
                    if(!gaugeOil){
                        gaugeOil = new Oil('gauge-oil', 'Oil %');
                    }
                    break;

                case "compass-1":
                    if(!magneticCompass){
                        magneticCompass = new Compass('compass-1', 'Compass');
                    }
                    break;

                case "compass-2":
                    if(!adfNeedle){
                        adfNeedle = new Compass('compass-2', 'ADF');
                    }
                    break;

                case "analog-clock":
                    if(!analogClock){
                        analogClock = new AnalogClock('analog-clock');
                    }
                    break;

                case "thermometer":
                    if(!thermometer){
                        thermometer = new Thermometer('thermometer');
                    }
                    break;

                case "suction-gauge":
                    if(!suctionGauge){
                        suctionGauge = new Suction_Gauge('suction-gauge');
                    }
                    break;

                case "ammeter":
                    if(!ammeter){
                        ammeter = new AMmeter('ammeter');
                    }
                    break;

                case "cdi-1":
                    if(!CDI1){
                        CDI1 = new CourseDeviationIndicator('cdi-1');
                    }
                    break;

                case "cdi-2":
                    if(!CDI2){
                    CDI2 = new CourseDeviationIndicator('cdi-2');
                    }
                    break;
            }
            const elem = document.getElementById(component.type);
            elem.style.display = "grid";
            elem.style.position="absolute";
            elem.style.transformOrigin = "center center"; // Le zoom se fait par le milieu de la jauge
            elem.style.transform = `translate3d(${component.x}px, ${component.y}px, 0) scale(${component.scale})`;
            if(component.visible==false){
                elem.style.display  = 'none';
            }
            makeDraggableAndZoomable(elem, component.x, component.y, component.scale);
        });
    }

});

document.getElementById('save-preset').addEventListener('click', () => {

    const presetName = prompt("Enter the name of your preset (ex: cessna172) :", "example");
    if (!presetName) return;
    const components = [];
    
    const gaugeIds = [
        'instrument-attitude', 'instrument-heading', 'instrument-vertical', 
        'instrument-altitude', 'instrument-turn_coordinator', 'gauge-airSpeed', 
        'gauge-engineSpeed', 'gauge-fuel', 'gauge-oil', 'compass-1', 
        'compass-2', 'analog-clock', 'thermometer', 'suction-gauge', 'ammeter', 'cdi-1', 'cdi-2'
    ];

    gaugeIds.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            // On extrait les valeurs du transform ou on utilise des valeurs par défaut si non déplacé
            // Pour faire propre, on peut stocker temporairement x, y, et scale sur l'élément lors du drag
            const transformMatrix = window.getComputedStyle(elem).transform;
            console.log(transformMatrix);
            let x = 0, y = 0, scale = 1.0, visible = true;

            if (transformMatrix && transformMatrix !== 'none') {
                const values = transformMatrix.split('(')[1].split(')')[0].split(',');
                x = Math.round(parseFloat(values[4])) || 0;
                y = Math.round(parseFloat(values[5])) || 0;
                scale = parseFloat(values[0]) || 1.0;
            }
            else{
                visible = false;
            }

            components.push({
                type: id,
                x: x,
                y: y,
                scale: parseFloat(scale.toFixed(2)),
                visible: visible
            });
        }
    });

    // send complete data with socket.io to server.js
    socket.emit('createNewPreset', {
        name: presetName,
        components: components
    });
    
    alert(`Requête de sauvegarde envoyée pour : ${presetName}.json`);
});

// socket.on('physicalAction', (data) => {
//     if (data.action === 'OBS1') {
//         CDI1.update({dialOffset: data.value});
//     }
// }); 