// ──────────────────────────────────────────────────────────────────
// Base de datos: efecto de localía (goles local - goles visita)
// por equipo y temporada, tomado directamente de data.json
// ──────────────────────────────────────────────────────────────────
const database = [
    { code: 'RM-1617',  team: 'Real Madrid',  season: '16-17', goalsHome: 48, goalsAway: 58 },
    { code: 'RM-1718',  team: 'Real Madrid',  season: '17-18', goalsHome: 54, goalsAway: 40 },
    { code: 'RM-1819',  team: 'Real Madrid',  season: '18-19', goalsHome: 32, goalsAway: 31 },
    { code: 'RM-1920',  team: 'Real Madrid',  season: '19-20', goalsHome: 40, goalsAway: 30 },
    { code: 'RM-2021',  team: 'Real Madrid',  season: '20-21', goalsHome: 33, goalsAway: 34 },
    { code: 'RM-2122',  team: 'Real Madrid',  season: '21-22', goalsHome: 44, goalsAway: 36 },
    { code: 'FCB-1617', team: 'FC Barcelona', season: '16-17', goalsHome: 64, goalsAway: 52 },
    { code: 'FCB-1718', team: 'FC Barcelona', season: '17-18', goalsHome: 53, goalsAway: 46 },
    { code: 'FCB-1819', team: 'FC Barcelona', season: '18-19', goalsHome: 51, goalsAway: 39 },
    { code: 'FCB-1920', team: 'FC Barcelona', season: '19-20', goalsHome: 52, goalsAway: 34 },
    { code: 'FCB-2021', team: 'FC Barcelona', season: '20-21', goalsHome: 44, goalsAway: 41 },
    { code: 'FCB-2122', team: 'FC Barcelona', season: '21-22', goalsHome: 37, goalsAway: 31 }
];

// ──────────────────────────────────────────────────────────────────
// Audios: reemplaza estas rutas por tus archivos finales
// ──────────────────────────────────────────────────────────────────
const audioWin  = new Audio('audio/victoria.mp3');
const audioLose = new Audio('audio/derrota.mp3');

// ──────────────────────────────────────────────────────────────────
// Referencias al DOM
// ──────────────────────────────────────────────────────────────────
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d', { willReadFrequently: true });
const placeholder = document.getElementById('placeholder');

const btnStart = document.getElementById('btn-start');
const btnCalibrate = document.getElementById('btn-calibrate');
const btnReset = document.getElementById('btn-reset');

const cardA = document.getElementById('card-a');
const cardALabel = document.getElementById('card-a-label');
const cardAStat = document.getElementById('card-a-stat');
const cardAHeight = document.getElementById('card-a-height');

const cardB = document.getElementById('card-b');
const cardBLabel = document.getElementById('card-b-label');
const cardBStat = document.getElementById('card-b-stat');
const cardBHeight = document.getElementById('card-b-height');

const statusBanner = document.getElementById('status-banner');
const debugInfo = document.getElementById('debug-info');

const thresholdSlider = document.getElementById('threshold');
const thresholdVal = document.getElementById('threshold-val');
const brightnessSlider = document.getElementById('brightness');
const brightnessVal = document.getElementById('brightness-val');

let running = false;
let calibrating = false;

let rowA = null, rowB = null;                     // datos del cubo izquierdo / derecho, una vez leídos por QR
let baselineLeftY = null, baselineRightY = null;  // altura de referencia calibrada (balanza vacía)
let smoothedLeftY = null, smoothedRightY = null;
let lastTriggeredKey = null;

// ──────────────────────────────────────────────────────────────────
// Utilidades de datos
// ──────────────────────────────────────────────────────────────────
function lookup(code) {
    return database.find(r => r.code.toUpperCase() === code.toUpperCase()) || null;
}

function localiaEffect(row) {
    return row.goalsHome - row.goalsAway;
}

function formatEffect(row) {
    const eff = localiaEffect(row);
    return (eff >= 0 ? '+' : '') + eff;
}

function playSound(key) {
    [audioWin, audioLose].forEach(a => { a.pause(); a.currentTime = 0; });
    const el = { win: audioWin, lose: audioLose }[key];
    if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
    }
}

// ──────────────────────────────────────────────────────────────────
// Carga de audios personalizados
// ──────────────────────────────────────────────────────────────────
function setupAudioInput(inputId, nameId, targetAudio) {
    const input = document.getElementById(inputId);
    const nameEl = document.getElementById(nameId);
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        targetAudio.src = URL.createObjectURL(file);
        nameEl.textContent = file.name;
    });
}
setupAudioInput('audio-win', 'audio-win-name', audioWin);
setupAudioInput('audio-lose', 'audio-lose-name', audioLose);

thresholdSlider.addEventListener('input', () => {
    thresholdVal.textContent = thresholdSlider.value + 'px';
});
brightnessSlider.addEventListener('input', () => {
    brightnessVal.textContent = brightnessSlider.value;
});

