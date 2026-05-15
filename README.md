# Impacto de la Localía — Visualización Interactiva
**Real Madrid vs FC Barcelona · LaLiga 2016–2022**

Visualización web interactiva que analiza el efecto de jugar como local frente a jugar como visitante, comparando los goles anotados por temporada de los dos equipos más grandes de LaLiga entre 2016 y 2022.

---

## Estructura general del proyecto

```
proyecto/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   └── data.json
│   └── bdds.xlsx
├── audio/
│   ├── hala_madrid.m4a
│   ├── messi.m4a
│   └── abucheo.mp3
└── img/
    ├── logo_rm.png
    └── logo_fcb.png
```

---

## Cómo ejecutar

Vía githubpages: https://benjacidr.github.io/ProyectoInfoVis-grupo10/

---

## Funcionalidades principales

### Gráfico de líneas principal
- Muestra 4 series temporales: RM Local, RM Visita, FCB Local, FCB Visita.
- Eje Y recortado entre 20 y 70 goles para amplificar visualmente las diferencias.
- Etiquetas inline al final de cada línea con separación automática anti-solapamiento.
- Las líneas sólidas representan rendimiento local y las punteadas el rendimiento de visita.
- Tooltip de índice compartido: al pasar el cursor sobre cualquier temporada se muestran los 4 valores simultáneamente.

### Paneles laterales (sidebars)
Al hacer clic en cualquier punto o zona del gráfico, se abren dos paneles de forma simultánea:

- **Sidebar izquierdo (Real Madrid):** goles de local y visita de esa temporada, promedio por partido y diferencia de localía.
- **Sidebar derecho (FC Barcelona):** misma información para el equipo catalán.
- Cada sidebar incluye un gráfico de barras de goles local vs visita y un gráfico de distribución de frecuencia de partidos según los goles anotados (0, 1, 2, 3+).

### Sonificación condicional
Al hacer clic **específicamente sobre un punto** del gráfico, se reproduce un audio según el equipo y el resultado de localía de esa temporada:

| Equipo | Local > Visita | Visita > Local | Empate |
|---|---|---|---|
| Real Madrid | `hala_madrid.m4a` | `abucheo.mp3` | Silencio |
| FC Barcelona | `messi.m4a` | `abucheo.mp3` | Silencio |

Si se hace clic fuera de un punto (pero dentro del área del gráfico), los sidebars igual se abren pero **no se reproduce sonido**. Los audios no se superponen: cualquier audio previo se detiene antes de reproducir el nuevo.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Estructura | HTML5 semántico |
| Estilos | CSS3 puro con variables y transiciones cúbicas |
| Lógica | JavaScript ES6+ vanilla (sin frameworks) |
| Gráficos | [Chart.js](https://www.chartjs.org/) vía CDN |
| Audio | Web Audio API nativa (`new Audio()`) |
| Datos | JSON estático (`data/data.json`) |

---

## Paleta de colores

| Elemento | Color |
|---|---|
| Real Madrid (gráfico base) | `#005A9F` |
| FC Barcelona (gráfico base) | `#A50044` |
| RM Local (sidebar) | `#005A9F` |
| RM Visita (sidebar) | `#00a8ff` |
| FCB Local (sidebar) | `#A50044` |
| FCB Visita (sidebar) | `#E8537A` |

---
