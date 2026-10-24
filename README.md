# Olimpiadas de ajedrez - formato actualizado

Tres torneos independientes: **primaria**, **secundaria baja (1.º y 2.º)** y
**secundaria alta (3.º, 4.º y 5.º)**. Cada color inscribe dos jugadores por categoría.

## Abrir la aplicación

Extrae todos los archivos juntos. En esa carpeta, ejecuta:

```bash
python -m http.server 8000
```

Abre **http://localhost:8000/index.html**. El índice enlaza la configuración,
los tres paneles de árbitro y sus pantallas públicas. No requiere compilación ni
backend. Python solo sirve los archivos por HTTP.

Todos los paneles deben abrirse en **el mismo navegador y la misma computadora**.
Los datos se guardan en ese navegador y las pestañas se actualizan solas.
No hay sincronización entre equipos. Cambiar de navegador, puerto, perfil u origen
abre otro almacenamiento; no uses modo privado ni borres los datos del navegador.

## Participantes y configuración

- Hay cuatro colores: rojo, azul, verde y amarillo.
- **A = mayor grado; si coinciden en grado, fecha de nacimiento más antigua. B = el otro jugador.**
  Aplica a las tres categorías. No se clasifican por habilidad ajedrecística.
- Registra manualmente los nombres en las casillas A/B correspondientes.
- Nombres, multiplicadores, sorteos y resultados se separan por categoría.
- Las penalizaciones de conducta se registran una sola vez por color y se comparten.
- Guarda Configuración antes de iniciar. Para corregirla, desbloquea y vuelve a guardar.

## Primaria

Eliminación directa con cuartos A contra B, siempre de colores distintos:

- Cuartos y semifinales: partido único; tablas → revancha con piezas invertidas;
  empate persistente → conducta → quien inició con blancas.
- Final: dos partidas; empate 1-1 → Armagedón directo por puja
  ciega con máximo de 15 minutos.
- Puntos por puesto: **8, 4, 2, 2, 1, 1, 1, 1**. Total base: **20**.

## Cada secundaria

- Dos grupos de cuatro; seis partidas por grupo, tres por jugador.
- Se conserva el sorteo: primeros dos colores aportan sus A al Grupo A y B al
  Grupo B; últimos dos colores hacen lo inverso.
- A juega dos con negras y una con blancas; B, al revés.
- Tres rondas por grupo, dos tableros simultáneos por ronda. Ritmo **5+0**.
- Puntuación de grupo conservada: victoria 2, tablas 1, derrota 0.
- Se conserva el motor anterior de desempates: mini-clasificación entre empatados;
  enfrentamiento directo al reducirse a dos (tablas favorecen a negras en el
  código original); SB; victorias; conducta; B o B efectivo como último criterio.
- **Solo el líder de cada grupo avanza. Sin semifinales.** La final se genera
  cuando ambos grupos están completos y sus líderes están definidos.
- Final: **dos partidas 15+0**, alternando piezas. Empate 1-1 (incluidas dos
  tablas) → **Armagedón directo**, sin dos partidas adicionales.
- Armagedón: puja secreta de 0 a 15 minutos, en pasos de un segundo; **sin
  incremento por jugada**. La puja menor lleva negras con ese tiempo y gana
  con tablas; blancas tiene 15 minutos y debe ganar. Pujas iguales se repiten;
  tras tres coincidencias se habilita sorteo de piezas como último recurso.
- Campeón **20**, subcampeón **12**; segundos de grupo **4** cada uno,
  terceros **2** cada uno, cuartos **1** cada uno. Total base: **46**.
- Puestos compartidos en tres pares: 3.º-4.º, 5.º-6.º y 7.º-8.º. No hay
  posiciones individuales ni desempates dentro de esos pares.

## Puntos proporcionales

**Puntos del color = suma de sus dos jugadores × ajuste de reparto × multiplicador olímpico.**

El ajuste fijo es **×2.3 en primaria** y **×1 en cada secundaria**:
20 × 2.3 = 46. Compensa el reparto de puntos, sin aumentar la importancia de
primaria. Después se aplica el multiplicador configurable de cada categoría
para adaptar su resultado a la escala de las olimpiadas. Se conservan los decimales;
no se truncan los puntos al multiplicar.

Los puntajes son provisionales mientras falte terminar el torneo. Antes de
resolver la final, cada finalista figura provisionalmente con el valor de subcampeón.

## Tiempos de secundaria

Por categoría, con cuatro tableros y ambos grupos en paralelo:

| Etapa | Tiempo máximo de juego |
| --- | ---: |
| Grupos (3 rondas de 5+0) | 30 min |
| Final (dos partidas de 15+0) | 60 min |
| Armagedón, si hace falta | 30 min |
| Total de estas partidas | 120 min |

