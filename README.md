# Olimpiadas de ajedrez

Tres torneos independientes: primaria (1.º a 6.º), secundaria baja (1.º y 2.º)
y secundaria alta (3.º a 5.º). Cuatro colores, dos estudiantes por color y categoría.

## Uso

Abre el sitio publicado o sirve esta carpeta con `python -m http.server 8000`.
No necesita compilación ni backend. Cada salón usa una computadora: primaria en una y las dos secundarias en otra.
En cada equipo, árbitro y pantalla pública usan el mismo navegador, perfil y origen. Los datos se guardan
localmente y las pestañas se actualizan entre sí; no sincronizan entre equipos.
Evita el modo privado y no borres los datos del navegador.

El manual visual está integrado en `manual.html`. La propuesta imprimible es
`Propuesta_Reestructuracion_Olimpiadas_Ajedrez.pdf`.

## Preparación

- Configura solo las categorías del salón; las demás pueden quedar vacías. A es mayor grado; a igual grado,
  fecha de nacimiento más antigua. B es el otro; no representa habilidad.
- Conducta se registra una vez por color y se comparte entre categorías.
- Cada categoría tiene su propio multiplicador olímpico. Guarda antes de iniciar.
- Cada panel recuerda su última pestaña. Baja y alta conservan sus fases por separado.

## Formato común

Dos grupos de cuatro, todos contra todos. Tres rondas, dos tableros por grupo:
cuatro tableros permiten jugar ambos grupos a la vez. El sorteo se realiza con
una ruleta en la pantalla pública. Cada giro asigna los dos participantes de un
color y lo retira de la ruleta; el último color completa los espacios restantes.
Las salidas 1 y 3 llevan sus A al Grupo 1; las salidas 2 y 4, al Grupo 2.
Los B van al grupo opuesto, conservando el orden de salida dentro de su rol.
El orden y el avance se guardan antes de animar cada giro, también al recargar.
Al terminar, se confirman los grupos desde esa misma pantalla. El árbitro puede
abrirla desde Sorteo y recibe las asignaciones entre pestañas automáticamente.
A juega dos veces con negras y una con blancas; B, al revés.

Victoria 2, tablas 1, derrota 0. Desempates: mini-clasificación, enfrentamiento
directo al reducirse a dos (tablas favorecen a negras), SB, victorias, menos
penalizaciones y prioridad B. Entre jugadores del mismo rol, B efectivo es menor
grado y luego fecha de nacimiento más reciente; el árbitro registra quién lo es.
No se juegan partidas adicionales de grupo.

Los líderes disputan el campeonato: dos partidas 15+0, alternando piezas; empate
1-1 lleva a Armagedón. En secundaria baja, los segundos disputan 3.º-4.º.
En alta también juegan terceros por 5.º-6.º y cuartos por 7.º-8.º.
Los cruces de puestos son una partida 15+0: ganador al puesto superior; tablas
comparten el par y cada uno recibe el promedio de los premios. No hay Armagedón
en estos cruces. Primaria solo disputa el campeonato después de grupos.
En cada encuentro elige color quien tuvo mejor desempeño de grupo: puntos, SB,
victorias, conducta y B/B efectivo, sin enfrentamiento directo entre grupos.

Armagedón: puja secreta de 0 a 15 minutos, precisión de un segundo, sin incremento.
La puja menor obtiene negras con ese tiempo y gana con tablas. Blancas recibe
15 minutos y debe ganar. Pujas iguales se repiten hasta obtener tiempos distintos.

## Primaria

Grupos sin reloj por jugador: 20 minutos por partida. El panel incluye un
temporizador común por ronda con iniciar, pausar, reanudar y restablecer.
El plazo se conserva al recargar o cambiar de pestaña; la pantalla pública lo muestra
mientras se juegan los grupos. No decide ni registra resultados automáticamente.
Una sola ronda puede correr a la vez.

Al cumplirse el límite se congela el tablero. Victoria con más de un punto de
ventaja material (al menos 2); con uno o igualdad, tablas. Peón 1, caballo 3,
alfil 3, torre 5, dama 9; el rey no puntúa. Solo excepcionalmente el árbitro puede
permitir una recaptura si cortar ahí falsea un intercambio o captura de último
segundo. La decisión se limita a resolver esa recaptura.

