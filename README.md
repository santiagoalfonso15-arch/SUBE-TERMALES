# S/E Termales 115 kV · Herramienta de diseño

Proyecto final de **Subestaciones Eléctricas 2026-2**, Escuela Colombiana de Ingeniería Julio Garavito.

Página web que reúne en un solo lugar:

1. **Coordinación de aislamiento** (IEC 60071, IEC 60815): selección del BIL con el pararrayos y distancia de fuga de la cadena de aisladores.
2. **Distancias eléctricas** (método del curso, RETIE 2013): distancias mínimas, de seguridad y de diseño, con corte de la bahía a escala.
3. **Malla de puesta a tierra** (IEEE Std 80-2013): tensiones de toque y paso con la falla monofásica obtenida en ETAP.
4. **Simulador 3D**: maniobras con enclavamientos, unifilar con flujo de carga y patio en 3D.

Cada módulo muestra la memoria de cálculo paso a paso y compara sus resultados con las entregas oficiales del Grupo 1 y del Grupo 2.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La herramienta (resumen, aislamiento, distancias, malla, normas) |
| `simulador.html` | Simulador de maniobras y patio 3D |
| `calculos.js` | Motor de cálculo que comparten las dos páginas (aislamiento, distancias y malla) |
| `img/logo-eci.png` | Logo de la universidad |

No necesita servidor ni instalación: son archivos estáticos que funcionan en GitHub Pages.

## Equipo

Subestaciones Eléctricas 2026-2 · Docente: E.E. MSc. Javier Andrés Ruiz Garzón

| Grupo 1 | Grupo 2 | Grupo 3 | Grupo 4 |
|---|---|---|---|
| Julian Rubiano | Juan Guillermo Nuñez | <u>Camilo Andrés Palomar</u> | Ingrid Quiroga |
| <u>Óscar Julián Limas</u> | Diego Andres Cely | Daniel Andrés Chávez | Andres Coa |
| Danna Guerrero | Juan Diego García | María Fernanda Chala | Yuli Leon |
| Michael Duarte | Stiven Montaño | Marlon Nivia | |
| <u>Ángel Daniel Cepeda</u> | David Durán | <u>Santiago Alfonso Tinoco</u> | |

Autores de la herramienta (subrayados): Ángel Daniel Cepeda (aislamiento), Óscar Julián Limas (distancias), Camilo Andrés Palomar (malla de puesta a tierra) y Santiago Alfonso Tinoco (simulador 3D e integración).
