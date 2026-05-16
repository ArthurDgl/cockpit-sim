// js/Gauges.js

const MID_BLACK = 'rgb(35, 35, 35)';
const LOW_BLACK = 'rgb(0, 0, 0)';
const HIGH_BLACK = 'rgb(50, 50, 50)';
const REDDISH = 'rgb(230, 30, 0)';

class CustomGauge {
    constructor(canvasId, name, labels = null, subdivisions = 1) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.radius = this.canvas.height / 2;

        this.ctx.translate(this.radius, this.radius);
        this.radius = this.radius * 0.90;

        this.name = name;

        this.labels = labels;
        this.subdivisions = subdivisions;
    }

    update(data) {
        const ctx = this.ctx;
        ctx.shadowColor = 'rgba(0, 0, 0, 0)';

        this.drawFace();
        this.drawLabels();
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

    drawFace() {
        const ctx = this.ctx;

        const background = ctx.createRadialGradient(
            0, 0, 0.9*this.radius,
            0, 0, this.radius
        );
        background.addColorStop(0, MID_BLACK);
        background.addColorStop(1, LOW_BLACK);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = background;
        
        const lw = this.radius * 0.1;
        ctx.lineWidth = lw;
        const outline = ctx.createRadialGradient(
            0, 0, this.radius - lw/2,
            0, 0, this.radius + lw/2
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

        const count = this.labels.length * this.subdivisions;
        const offsetAngle = 360 / count;

        for (let i = 0; i < count; i++) {
            const deg = i * offsetAngle;
            const rad = deg * Math.PI / 180;
            ctx.rotate(rad);

            const main = (i % this.subdivisions == 0);
            const length = main ? this.radius * 0.1 : this.radius * 0.06;
            ctx.lineWidth = main ? 2 : 1;
            ctx.strokeStyle = main ? 'white' : '#BBB';
            ctx.translate(0, -this.radius + lw/2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, length);
            ctx.stroke();
            ctx.translate(0, this.radius - lw/2);
            
            ctx.rotate(-rad);
        }
    }

    drawLabels() {
        const ctx = this.ctx;
        ctx.font = this.radius * 0.15 + "px arial";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";

        const count = this.labels.length;
        const offsetAngle = 360 / count;

        for (let i = 0; i < count; i++) {
            let ang = i * offsetAngle * Math.PI / 180;
            ctx.rotate(ang);
            ctx.translate(0, -this.radius * 0.75);
            ctx.rotate(-ang);
            ctx.fillText(this.labels[i].toString(), 0, 0);
            ctx.rotate(ang);
            ctx.translate(0, this.radius * 0.75);
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
}

class AnalogClock extends CustomGauge {
    constructor(canvasId, name = 'Time') {
        super(canvasId, name, [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 5);
    }

    drawMiddleLayer(time) {
        this.drawTime(time);
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

    drawMiddleLayer(angle) {
        this.drawNeedle(angle, REDDISH);
    }

    drawNeedle(angle, color) {
        const ctx = this.ctx;
        ctx.fillStyle = color;

        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.3);
        ctx.lineTo(-this.radius * 0.08, 0);
        ctx.lineTo(-this.radius * 0.01, this.radius * 0.84);
        ctx.lineTo(0, this.radius * 0.85);
        ctx.lineTo(this.radius * 0.01, this.radius * 0.84);
        ctx.lineTo(this.radius * 0.08, 0);
        ctx.fill();

        ctx.rotate(-angle);
    }
}