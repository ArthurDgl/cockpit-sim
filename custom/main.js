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
    if(options.showBox !== false) result.showBox();

    return result;
}

function createGauge(elementId, title, max, units) {
    const result = new RadialGauge({
        renderTo: elementId,
        width: 200,
        height: 200,
        units: units,
        title: title,
        minValue: 0,
        maxValue: max,
        majorTicks: ["0", (max/4).toString(), (max/2).toString(), (max*3/4).toString(), max.toString()],
        minorTicks: 2,
        highlights: [{ from: max*0.8, to: max, color: 'rgba(255,0,0,.3)' }],
        colorPlate: "#222",
        colorNumbers: "#eee",
        needleType: "arrow",
        animatedValue: true,
        animationDuration: 500
    });
    result.draw();

    return result;
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

const indicatorAttitude = createFlightIndicator('instrument-attitude', FlightIndicators.TYPE_ATTITUDE);
const indicatorHeading = createFlightIndicator('instrument-heading', FlightIndicators.TYPE_HEADING);
const indicatorVerticalSpeed = createFlightIndicator('instrument-vertical', FlightIndicators.TYPE_VERTICAL_SPEED);
const indicatorAltitude = createFlightIndicator('instrument-altitude', FlightIndicators.TYPE_ALTIMETER);
const indicatorTurnCoordinator = createFlightIndicator('instrument-turn_coordinator', FlightIndicators.TYPE_TURN_COORDINATOR);

const gaugeAirSpeed = createGauge('gauge-airSpeed', 'Air Speed', 300, 'kts');
const gaugeEngineSpeed = createGauge('gauge-engineSpeed', 'Engine Speed', 3500, 'RPM');
const gaugeFuel = createGauge('gauge-fuel', 'Fuel', 100, '%');
const gaugeOil = createGauge('gauge-oil', 'Oil', 100, '%');

const magneticCompass = new Compass('compass-1', 'Compass');
const adfNeedle = new Compass('compass-2', 'ADF');
const analogClock = new AnalogClock('analog-clock');
const thermometer = new Thermometer('thermometer');

const CDI1 = new CourseDeviationIndicator('cdi-1');

socket.on('planeData', (data) => {
    updateIndicators(data);

    updateGauges(data);

    magneticCompass.update({angle: data.heading});
    adfNeedle.update({angle: data.adfHeading});
    analogClock.update({time: data.time});
});