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
const audioTie  = new Audio('audio/empate.mp3'); // opcional

// ──────────────────────────────────────────────────────────────────
// Referencias al DOM
// ──────────────────────────────────────────────────────────────────
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d', { willReadFrequently: true });
const placeholder = document.getElementById('placeholder');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');

const cardA = document.getElementById('card-a');
const cardALabel = document.getElementById('card-a-label');
const cardAStat = document.getElementById('card-a-stat');
const cardB = document.getElementById('card-b');
const cardBLabel = document.getElementById('card-b-label');
const cardBStat = document.getElementById('card-b-stat');

const statusBanner = document.getElementById('status-banner');
const debugInfo = document.getElementById('debug-info');

let running = false;
let lastResultKey = null; // evita repetir el sonido en cada frame mientras los cubos no cambian

// ──────────────────────────────────────────────────────────────────
// Utilidades de datos
// ──────────────────────────────────────────────────────────────────
function lookup(code) {
    return database.find(r => r.code.toUpperCase() === code.toUpperCase()) || null;
}

function localiaEffect(row) {
    return row.goalsHome - row.goalsAway;
}

function playSound(key) {
    [audioWin, audioLose, audioTie].forEach(a => {
        a.pause();
        a.currentTime = 0;
    });
    const el = { win: audioWin, lose: audioLose, tie: audioTie }[key];
    if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
    }
}

// ──────────────────────────────────────────────────────────────────
// Inicio de cámara
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
        running = true;
        requestAnimationFrame(processFrame);
    } catch (err) {
        placeholder.textContent = 'No se pudo acceder a la cámara: ' + err.message;
    }
});

btnReset.addEventListener('click', resetCards);

function resetCards() {
    cardALabel.textContent = 'Sin leer';
    cardAStat.textContent = '—';
    cardA.classList.remove('gana', 'pierde');
    cardBLabel.textContent = 'Sin leer';
    cardBStat.textContent = '—';
    cardB.classList.remove('gana', 'pierde');
    statusBanner.textContent = 'Esperando ambos cubos';
    statusBanner.classList.remove('gana', 'empate');
    lastResultKey = null;
}

// ──────────────────────────────────────────────────────────────────
// Lectura de QR por frame
// Estrategia: primero intenta leer el cuadro completo (sirve si los
// dos QR caben en un solo patrón detectable). Si falla, divide el
// cuadro en mitad izquierda / mitad derecha y busca un QR en cada
// mitad por separado — así no depende de que ambos códigos estén
// perfectamente alineados en la misma franja horizontal.
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

    let foundCodes = [];
    const fullCode = jsQR(frame.data, w, h);

    if (fullCode) {
        foundCodes.push(fullCode);
    } else {
        const leftData = ctx.getImageData(0, 0, Math.floor(w / 2), h);
        const rightData = ctx.getImageData(Math.floor(w / 2), 0, Math.ceil(w / 2), h);
        const leftCode = jsQR(leftData.data, leftData.width, leftData.height);
        const rightCode = jsQR(rightData.data, rightData.width, rightData.height);
        if (leftCode) { leftCode._side = 'left'; foundCodes.push(leftCode); }
        if (rightCode) { rightCode._side = 'right'; foundCodes.push(rightCode); }
    }

    drawDetectionBoxes(foundCodes, w);
    evaluateFoundCodes(foundCodes);

    requestAnimationFrame(processFrame);
}

function drawDetectionBoxes(foundCodes, frameWidth) {
    ctx.strokeStyle = '#1D9E75';
    ctx.lineWidth = 3;
    foundCodes.forEach(code => {
        const loc = code.location;
        const offsetX = code._side === 'right' ? Math.floor(frameWidth / 2) : 0;
        ctx.beginPath();
        ctx.moveTo(loc.topLeftCorner.x + offsetX, loc.topLeftCorner.y);
        ctx.lineTo(loc.topRightCorner.x + offsetX, loc.topRightCorner.y);
        ctx.lineTo(loc.bottomRightCorner.x + offsetX, loc.bottomRightCorner.y);
        ctx.lineTo(loc.bottomLeftCorner.x + offsetX, loc.bottomLeftCorner.y);
        ctx.closePath();
        ctx.stroke();
    });
}