Con dos tableros y grupos sucesivos, la fase de grupos ocupa hasta 60 minutos.
Agrega tiempo para preparación, pausas, pujas y posibles desempates de grupos.
El cuadro indica tiempos máximos base. No incluye pausas ni los 30 segundos que el árbitro añade al jugador afectado por una jugada ilegal del rival. Con dos tableros, el total base sube a 150 minutos.

## Relojes en secundaria

Cada estudiante lleva su celular exclusivamente como reloj con **Chess Clock de Chess.com**.
Se utiliza un celular por tablero: cuatro bastan para ocho jugadores; pedir los ocho aporta respaldo.
La aplicación es gratuita y sin anuncios, disponible en Play Store y App Store.
Antes de jugar, comprobar batería, pausa, edición del tiempo y ausencia de incremento.
Si un jugador detecta una jugada ilegal del rival, pausa el reloj y llama al profesor.
Si confirma la infracción, el árbitro añade 30 segundos al jugador afectado y reanuda la partida.

La propuesta PDF incluye tiempos probables, máximos base y horarios de un solo día.
El escenario requiere cuatro tableros para primaria y cuatro para secundaria; baja y alta
comparten estos últimos en turnos sucesivos. Los horarios siguen orientativos y pendientes de coordinación. Primaria tiene 20 minutos compartidos por partida normal y revancha.

## Archivos y respaldos

- `config.html`: nombres de los 24 jugadores, conducta por color y tres multiplicadores.
- `arbitro-primaria.html` / `publico-primaria.html`: primaria.
- `arbitro-secundaria.html?categoria=baja` / `publico-secundaria.html?categoria=baja`.
- `arbitro-secundaria.html?categoria=alta` / `publico-secundaria.html?categoria=alta`.
- `reglas-cefe377693c8.js` / `style.css`: reglas compartidas y diseño del torneo.
- `manual.html`: guía visual del árbitro integrada en el sitio.
- `Propuesta_Reestructuracion_Olimpiadas_Ajedrez.pdf`: propuesta actualizada.

Cada panel exporta/importa su propio estado en JSON. Los respaldos de secundaria
identifican su categoría y rechazan una importación en la otra. No incluyen nombres,
conducta ni multiplicadores, que se guardan en Configuración. Reiniciar un torneo
no afecta los demás.

Si una corrección de grupo o conducta cambia un finalista de secundaria, se
regenera la final sin conservar resultados de los anteriores participantes.
Si se corrige un resultado de la final, se limpia su Armagedón.

La configuración nueva usa `ajedrez_setup_v2`; las secundarias usan
`ajedrez_secundaria_baja_v2` y `ajedrez_secundaria_alta_v2`. Primaria usa
`ajedrez_primaria_v2`. No se migran nombres ni resultados de la antigua secundaria,
según lo acordado: aún no había datos registrados.

El panel recuerda la última pestaña de cada secundaria. En la final, elige color
quien tuvo mejor desempeño en grupos: puntos, SB, victorias, conducta y B efectivo
como último criterio. No se usa enfrentamiento directo entre grupos distintos.

En primaria, B inicia con blancas contra A. En A-A o B-B, el árbitro asigna
blancas al de menor grado y, a igual grado, a quien nació después. En cuartos y semifinales,
el jugador con rey ahogado pierde (regla anunciada previamente). En la final,
el ahogado es tablas. Los puestos se agrupan en 3.º-4.º y 5.º-8.º sin desempates.

La interfaz utiliza grafito y un fondo ajedrecístico diagonal, con los cuatro colores de delegación
y recursos SVG locales. Funciona sin descargar fuentes o imágenes externas.
En móvil, las partidas de grupo se muestran en filas verticales. El botón de
guardar configuración permanece visible durante la edición.

## Criterios de operación actualizados

Primaria: 20 minutos compartidos por partida normal, revancha y partida de final; evaluación de material al límite con margen arbitral para desenlace próximo o material igualado. Esperar al menos dos medios-movimientos tras una captura. En revancha de cuartos/semifinales tras tablas regulares, tiempo agotado con material igualado da pase directo al B efectivo. Armagedón conserva 15 minutos por jugador como regla especial.

Último desempate: B; entre iguales, menor grado y fecha de nacimiento más reciente (B efectivo). El árbitro registra el criterio. En secundaria una jugada se completa al pulsar el reloj; no rige pieza tocada. Esperar si el rival no pulsó es legal y debe anunciarse. Tras dos medios-movimientos sin pulsaciones, el árbitro pausa, advierte y reanuda el reloj de quien debe mover.

Sin tolerancia de llegada: el reloj comienza a la hora. Ante inasistencia o negativa, el color elige reemplazo; únicamente entonces puede subir desde una categoría inferior, nunca bajar. Un celular apagado se vuelve a encender; exigir batería cargada. Horarios pendientes del coordinador.