// ──────────────────────────────────────────────────────────────────
// Botones principales
// ──────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        video.srcObject = stream;
        await video.play();
        placeholder.style.display = 'none';
        btnStart.textContent = 'Cámara activa';
        btnStart.disabled = true;
        btnCalibrate.disabled = false;
        running = true;
        requestAnimationFrame(processFrame);
    } catch (err) {
        placeholder.textContent = 'No se pudo acceder a la cámara: ' + err.message;
    }
});

btnCalibrate.addEventListener('click', () => {
    calibrating = true;
    btnCalibrate.textContent = 'Capturando nivel...';
    setTimeout(() => {
        calibrating = false;
        btnCalibrate.textContent = 'Calibrar nivel';
    }, 500);
});

btnReset.addEventListener('click', resetAll);

function resetAll() {
    rowA = null;
    rowB = null;
    baselineLeftY = null;
    baselineRightY = null;
    smoothedLeftY = null;
    smoothedRightY = null;
    lastTriggeredKey = null;

    cardALabel.textContent = 'Sin leer QR';
    cardAStat.textContent = '—';
    cardAHeight.textContent = 'Canastilla: sin detectar';
    cardA.classList.remove('gana', 'pierde');

    cardBLabel.textContent = 'Sin leer QR';
    cardBStat.textContent = '—';
    cardBHeight.textContent = 'Canastilla: sin detectar';
    cardB.classList.remove('gana', 'pierde');

    setBanner('Paso 1: escanea ambos cubos', 'neutral');
}

function setBanner(text, mode) {
    statusBanner.textContent = text;
    statusBanner.classList.remove('gana', 'espera');
    if (mode === 'gana') statusBanner.classList.add('gana');
    if (mode === 'espera') statusBanner.classList.add('espera');
}

