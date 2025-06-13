const canvasWidth = 800, canvasHeight = 800;

var canvas, ctx;

const bg = new Image();
bg.src = 'hbpitch.png';

var p0 = {x: -1, y: -1};
var p1 = {x: -1, y: -1};

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

const start = () => {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    document.getElementById('canvas-container').appendChild(canvas);

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        resetPoints();
    });

    window.requestAnimationFrame(loop);
}

// TODO: Render points on hover list element
const loop = () => {
    ctx.drawImage(bg, 0, 0, bg.width*2, bg.height*2);

    if (firstPointIn())
        renderCircle(p0.x, p0.y);
    if (secondPointIn()) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        renderCircle(p1.x, p1.y);
    }

    if (popupActive()) renderPopup();

    window.requestAnimationFrame(loop);
}

const onClick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (firstPointIn() && secondPointIn()) {
        if(isMouseInPopupButton(x, y, popup.buttonGoal)) {
            addData(true);
            resetPoints();
            return;
        } else if(isMouseInPopupButton(x, y, popup.buttonNoGoal)) {
            addData(false);
            resetPoints();
            return;
        }
    }

    // TODO: First click only works outisde the area
    const pitchCoords = canvasToPitch(x, y);
    if(pitchCoords.x < 0 || pitchCoords.x > 1 || pitchCoords.y < 0 || pitchCoords.y > 1) return;
    if (!firstPointIn()) p0 = pitchToCanvas(pitchCoords.x, pitchCoords.y);
    else {
        p1 = pitchToCanvas(pitchCoords.x, pitchCoords.y);
        setPopupPositionFromLastPoint(p1.x, p1.y);
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

const resetPoints = () => {
    p0 = {x: -1, y: -1};
    p1 = {x: -1, y: -1};
}

const popupActive = () => {
    return firstPointIn() && secondPointIn();
}

const addData = (goal) => {
    const pos0 = canvasToPitch(p0.x, p0.y);
    const pos1 = canvasToPitch(p1.x, p1.y);
    const newData = {
        x0: pos0.x.toFixed(3),
        y0: pos0.y.toFixed(3),
        x1: pos1.x.toFixed(3),
        y1: pos1.y.toFixed(3),
        goal: goal
    };

    data.push(newData);
    renderData();
}

const renderData = () => {
    let list = document.getElementById('list');
    let html = '';
    for(let i = data.length-1; i > -1; i--) {
        const d = data[i];
        html += listElementTemplate(i, d);
    }
    list.innerHTML = html;
}

const listOnClick = (i) => {
    data.splice(i, 1);
    renderData();
}

const listElementTemplate = (i, d) => {
    return `<li class="list-element" onclick="listOnClick(${i})">
                ${i+1}: (${d.x0}, ${d.y0}) -> (${d.x1}, ${d.y1}) -> ${d.goal ? 'Goal' : 'No goal'}
            </li>`;
}

window.onload = start;