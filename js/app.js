// ─────────────────────────────────────────────────────────────────────────────
// app.js — Visualización interactiva de localía Real Madrid vs FC Barcelona
// ─────────────────────────────────────────────────────────────────────────────

let detailChartInstance = null;

// Paletas de colores por equipo
const COLORES = {
    realMadrid: { local: '#005A9F', visita: '#00a8ff' },
    barcelona:  { local: '#A50044', visita: '#004D98' }
};

// Opciones visuales compartidas para los gráficos de línea
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { position: 'top' },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#666',
            borderColor: '#ddd',
            borderWidth: 1
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            max: 80,
            title: { display: true, text: 'Goles Totales' }
        }
    }
};

// ─── Inicialización principal ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    const sidebar     = document.getElementById('sidebar');
    const closeBtn    = document.getElementById('close-btn');
    const mainContent = document.getElementById('main-content');

    // Cerrar sidebar: quita clases y libera márgenes
    closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('active', 'sidebar-right', 'sidebar-fcb');
        mainContent.style.marginLeft  = '';   // deja que CSS.margin:auto recentre
        mainContent.style.marginRight = '';
    });

    // Cargar datos desde el JSON generado por el notebook
    fetch('data/data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`No se pudo cargar data.json (HTTP ${response.status})`);
            }
            return response.json();
        })
        .then(matchData => {
            inicializarGraficos(matchData, sidebar, mainContent);
        })
        .catch(error => {
            console.error('Error al cargar los datos:', error);
            mainContent.innerHTML = `
                <div style="text-align:center; padding: 3rem; color: #c0392b;">
                    <h2>⚠️ Error al cargar los datos</h2>
                    <p>${error.message}</p>
                    <p style="font-size:0.85rem; color:#888;">
                        Asegúrate de que <code>data/data.json</code> existe y el servidor está activo.
                    </p>
                </div>`;
        });
});

// ─── Construcción de los gráficos ─────────────────────────────────────────────
function inicializarGraficos(matchData, sidebar, mainContent) {
    const labels = matchData.realMadrid.map(d => d.temporada);

    // ── Gráfico Real Madrid (sidebar abre a la IZQUIERDA) ─────────────────────
    const ctxRM = document.getElementById('chartRM').getContext('2d');
    new Chart(ctxRM, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'De Local',
                    data: matchData.realMadrid.map(d => d.local),
                    borderColor: COLORES.realMadrid.local,
                    backgroundColor: COLORES.realMadrid.local,
                    tension: 0.3,
                    pointHoverRadius: 8
                },
                {
                    label: 'De Visita',
                    data: matchData.realMadrid.map(d => d.visita),
                    borderColor: COLORES.realMadrid.visita,
                    backgroundColor: COLORES.realMadrid.visita,
                    borderDash: [5, 5],
                    tension: 0.3
                }
            ]
        },
        options: {
            ...commonOptions,
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const seasonData = matchData.realMadrid[elements[0].index];
                    openSidebar(seasonData, 'Real Madrid', 'izquierda', sidebar, mainContent);
                }
            }
        }
    });

    // ── Gráfico FC Barcelona (sidebar abre a la DERECHA) ──────────────────────
    const ctxFCB = document.getElementById('chartFCB').getContext('2d');
    new Chart(ctxFCB, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'De Local',
                    data: matchData.barcelona.map(d => d.local),
                    borderColor: COLORES.barcelona.local,
                    backgroundColor: COLORES.barcelona.local,
                    tension: 0.3,
                    pointHoverRadius: 8
                },
                {
                    label: 'De Visita',
                    data: matchData.barcelona.map(d => d.visita),
                    borderColor: COLORES.barcelona.visita,
                    backgroundColor: COLORES.barcelona.visita,
                    borderDash: [5, 5],
                    tension: 0.3
                }
            ]
        },
        options: {
            ...commonOptions,
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const seasonData = matchData.barcelona[elements[0].index];
                    openSidebar(seasonData, 'FC Barcelona', 'derecha', sidebar, mainContent);
                }
            }
        }
    });
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function openSidebar(data, nombreEquipo, lado, sidebar, mainContent) {
    const diferencia = data.local - data.visita;
    const diffTexto  = diferencia > 0 ? `+${diferencia}` : `${diferencia}`;
    const diffColor  = diferencia > 0 ? '#27ae60' : diferencia < 0 ? '#c0392b' : '#888';
    const esFCB      = lado === 'derecha';

    // Actualizar textos
    document.getElementById('panel-title').innerText = `${nombreEquipo} — ${data.temporada}`;
    document.getElementById('stats-container').innerHTML = `
        <p>🏠 <strong>De local:</strong> ${data.local} goles en ${data.partidos} partidos
           <em>(${data.promedioLocal} goles/partido)</em></p>
        <p>✈️ <strong>De visita:</strong> ${data.visita} goles en ${data.partidos} partidos
           <em>(${data.promedioVisita} goles/partido)</em></p>
        <p>📊 <strong>Diferencia de localía:</strong>
           <span style="color:${diffColor}; font-weight:bold;">${diffTexto} goles</span></p>
    `;

    // Colores del gráfico de barras según el equipo
    const colores = esFCB ? COLORES.barcelona : COLORES.realMadrid;
    renderDetailChart(data.local, data.visita, colores);

    // Aplicar clases de posición y color
    sidebar.classList.remove('sidebar-right', 'sidebar-fcb');   // limpiar estado anterior
    if (esFCB) {
        sidebar.classList.add('sidebar-right', 'sidebar-fcb');
    }
    sidebar.classList.add('active');

    // Empujar el contenido solo en pantallas grandes
    if (window.innerWidth > 768) {
        mainContent.style.marginLeft  = esFCB ? ''      : '380px';
        mainContent.style.marginRight = esFCB ? '380px' : '';
    }
}

// ─── Gráfico de barras del detalle ────────────────────────────────────────────
function renderDetailChart(local, visita, colores) {
    const ctx = document.getElementById('detailChart').getContext('2d');
    if (detailChartInstance) detailChartInstance.destroy();

    detailChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Local', 'Visita'],
            datasets: [{
                label: 'Goles',
                data: [local, visita],
                backgroundColor: [colores.local, colores.visita],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 80 } }
        }
    });
}