Pieza soltada, pieza movida en toda primaria, también final y Armagedón.
Ahogado siempre es tablas. La final usa reloj individual:
un organizador aporta el celular, supervisa y pulsa si los niños se olvidan.
No se permite aprovechar esos olvidos. Allí no rige el límite compartido ni
la evaluación de material de los grupos.

## Secundaria

Grupos 5+0, final 15+0. Cada estudiante lleva celular exclusivamente como reloj
con Chess Clock de Chess.com. Basta uno por tablero; pedir todos aporta respaldo.
Comprobar batería, pausa, edición del tiempo y ausencia de incremento. Si se apaga,
volver a encenderlo.

Una jugada cuenta al pulsar el reloj; no rige pieza tocada. Es legal esperar si
el rival movió pero olvidó pulsar: anunciar esta estrategia. Tras dos
medios-movimientos sin pulsaciones, el árbitro puede pausar, advertir y reanudar
el reloj de quien debe mover. Ante una ilegal ya completada, el afectado pausa y
llama al árbitro; si la confirma, este le añade 30 segundos y reanuda. Solo el
árbitro modifica el reloj.

## Puestos y puntos

Las tres categorías reparten 152 puntos base. Campeonato: 64 y 32.

| Puesto | Primaria | Secundaria baja | Secundaria alta |
| --- | ---: | ---: | ---: |
| 3.º / 4.º | 16 cada uno | 20 / 12 | 20 / 12 |
| 5.º / 6.º | 8 cada uno | 8 cada uno | 10 / 6 |
| 7.º / 8.º | 4 cada uno | 4 cada uno | 5 / 3 |

Tablas en un cruce: promedio de los dos premios (16, 8 o 4 puntos cada uno).
Los pares sin cruce comparten puesto y puntos. Aporte del color = suma de sus dos
jugadores × multiplicador de la categoría, conservando decimales.
Los resultados siguen provisionales mientras falte cualquier cruce; los de
puestos pendientes muestran su promedio y los finalistas pendientes, 32 cada uno.

## Horarios y asistencia

Cada salón reporta sus resultados independientemente a la organización.
La propuesta distingue tiempos probables y máximos base. Sus horarios representan
el peor caso previsto, con partidas completas y Armagedón, y están pendientes del coordinador.
La jornada real probablemente será bastante más corta, especialmente en primaria. **Si todas las partidas de una ronda
terminan antes, se adelanta la siguiente: no se espera la hora del cuadro.**
Las líneas de retiro reflejan cada categoría: primaria deja seis jugadores tras
grupos; baja deja cuatro; alta conserva a todos para sus cruces. Los cruces se
juegan en paralelo con la primera final, sin aumentar el máximo con cuatro tableros.
Después de esa partida, solo permanecen los finalistas del campeonato. Los máximos base no incluyen pausas,
pujas, bonificaciones por ilegales ni la recaptura excepcional de primaria.

No hay tolerancia de llegada: la partida comienza a la hora anunciada y corre el
reloj correspondiente. Ante inasistencia o negativa a jugar, el color elige
reemplazo; solo en ese caso puede subir alguien desde una categoría inferior,
nunca bajar. Revisa su asignación A/B.

## Datos y respaldos

Cada panel exporta/importa un JSON exclusivo de su categoría. No incluye nombres,
conducta ni multiplicadores de Configuración. Reiniciar una categoría no afecta
las otras. Una corrección que cambie los jugadores de un cruce regenera ese partido y elimina
sus resultados; los otros cruces se mantienen si sus jugadores no cambian. Cambiar una partida de la final elimina su Armagedón.

Configuración usa `ajedrez_setup_v2`; secundarias usan
`ajedrez_secundaria_baja_v2` y `ajedrez_secundaria_alta_v2`.
Primaria usa `ajedrez_primaria_grupos_v3`.

La interfaz y los recursos son locales, sin descargas externas para funcionar.
El manual termina con ejemplos de captura al paso y restricciones del enroque.
