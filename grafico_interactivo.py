import os
import pandas as pd
import plotly.graph_objects as go

# ── 1. CARGA DE DATOS ─────────────────────────────────────────────────────────
data_path = os.path.join("data")
excel_files = [f for f in os.listdir(data_path) if f.endswith('.xlsx')]

dataframes = {}
for file in excel_files:
    file_path = os.path.join(data_path, file)
    df_name = file.replace('.xlsx', '')
    dataframes[df_name] = pd.read_excel(file_path)
    print(f"Cargado: {file}")

print(f"\nTotal de archivos cargados: {len(dataframes)}")

# ── 2. FILTRADO Y LIMPIEZA ────────────────────────────────────────────────────
equipos = ['Real Madrid', 'Barcelona']
columnas_a_borrar = ['Day', 'Time', 'xG', 'xG.1', 'Referee', 'Informe del partido', 'Notes']

dataframes_filtrados = {}
for key, df in dataframes.items():
    filtro = df['Local'].isin(equipos) | df['Visitante'].isin(equipos)
    df_filtrado = df[filtro]
    df_limpio = df_filtrado.drop(columns=columnas_a_borrar, errors='ignore')
    dataframes_filtrados[key] = df_limpio

# ── 3. CÁLCULO DE GOLES Y PARTIDOS ────────────────────────────────────────────
lista_goles_por_año = []

for temporada, df in dataframes_filtrados.items():
    df_temp = df.copy()
    df_temp[['Goles_Local', 'Goles_Visitante']] = (
        df_temp['Score'].astype(str)
        .str.split(r'[-–]', expand=True)
        .astype(float)
    )

    for equipo in equipos:
        mask_local    = df_temp['Local']     == equipo
        mask_visitante = df_temp['Visitante'] == equipo

        goles_local   = df_temp[mask_local]['Goles_Local'].sum()
        goles_visita  = df_temp[mask_visitante]['Goles_Visitante'].sum()
        partidos_local    = mask_local.sum()
        partidos_visita   = mask_visitante.sum()
        partidos_totales  = partidos_local + partidos_visita

        lista_goles_por_año.append({
            'Temporada':         temporada,
            'Equipo':            equipo,
            'Goles Local':       int(goles_local),
            'Goles Visita':      int(goles_visita),
            'Goles Totales':     int(goles_local + goles_visita),
            'Partidos Local':    int(partidos_local),
            'Partidos Visita':   int(partidos_visita),
            'Partidos Totales':  int(partidos_totales),
            # promedios redondeados a 2 decimales
            'Prom Local':        round(goles_local  / partidos_local,   2) if partidos_local   > 0 else 0,
            'Prom Visita':       round(goles_visita / partidos_visita,  2) if partidos_visita  > 0 else 0,
        })

df_goles = pd.DataFrame(lista_goles_por_año)

# Temporada ordenable
df_goles['Temporada_Corta'] = (
    df_goles['Temporada']
    .str.replace('LaLiga', '')
    .str.replace(' ', '-')
    .str.strip()
)
df_goles = df_goles.sort_values('Temporada_Corta').reset_index(drop=True)

display(df_goles)

# ── 4. PUESTO FINAL EN LA TABLA ──────────────────────────────────────────────
# Fuente: resultados oficiales La Liga. Completar si se agregan más temporadas.
puestos_finales = {
    ('Real Madrid', '19-20'): 1,
    ('Real Madrid', '20-21'): 2,
    ('Real Madrid', '21-22'): 1,
    ('Real Madrid', '22-23'): 2,
    ('Real Madrid', '23-24'): 1,
    ('Barcelona',   '19-20'): 2,
    ('Barcelona',   '20-21'): 3,
    ('Barcelona',   '21-22'): 2,
    ('Barcelona',   '22-23'): 1,
    ('Barcelona',   '23-24'): 2,
}

def puesto_str(equipo, temporada):
    p = puestos_finales.get((equipo, temporada))
    if p is None:
        return 'N/D'
    sufijos = {1: '°🥇', 2: '°🥈', 3: '°🥉'}
    return f"{p}{sufijos.get(p, '°')}"

# ── 5. PALETA DE COLORES ──────────────────────────────────────────────────────
COLORES = {
    'Real Madrid': {'local': '#005A9F', 'visita': '#7EB6E8'},  # azul oscuro / claro
    'Barcelona':   {'local': '#A50044', 'visita': '#F4A0C0'},  # granate / rosa
}

# ── 6. CONSTRUCCIÓN DEL GRÁFICO ───────────────────────────────────────────────
fig = go.Figure()

