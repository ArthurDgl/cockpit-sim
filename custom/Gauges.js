// js/Gauges.js

const MID_BLACK = 'rgb(35, 35, 35)';
const LOW_BLACK = 'rgb(15, 15, 15)';
const HIGH_BLACK = 'rgb(50, 50, 50)';
const REDDISH = 'rgb(230, 30, 0)';

class CustomGauge {
    constructor(canvasId, name, labels, subdivisions = 1, swapSpokesAndLabels = false, startAngle = 0, stopAngle = 360) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.radius = this.canvas.height / 2;

        this.ctx.translate(this.radius, this.radius);
        this.radius = this.radius * 0.90;

        this.name = name;

        this.labels = labels;
        this.subdivisions = subdivisions;

        this.spokeLength = 0.12 * this.radius;
        this.outerLineWidth = this.radius * 0.1;
        this.textSize = this.radius * 0.15;
        this.innerDialRadius = this.radius - this.outerLineWidth/2 - this.spokeLength - this.textSize * 1.3;

        this.startAngle = startAngle;
        this.stopAngle = stopAngle;

        this.dialOffset = 0;

        if ((this.stopAngle - this.startAngle) % 360 == 0) {
            this.labels.push('');
        }

        this.swapSpokesAndLabels = swapSpokesAndLabels;

        requestAnimationFrame(() => {this.update()});
    }

    update(data = {}) {
        const ctx = this.ctx;
        ctx.shadowColor = 'rgba(0, 0, 0, 0)';

        const offset = data.dialOffset ?? this.dialOffset;
        this.dialOffset = offset;

        this.drawFace(-offset);
        this.drawLabels(-offset);
        this.completeBottomLayer(data);

        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 10;

        this.drawMiddleLayer(data);

        this.drawDot();
    }

    completeBottomLayer(data) {
        return;
    }

    drawMiddleLayer(data) {
        return;
    }

    drawFace(dialOffset) {
        const ctx = this.ctx;

        const background = ctx.createRadialGradient(
            0, 0, (this.radius - this.outerLineWidth/2)*0.95,
            0, 0, this.radius - this.outerLineWidth/2
        );
        background.addColorStop(0, MID_BLACK);
        background.addColorStop(1, LOW_BLACK);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = background;
        
        ctx.lineWidth = this.outerLineWidth;
        const outline = ctx.createRadialGradient(
            0, 0, this.radius - this.outerLineWidth/2,
            0, 0, this.radius + this.outerLineWidth/2
        );
        outline.addColorStop(0, HIGH_BLACK);
        outline.addColorStop(0.2, MID_BLACK);
        outline.addColorStop(0.8, MID_BLACK);
        outline.addColorStop(1, HIGH_BLACK);
        ctx.strokeStyle = outline;

        ctx.fill();
        ctx.stroke();

        ctx.font = "bold " + this.radius * 0.20 + "px arial";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.fillText(this.name, 0, this.radius * 0.3);

        ctx.lineCap = 'butt';

        const count = (this.labels.length - 1) * this.subdivisions;
        const offsetAngle = (this.stopAngle - this.startAngle) / count;

        const start = this.swapSpokesAndLabels ? this.innerDialRadius : this.radius - this.outerLineWidth/2;

        for (let i = 0; i <= count; i++) {
            const deg = this.startAngle + i * offsetAngle + dialOffset;
            const rad = deg * Math.PI / 180;
            ctx.rotate(rad);

            const main = (i % this.subdivisions == 0);
            const length = main ? this.spokeLength : this.spokeLength * 0.75;
            ctx.lineWidth = main ? 2 : 1;
            ctx.strokeStyle = main ? 'white' : '#BBB';
            ctx.translate(0, -start);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, this.swapSpokesAndLabels ? -length : length);
            ctx.stroke();
            ctx.translate(0, start);
            
            ctx.rotate(-rad);
        }
    }

    drawLabels(dialOffset) {
        const ctx = this.ctx;
        ctx.font = this.textSize + "px arial";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";

        const count = this.labels.length - 1;
        const offsetAngle = (this.stopAngle - this.startAngle) / count;

        const radius = this.swapSpokesAndLabels ? this.radius * 0.84 : this.radius * 0.75;

        for (let i = 0; i <= count; i++) {
            let ang = (this.startAngle + i * offsetAngle + dialOffset) * Math.PI / 180;
            ctx.rotate(ang);
            ctx.translate(0, -radius);
            ctx.rotate(-ang);
            ctx.fillText(this.labels[i].toString(), 0, 0);
            ctx.rotate(ang);
            ctx.translate(0, radius);
            ctx.rotate(-ang);
        }
    }

    drawDot() {
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.1, 0, 2 * Math.PI);
        ctx.fillStyle = MID_BLACK;
        ctx.fill();
    }

    drawHand(pos, length, width, color) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.strokeStyle = color;
        ctx.moveTo(0, 0);
        ctx.rotate(pos);
        ctx.lineTo(0, -length);
        ctx.stroke();
        ctx.rotate(-pos);
    }

    drawNeedle(angle, color) {
        const ctx = this.ctx;
        ctx.fillStyle = color;

        ctx.rotate((angle - 180) * Math.PI / 180);

        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.3);
        ctx.lineTo(-this.radius * 0.08, 0);
        ctx.lineTo(-this.radius * 0.01, this.radius * 0.84);
        ctx.lineTo(0, this.radius * 0.85);
        ctx.lineTo(this.radius * 0.01, this.radius * 0.84);
        ctx.lineTo(this.radius * 0.08, 0);
        ctx.fill();

        ctx.rotate(-(angle - 180) * Math.PI / 180);
    }
}

