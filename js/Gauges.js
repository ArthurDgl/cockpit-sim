// js/Gauges.js

class Horloge {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.radius = this.canvas.height / 2;

        // On centre le contexte
        this.ctx.translate(this.radius, this.radius);
        // On réduit le rayon pour que le contour ne soit pas coupé
        this.radius = this.radius * 0.90;
    }

    update() {
        this.drawFace();
        this.drawNumbers();
        this.drawTime();
    }

    drawFace() {
        const ctx = this.ctx;
        
        // 1. Fond du cercle en blanc
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        // 2. Contour en noir
        ctx.strokeStyle = 'black';
        ctx.lineWidth = this.radius * 0.05; // Épaisseur proportionnelle
        ctx.stroke();

        // 3. Petit point central noir
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.05, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();
    }

    drawNumbers() {
        const ctx = this.ctx;
        ctx.font = this.radius * 0.15 + "px arial";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "black"; // Chiffres en noir

        for (let num = 1; num < 13; num++) {
            let ang = num * Math.PI / 6;
            ctx.rotate(ang);
            ctx.translate(0, -this.radius * 0.85);
            ctx.rotate(-ang);
            ctx.fillText(num.toString(), 0, 0);
            ctx.rotate(ang);
            ctx.translate(0, this.radius * 0.85);
            ctx.rotate(-ang);
        }
    }

    drawTime() {
        const now = new Date();
        let hour = now.getHours() % 12;
        let minute = now.getMinutes();
        let second = now.getSeconds();

        // Heure
        hour = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
        this.drawHand(hour, this.radius * 0.5, this.radius * 0.07, "black");

        // Minute
        minute = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
        this.drawHand(minute, this.radius * 0.8, this.radius * 0.07, "black");

        // Seconde
        second = (second * Math.PI / 30);
        this.drawHand(second, this.radius * 0.9, this.radius * 0.02, "red");
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

// js/Gauges.js (à ajouter à la suite de la classe Horloge)

class Boussole {
    constructor(canvasId, label = "HDG") {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.radius = this.canvas.height / 2;
        this.label = label;
        this.capActuel = 0; // Valeur par défaut

        this.ctx.translate(this.radius, this.radius);
        this.radius = this.radius * 0.90;
    }

    // On passe la valeur reçue du simulateur ici
    update(valeurCap) {
        this.capActuel = valeurCap;
        this.drawFace();
        this.drawRoseDesVents();
        this.drawAiguille();
    }

    drawFace() {
        const ctx = this.ctx;
        ctx.clearRect(-this.canvas.width/2, -this.canvas.height/2, this.canvas.width, this.canvas.height);

        // Fond blanc
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        // Contour noir
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Affichage du label (HDG, etc.)
        ctx.fillStyle = "black";
        ctx.font = `bold ${this.radius * 0.2}px arial`;
        ctx.fillText(this.label, 0, this.radius * 0.4);
    }

    drawRoseDesVents() {
        const ctx = this.ctx;
        const points = ["N", "3", "6", "E", "12", "15", "S", "21", "24", "W", "30", "33"];
        
        ctx.font = this.radius * 0.15 + "px arial";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        points.forEach((point, i) => {
            let ang = i * Math.PI / 6;
            ctx.rotate(ang);
            ctx.translate(0, -this.radius * 0.8);
            ctx.rotate(-ang);
            ctx.fillText(point, 0, 0);
            ctx.rotate(ang);
            ctx.translate(0, this.radius * 0.8);
            ctx.rotate(-ang);
        });
    }

    drawAiguille() {
        const ctx = this.ctx;
        // Conversion du cap (0-360) en radians
        let angle = (this.capActuel * Math.PI / 180);

        ctx.rotate(angle);
        
        // Dessin de l'aiguille (style aviation : une flèche)
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "red";
        ctx.moveTo(0, this.radius * 0.2); // Bas de l'aiguille
        ctx.lineTo(0, -this.radius * 0.9); // Pointe
        
        // Pointe de la flèche
        ctx.moveTo(-10, -this.radius * 0.7);
        ctx.lineTo(0, -this.radius * 0.9);
        ctx.lineTo(10, -this.radius * 0.7);
        
        ctx.stroke();
        ctx.rotate(-angle);
    }
}