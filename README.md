# Tablero IPES — Índice de Progreso Económico y Social

Tablero web estático (HTML + JavaScript) para visualizar el **IPES**: 53 países
(Colombia + OCDE + América Latina), 2 subíndices, 5 dimensiones, 13 pilares y 91
indicadores. Inspirado en el tablero del IDC y construido a partir de los archivos
de cálculo del IPES (`IPES_Resultados_Puntajes_v2.xlsx`, `IPES_Indicadores.xlsx`).

## Pestañas

- **Resumen** — KPIs nacionales, mejores 5 países, panorama por región.
- **Ranking** — tabla ordenable de los 53 países con los 13 pilares y subíndices.
- **Mapa** — coropleta mundial por indicador (requiere conexión a internet).
- **Comparar** — radar y tabla para hasta 5 países.
- **Dispersión** — relación entre dos dimensiones, con tendencia y correlación.
- **Dimensiones** — perfil promedio por región.
- **Gráficas** — constructor libre: Top/Bottom 10, histograma, mapa de calor.
- **Indicadores** — catálogo de los 91 indicadores con fuente y origen.
- **Ficha** — perfil completo de un país (radar, puestos, fortalezas/rezagos).
- **Metodología** — estructura, normalización y fuentes.

Incluye modo oscuro, descarga CSV y enlaces compartibles (el estado se guarda en la URL).

## Archivos

| Archivo | Descripción |
|---|---|
| `index.html` | Estructura y estilos del tablero. |
| `app.js` | Lógica e interactividad. |
| `data.js` | Datos del IPES (`window.IPES_DATA`). |
| `data.json` | Mismos datos en JSON (referencia). |
| `.nojekyll` | Evita el procesamiento Jekyll en GitHub Pages. |

## Ver en local

Abre `index.html` en el navegador. Todas las vistas funcionan sin conexión
**excepto el Mapa**, que descarga la geometría mundial desde un CDN.

## Publicar en GitHub Pages

```bash
cd tablero-ipes
git init
git add .
git commit -m "Tablero IPES"
git branch -M main
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```

Luego en GitHub: **Settings → Pages → Source: `main` / root**. La URL será
`https://<usuario>.github.io/<repo>/`.

## Actualizar los datos

Regenera `data.js` desde los Excel del IPES y reemplaza el archivo; la estructura
esperada es `window.IPES_DATA = { countries, pillarMeta, structure, indicators, isoNum, ... }`.

---

Tablero con fines de visualización académica. Puntajes 0–100 normalizados (min–max)
sobre 53 países; el IPES es el promedio de los subíndices Económico y Social.
**Verifica las cifras contra las fuentes oficiales antes de publicar.**
