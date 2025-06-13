let canvasWidth = 800, canvasHeight = 800;

var canvas, ctx;

const bg = new Image();
bg.src = 'hbpitch.png';

var p0 = {x: -1, y: -1};
var p1 = {x: -1, y: -1};
var p2 = {x: -1, y: -1};

let pitchBounds = {
    x: 40,
    y: 55,
    w: 730,
    h: 730
}

let data = [];

const popup = {
    padding: 5,
    x: 0,
    y: 0,
    btnSize: 40,
    get w() {
        return this.btnSize * 2 + this.padding * 4;
    },
    get h() {
        return this.btnSize + this.padding * 2;
    },
    get buttonGoal() {
        return {x: this.x + this.padding, y: this.y + this.padding};
    },
    get buttonNoGoal() {
        return {x: this.x + this.padding*3 + this.btnSize, y: this.y + this.padding};
    }
};

// --- New grid logic ---
let gridNumbers = [1,2,3,4,5,6,7,8,9,10];
let selectedNumberIndex = null;

function renderGrid() {
    const grid = document.getElementById('list');
    let html = '<div id="number-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">';
    for (let i = 0; i < gridNumbers.length; i++) {
        const selectedClass = (i === selectedNumberIndex) ? 'selected' : '';
        html += `<button class="grid-btn ${selectedClass}" onclick="onGridButtonClick(${i})">${gridNumbers[i]}</button>`;
    }
    html += `<button class="grid-btn add-btn" onclick="onAddGridButton()">Add</button>`;
    html += '</div>';
    grid.innerHTML = html;
}

function onGridButtonClick(i) {
    selectedNumberIndex = i;
    renderGrid();
}

function onAddGridButton() {
    const val = prompt('Enter a new number or label:');
    if (val && val.trim() !== '') {
        gridNumbers.push(val.trim());
        renderGrid();
    }
}

let start = () => {
    function resizeCanvas() {
        canvasWidth = window.innerWidth;
        canvasHeight = canvasWidth; // 1:1 aspect ratio
        if (canvas) {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            console.log(canvasWidth, canvasHeight);
        }
        // Adjust pitchBounds to scale with canvas size
        pitchBounds.x = canvasWidth * 0.05;
        pitchBounds.y = canvasHeight * 0.07;
        pitchBounds.w = canvasWidth * 0.91;
        pitchBounds.h = canvasHeight * 0.91;
    }

    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    document.getElementById('canvas-container').appendChild(canvas);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        resetPoints();
    });

    window.requestAnimationFrame(loop);
}

const loop = () => {
    const ratio = bg.height / bg.width;
    const scaledHeight = canvas.width * ratio;
    ctx.drawImage(bg, 0, 0, canvas.width, scaledHeight);

    // Render only shots for the selected number
    if (selectedNumberIndex !== null) {
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d.number !== gridNumbers[selectedNumberIndex]) continue;
            const p0 = pitchToCanvas(Number(d.x0), Number(d.y0));
            const p1 = pitchToCanvas(Number(d.x1), Number(d.y1));
            const p2 = pitchToCanvas(Number(d.x2), Number(d.y2));
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = d.goal ? 'green' : 'red';
            ctx.lineWidth = 2;
            ctx.stroke();
            renderCircle(p0.x, p0.y);
            renderCircle(p1.x, p1.y);
            renderCircle(p2.x, p2.y);
        }
    }

    if (firstPointIn()) {
        renderCircle(p0.x, p0.y);
    }
    if (secondPointIn()) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
        renderCircle(p1.x, p1.y);
    }
    if (thirdPointIn()) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
        renderCircle(p2.x, p2.y);
    }

    window.requestAnimationFrame(loop);
}

const onClick = (e) => {
    if (selectedNumberIndex === null) {
        alert('Please select a number before registering a shot.');
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pitchCoords = canvasToPitch(x, y);
    if(pitchCoords.x < 0 || pitchCoords.x > 1 || pitchCoords.y < 0 || pitchCoords.y > 1) return;
    
    if (!firstPointIn()) {
        p0 = pitchToCanvas(pitchCoords.x, pitchCoords.y);
    } else if (!secondPointIn()) {
        p1 = pitchToCanvas(pitchCoords.x, pitchCoords.y);
    } else if (!thirdPointIn()) {
        p2 = pitchToCanvas(pitchCoords.x, pitchCoords.y);
        addData(false);
        resetPoints();
    }
}

const renderCircle = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.stroke();
}

const renderPopup = () => {
    ctx.fillStyle = 'black';
    ctx.fillRect(popup.x, popup.y, popup.w, popup.h);
    ctx.fillStyle = 'green';
    ctx.fillRect(popup.x + popup.padding, popup.y + popup.padding, popup.btnSize, popup.btnSize);

    ctx.fillStyle = 'red';
    ctx.fillRect(popup.x + popup.padding*3 + popup.btnSize, popup.y + popup.padding, popup.btnSize, popup.btnSize);
}

const canvasToPitch = (x, y) => {
    return {
        x: (x - pitchBounds.x) / pitchBounds.w,
        y: (y - pitchBounds.y) / pitchBounds.h
    }
}

const pitchToCanvas = (x, y) => {
    return {
        x: x * pitchBounds.w + pitchBounds.x,
        y: y * pitchBounds.h + pitchBounds.y
    }
}

const setPopupPositionFromLastPoint = (x, y) => {
    popup.x = x - popup.w/2;
    popup.y = y - popup.h - 10;
}

const isMouseInPopupButton = (mx, my, button) => {
    return mx >= button.x && mx <= button.x + popup.btnSize &&
        my >= button.y && my <= button.y + popup.btnSize;
}

const firstPointIn = () => {
    return p0.x != -1;
}

const secondPointIn = () => {
    return p1.x != -1;
}

const thirdPointIn = () => {
    return p2.x != -1;
}

const allPointsIn = () => {
    return firstPointIn() && secondPointIn() && thirdPointIn();
}

const resetPoints = () => {
    p0 = {x: -1, y: -1};
    p1 = {x: -1, y: -1};
    p2 = {x: -1, y: -1};
}

const popupActive = () => {
    return allPointsIn();
}

const addData = (goal) => {
    const pos0 = canvasToPitch(p0.x, p0.y);
    const pos1 = canvasToPitch(p1.x, p1.y);
    const pos2 = canvasToPitch(p2.x, p2.y);
    const newData = {
        x0: pos0.x.toFixed(3),
        y0: pos0.y.toFixed(3),
        x1: pos1.x.toFixed(3),
        y1: pos1.y.toFixed(3),
        x2: pos2.x.toFixed(3),
        y2: pos2.y.toFixed(3),
        goal: goal,
        number: gridNumbers[selectedNumberIndex]
    };
    data.push(newData);
}

// Call renderGrid after canvas is initialized
const originalStart = start;
start = function() {
    originalStart();
    renderGrid();
}

window.onload = start;