class DetachedDialGauge extends CustomGauge {
    constructor(canvasId, name, labels, subdivisions, startAngle, stopAngle) {
        super(canvasId, name, labels, subdivisions, true);
    }

    completeBottomLayer(data) {
        this.drawInnerDialShadow();
    }

    drawInnerDialShadow() {
        const ctx = this.ctx;

        const radius = this.innerDialRadius;
        
        const gradient = ctx.createRadialGradient(
            0, 0, 0.92*radius,
            0, 0, radius
        );
        gradient.addColorStop(0, 'rgba(15, 15, 15, 0)');
        gradient.addColorStop(1, LOW_BLACK);

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

class CourseDeviationIndicator extends DetachedDialGauge {
    constructor(canvasId) {
        super(canvasId, "", ['N', 3, 6, 'E', 12, 15, 'S', 21, 24, 'W', 30, 33], 6);

        this.needleOffset = 0;
        this.toFromFlag = 0;
    }

    drawDot() {
        return;
    }

    drawMiddleLayer(data) {
        const ctx = this.ctx;

        this.drawTriangle();
        ctx.rotate(Math.PI);
        this.drawTriangle();
        ctx.rotate(Math.PI);

        const totalLength = this.radius * 0.5;

        this.drawNotches(totalLength);
        ctx.rotate(Math.PI/2);
        this.drawNotches(totalLength);
        ctx.rotate(-Math.PI/2);

        const toFromFlag = data?.toFromFlag ?? this.toFromFlag;
        this.toFromFlag = toFromFlag;

        this.drawToFromFlag(toFromFlag);

        const needleOffset = data?.needleOffset ?? this.needleOffset;
        this.needleOffset = needleOffset;

        this.drawVerticalNeedle(needleOffset * totalLength / 254);
    }

    drawToFromFlag(toFromFlag) {
        if (toFromFlag == 0) return;

        const ctx = this.ctx;

        ctx.translate(this.radius * 0.35, -this.radius * 0.3);

        ctx.fillStyle = 'white';

        if (toFromFlag == 2) ctx.rotate(Math.PI);

        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.15);
        ctx.lineTo(-this.radius * 0.15, 0);
        ctx.lineTo(this.radius * 0.15, 0);
        ctx.fill();

        if (toFromFlag == 2) ctx.rotate(Math.PI);

        ctx.font = "bold " + this.radius*0.08 + "px arial";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "black";

        ctx.fillText(toFromFlag == 1 ? 'TO' : 'FROM', 0, toFromFlag == 1 ? -this.radius*0.04 : this.radius*0.04);

        ctx.translate(-this.radius * 0.35, this.radius * 0.3);
    }

    drawVerticalNeedle(offset) {
        const ctx = this.ctx;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(offset, -this.radius * 0.55);
        ctx.lineTo(offset, this.radius * 0.55);
        ctx.stroke();
    }

    drawNotches(totalLength) {
        const ctx = this.ctx;

        const ticks = 5;
        const tick = totalLength/ticks;

        const tickLength = this.radius * 0.05;

        ctx.strokeStyle = '#888';

        for (let i = -ticks; i <= ticks; i++) {
            ctx.beginPath();
            ctx.moveTo(i*tick, -tickLength);
            ctx.lineTo(i*tick, tickLength);
            ctx.stroke();
        }
    }

    drawTriangle() {
        const ctx = this.ctx;
        const triangleSize = this.radius*0.06;

        ctx.fillStyle = 'white';

        ctx.translate(0, -this.innerDialRadius);
        ctx.beginPath();
        ctx.moveTo(0, -triangleSize);
        ctx.lineTo(triangleSize, triangleSize);
        ctx.lineTo(-triangleSize, triangleSize);
        ctx.fill();
        ctx.translate(0, this.innerDialRadius);
    }
}

class AnalogClock extends CustomGauge {
    constructor(canvasId, name = 'Time') {
        super(canvasId, name, [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 5);
    }

    drawMiddleLayer(data) {
        this.drawTime(data.time ?? 0);
    }

    drawTime(time) {
        // time is in seconds since midnight
        let hour = Math.floor(time / 3600);
        let minute = Math.floor((time - hour * 3600) / 60);
        let second = time - hour * 3600 - minute * 60;

        hour = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
        this.drawHand(hour, this.radius * 0.5, this.radius * 0.07, "white");

        minute = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
        this.drawHand(minute, this.radius * 0.75, this.radius * 0.07, "white");

        second = (second * Math.PI / 30);
        this.drawHand(second, this.radius * 0.9, this.radius * 0.02, REDDISH);
    }
}

class Compass extends CustomGauge {
    constructor(canvasId, name = 'Compass') {
        super(canvasId, name, ['N', 3, 6, 'E', 12, 15, 'S', 21, 24, 'W', 30, 33], 3);
    }

    drawMiddleLayer(data) {
        this.drawNeedle(data.angle ?? 0, REDDISH);
    }
}
class Thermometer extends CustomGauge{
    constructor(canvasId, name = 'Th °C') {
        super(canvasId, name, [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60, 70], 5, false, -150, 150);
    }
    drawMiddleLayer(data) {
        this.drawNeedle(data.angle ?? 0, "white");
    }
}

class Suction_Gauge extends CustomGauge{
    constructor(canvasId, name = 'inHg') {
        super(canvasId, name, [0, 2, 4, 6, 8, 10], 10, false, -150, 150);
    }
    drawMiddleLayer(data) {
        this.drawNeedle(data.angle ?? 0, "white");
    }
}

class AMmeter extends CustomGauge{
    constructor(canvasId, name = 'AMP') {
        super(canvasId, name, [-60,-30,0,30,60], 3, false, -90,90);
    }
    drawMiddleLayer(data) {
        this.drawNeedle(data.angle ?? 0, "white");
    }
}