for equipo in equipos:
    df_eq = df_goles[df_goles['Equipo'] == equipo]
    temporadas = df_eq['Temporada_Corta']
    color_l = COLORES[equipo]['local']
    color_v = COLORES[equipo]['visita']

    # Tooltip personalizado para LOCAL
    tooltip_local = [
        f"<b>{equipo} — Temporada {t}</b><br>"
        f"🏠 De local: {gl} goles en {pl} partidos ({prl} goles/partido)<br>"
        f"✈️ De visita: {gv} goles en {pv} partidos ({prv} goles/partido)<br>"
        f"📊 Diferencia localía: {gl - gv:+d} goles<br>"
        f"🏆 Puesto final: {puesto_str(equipo, t)}"
        for t, gl, gv, pl, pv, prl, prv in zip(
            temporadas,
            df_eq['Goles Local'], df_eq['Goles Visita'],
            df_eq['Partidos Local'], df_eq['Partidos Visita'],
            df_eq['Prom Local'], df_eq['Prom Visita'],
        )
    ]

    # Tooltip para VISITA (mismo contenido, misma info contextual)
    tooltip_visita = tooltip_local  # reusar: el hover muestra ambos datos igual

    # Línea LOCAL
    fig.add_trace(go.Scatter(
        x=temporadas,
        y=df_eq['Goles Local'],
        mode='lines+markers',
        name=f'{equipo} — Local',
        line=dict(color=color_l, width=3),
        marker=dict(size=10, symbol='circle', color=color_l,
                    line=dict(color='white', width=1.5)),
        hovertemplate='%{customdata}<extra></extra>',
        customdata=tooltip_local,
        legendgroup=equipo,
    ))

    # Línea VISITA (misma leyenda group, línea punteada)
    fig.add_trace(go.Scatter(
        x=temporadas,
        y=df_eq['Goles Visita'],
        mode='lines+markers',
        name=f'{equipo} — Visita',
        line=dict(color=color_v, width=3, dash='dot'),
        marker=dict(size=10, symbol='diamond', color=color_v,
                    line=dict(color='white', width=1.5)),
        hovertemplate='%{customdata}<extra></extra>',
        customdata=tooltip_visita,
        legendgroup=equipo,
    ))

# Etiquetas directas al final de cada línea (última temporada)
for equipo in equipos:
    df_eq = df_goles[df_goles['Equipo'] == equipo]
    ultima = df_eq.iloc[-1]
    color_l = COLORES[equipo]['local']
    color_v = COLORES[equipo]['visita']
    nombre_corto = 'R. Madrid' if equipo == 'Real Madrid' else 'Barça'

    fig.add_annotation(
        x=ultima['Temporada_Corta'], y=ultima['Goles Local'],
        text=f"<b>{nombre_corto}<br>Local</b>",
        showarrow=False, xanchor='left', xshift=10,
        font=dict(color=color_l, size=11),
    )
    fig.add_annotation(
        x=ultima['Temporada_Corta'], y=ultima['Goles Visita'],
        text=f"<b>{nombre_corto}<br>Visita</b>",
        showarrow=False, xanchor='left', xshift=10,
        font=dict(color=color_v, size=11),
    )

# ── 7. DISEÑO FINAL ───────────────────────────────────────────────────────────
fig.update_layout(
    title=dict(
        text='<b>Localía en La Liga: Goles de Local vs Visita por Temporada</b><br>'
             '<sup>Real Madrid y FC Barcelona · Goles totales anotados en partidos de La Liga</sup>',
        x=0.5, xanchor='center',
        font=dict(size=17),
    ),
    xaxis=dict(
        title='<b>Temporada</b>',
        showgrid=False,
        tickangle=-30,
    ),
    yaxis=dict(
        title='<b>Goles anotados</b>',
        showgrid=True,
        gridcolor='rgba(0,0,0,0.08)',
        zeroline=False,
        rangemode='tozero',
    ),
    hovermode='x unified',          # muestra todos los traces al mismo x
    hoverlabel=dict(
        bgcolor='white',
        font_size=13,
        bordercolor='#cccccc',
    ),
    legend=dict(
        title='<b>Equipo / Condición</b>',
        orientation='h',
        yanchor='bottom', y=1.02,
        xanchor='right',  x=1,
        font=dict(size=11),
    ),
    plot_bgcolor='white',
    paper_bgcolor='white',
    margin=dict(l=60, r=120, t=100, b=60),
    font=dict(family='Arial, sans-serif', size=12),
)

fig.update_xaxes(showline=True, linecolor='lightgrey')
fig.update_yaxes(showline=False)

fig.show()

# Exportar como HTML interactivo
fig.write_html("img/grafico_localia_interactivo.html")
print("✅ Gráfico guardado en img/grafico_localia_interactivo.html")