// ──────────────────────────────────────────────────────────────────
// Detección de canastillas: busca la mancha de píxeles blancos/
// neutros más grande en cada mitad del cuadro (izquierda/derecha)
// y devuelve su centroide. Esa posición vertical (y) es lo que
// usamos como "altura" de cada canastilla en cada frame.
// ──────────────────────────────────────────────────────────────────
function findBrightBlob(data, w, h, xStart, xEnd, minBrightness) {
    let sumX = 0, sumY = 0, count = 0;
    const step = 3;
    for (let y = 0; y < h; y += step) {
        for (let x = xStart; x < xEnd; x += step) {
            const i = (y * w + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const brightness = (r + g + b) / 3;
            const isNeutral = Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && Math.abs(r - b) < 25;
            if (brightness > minBrightness && isNeutral) {
                sumX += x;
                sumY += y;
                count++;
            }
        }
    }
    if (count < 40) return null;
    return { x: sumX / count, y: sumY / count, count };
}

// ──────────────────────────────────────────────────────────────────
// Lectura de QR (identidad de cada cubo). Se intenta leer el cuadro
// completo primero; si falla, se divide en mitad izquierda/derecha.
// Una vez que un cubo queda identificado (rowA o rowB), no se vuelve
// a leer — así no se pierde la identidad si el QR queda tapado por
// la mano del usuario al poner el cubo en la canastilla.
// ──────────────────────────────────────────────────────────────────
function detectQrCodes(data, w, h, midX) {
    if (rowA && rowB) return;

    const fullCode = jsQR(data, w, h);
    let codes = [];

    if (fullCode) {
        codes.push(fullCode);
    } else {
        const leftData = ctx.getImageData(0, 0, midX, h);
        const rightData = ctx.getImageData(midX, 0, w - midX, h);
        const lc = jsQR(leftData.data, leftData.width, leftData.height);
        const rc = jsQR(rightData.data, rightData.width, rightData.height);
        if (lc) { lc._side = 'left'; codes.push(lc); }
        if (rc) { rc._side = 'right'; codes.push(rc); }
    }

    codes.forEach((code) => {
        const cx = code.location.topLeftCorner.x + (code._side === 'right' ? midX : 0);
        const row = lookup(code.data.trim());
        if (!row) return;

        if (cx < midX && !rowA) {
            rowA = row;
            cardALabel.textContent = row.team;
            cardAStat.textContent = `${row.season} (${formatEffect(row)})`;
        } else if (cx >= midX && !rowB) {
            rowB = row;
            cardBLabel.textContent = row.team;
            cardBStat.textContent = `${row.season} (${formatEffect(row)})`;
        }
    });
}

// ──────────────────────────────────────────────────────────────────
// Loop principal: corre en cada frame de video
// ──────────────────────────────────────────────────────────────────
function processFrame() {
    if (!running) return;

    const w = overlay.width = video.videoWidth || 640;
    const h = overlay.height = video.videoHeight || 480;
    if (w === 0 || h === 0) {
        requestAnimationFrame(processFrame);
        return;
    }

    ctx.drawImage(video, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h);
    const data = frame.data;
    const midX = Math.floor(w / 2);

    // 1. Identidad de los cubos (solo hasta que ambos estén leídos)
    detectQrCodes(data, w, h, midX);

    // 2. Posición vertical real de cada canastilla
    const minBrightness = parseInt(brightnessSlider.value, 10);
    const leftBlob = findBrightBlob(data, w, h, 0, midX, minBrightness);
    const rightBlob = findBrightBlob(data, w, h, midX, w, minBrightness);

    if (leftBlob) {
        smoothedLeftY = smoothedLeftY === null ? leftBlob.y : smoothedLeftY * 0.7 + leftBlob.y * 0.3;
        drawMarker(leftBlob.x, leftBlob.y, '#3B82C4');
    }
    if (rightBlob) {
        smoothedRightY = smoothedRightY === null ? rightBlob.y : smoothedRightY * 0.7 + rightBlob.y * 0.3;
        drawMarker(rightBlob.x, rightBlob.y, '#D4537E');
    }

    if (calibrating && smoothedLeftY !== null && smoothedRightY !== null) {
        baselineLeftY = smoothedLeftY;
        baselineRightY = smoothedRightY;
    }

    updateStatus();

    requestAnimationFrame(processFrame);
}

function drawMarker(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
}

// ──────────────────────────────────────────────────────────────────
// Estado general + disparo de sonido.
// El sonido SOLO suena cuando la canastilla ya cayó físicamente más
// que el umbral definido — no en el instante en que se leen los QR.
// ──────────────────────────────────────────────────────────────────
function updateStatus() {
    if (!rowA || !rowB) {
        setBanner('Paso 1: escanea ambos cubos', 'neutral');
        debugInfo.textContent = `QR izquierdo: ${rowA ? rowA.code : '—'} · QR derecho: ${rowB ? rowB.code : '—'}`;
        return;
    }

    if (baselineLeftY === null || baselineRightY === null) {
        setBanner('Paso 2: presiona "Calibrar nivel" con la balanza vacía', 'espera');
        cardAHeight.textContent = `Canastilla: ${smoothedLeftY !== null ? 'detectada, sin calibrar' : 'sin detectar'}`;
        cardBHeight.textContent = `Canastilla: ${smoothedRightY !== null ? 'detectada, sin calibrar' : 'sin detectar'}`;
        return;
    }

    if (smoothedLeftY === null || smoothedRightY === null) {
        setBanner('No se detectan ambas canastillas — ajusta cámara o brillo', 'neutral');
        return;
    }

    const threshold = parseInt(thresholdSlider.value, 10);
    const dropLeft = smoothedLeftY - baselineLeftY;
    const dropRight = smoothedRightY - baselineRightY;

    cardAHeight.textContent = `Canastilla: cayó ${Math.round(dropLeft)}px`;
    cardBHeight.textContent = `Canastilla: cayó ${Math.round(dropRight)}px`;
    debugInfo.textContent = `Caída izq: ${Math.round(dropLeft)}px · Caída der: ${Math.round(dropRight)}px`;

    const leftFell = dropLeft > threshold && dropLeft > dropRight;
    const rightFell = dropRight > threshold && dropRight > dropLeft;

    if (leftFell) {
        announceWinner('A', rowA, rowB);
    } else if (rightFell) {
        announceWinner('B', rowB, rowA);
    } else {
        cardA.classList.remove('gana', 'pierde');
        cardB.classList.remove('gana', 'pierde');
        setBanner('Balanza aún nivelada — esperando inclinación', 'neutral');
        lastTriggeredKey = null;
    }
}

// ──────────────────────────────────────────────────────────────────
// Anuncia al cubo que físicamente hizo caer la balanza, y conecta
// explícitamente ese resultado físico con el dato de localía que
// ya sabíamos por el QR — porque el peso de cada cubo está hecho
// a propósito para ser proporcional a ese dato.
// ──────────────────────────────────────────────────────────────────
function announceWinner(side, winnerRow, loserRow) {
    const winnerCard = side === 'A' ? cardA : cardB;
    const loserCard = side === 'A' ? cardB : cardA;

    winnerCard.classList.add('gana');
    winnerCard.classList.remove('pierde');
    loserCard.classList.add('pierde');
    loserCard.classList.remove('gana');

    const winnerEff = localiaEffect(winnerRow);
    const loserEff = localiaEffect(loserRow);

    const message = winnerEff > loserEff
        ? `${winnerRow.team} ${winnerRow.season} (${formatEffect(winnerRow)}) pesa más por su mayor efecto de localía — la balanza lo confirma`
        : `${winnerRow.team} ${winnerRow.season} hizo caer la balanza, aunque su efecto de localía (${formatEffect(winnerRow)}) es menor que el de ${loserRow.team} ${loserRow.season} (${formatEffect(loserRow)}) — revisa la calibración de pesos`;

    setBanner(message, 'gana');

    if (lastTriggeredKey !== side) {
        lastTriggeredKey = side;
        playSound('win');
    }
}