function evaluateFoundCodes(foundCodes) {
    if (foundCodes.length >= 2) {
        // Ordena por posición horizontal solo para mostrarlos como
        // "cubo A / cubo B" en pantalla — esto NO afecta qué sonido
        // suena, porque el sonido sigue al resultado, no a la posición
        const sorted = foundCodes.slice(0, 2).sort(
            (a, b) => a.location.topLeftCorner.x - b.location.topLeftCorner.x
        );
        const codeA = sorted[0].data.trim();
        const codeB = sorted[1].data.trim();
        const rowA = lookup(codeA);
        const rowB = lookup(codeB);

        debugInfo.textContent = `QR detectados: ${codeA} · ${codeB}`;

        if (rowA && rowB) {
            evaluatePair(rowA, rowB);
        } else {
            statusBanner.textContent = 'QR leído pero no encontrado en la base de datos';
            statusBanner.classList.remove('gana', 'empate');
        }
    } else if (foundCodes.length === 1) {
        debugInfo.textContent = `Solo 1 QR detectado: ${foundCodes[0].data.trim()} — falta el segundo cubo`;
        statusBanner.textContent = 'Falta el segundo cubo';
        statusBanner.classList.remove('gana', 'empate');
    } else {
        debugInfo.textContent = 'Sin códigos QR detectados';
    }
}

// ──────────────────────────────────────────────────────────────────
// Lógica de comparación: el sonido sigue al cubo ganador (por
// diferencia de efecto de localía), nunca a la posición física
// izquierda/derecha en la balanza
// ──────────────────────────────────────────────────────────────────
function evaluatePair(rowA, rowB) {
    const effA = localiaEffect(rowA);
    const effB = localiaEffect(rowB);

    cardALabel.textContent = rowA.team;
    cardAStat.textContent = `${rowA.season} · loc ${rowA.goalsHome} / vis ${rowA.goalsAway} (${effA >= 0 ? '+' : ''}${effA})`;
    cardBLabel.textContent = rowB.team;
    cardBStat.textContent = `${rowB.season} · loc ${rowB.goalsHome} / vis ${rowB.goalsAway} (${effB >= 0 ? '+' : ''}${effB})`;

    let resultKey;

    if (effA === effB) {
        cardA.classList.remove('gana', 'pierde');
        cardB.classList.remove('gana', 'pierde');
        statusBanner.textContent = 'Empate en efecto de localía';
        statusBanner.classList.remove('gana');
        statusBanner.classList.add('empate');
        resultKey = 'tie';
    } else if (effA > effB) {
        cardA.classList.add('gana');
        cardA.classList.remove('pierde');
        cardB.classList.add('pierde');
        cardB.classList.remove('gana');
        statusBanner.textContent = `${rowA.team} ${rowA.season} gana en efecto de localía`;
        statusBanner.classList.add('gana');
        statusBanner.classList.remove('empate');
        resultKey = 'A';
    } else {
        cardB.classList.add('gana');
        cardB.classList.remove('pierde');
        cardA.classList.add('pierde');
        cardA.classList.remove('gana');
        statusBanner.textContent = `${rowB.team} ${rowB.season} gana en efecto de localía`;
        statusBanner.classList.add('gana');
        statusBanner.classList.remove('empate');
        resultKey = 'B';
    }

    // Solo dispara el sonido cuando cambia el par detectado,
    // para no repetir el audio en cada frame mientras los cubos
    // se mantienen quietos frente a la cámara
    const pairKey = rowA.code + '|' + rowB.code;
    if (lastResultKey !== pairKey) {
        lastResultKey = pairKey;
        playSound(resultKey === 'tie' ? 'tie' : 'win');
    }
}
