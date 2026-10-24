# Olimpiadas de ajedrez

Tres torneos independientes: primaria (1.º a 6.º), secundaria baja (1.º y 2.º)
y secundaria alta (3.º a 5.º). Cuatro colores, dos estudiantes por color y categoría.

## Uso

Abre el sitio publicado o sirve esta carpeta con `python -m http.server 8000`.
No necesita compilación ni backend. Configuración, árbitro y resultados deben
abrirse en el mismo navegador, perfil, computadora y origen. Los datos se guardan
localmente y las pestañas se actualizan entre sí; no sincronizan entre equipos.
Evita el modo privado y no borres los datos del navegador.

El manual visual está integrado en `manual.html`. La propuesta imprimible es
`Propuesta_Reestructuracion_Olimpiadas_Ajedrez.pdf`.

## Preparación

- Registra los 24 nombres en Configuración. A es mayor grado; a igual grado,
  fecha de nacimiento más antigua. B es el otro; no representa habilidad.
- Conducta se registra una vez por color y se comparte entre categorías.
- Cada categoría tiene su propio multiplicador olímpico. Guarda antes de iniciar.
- Cada panel recuerda su última pestaña. Baja y alta conservan sus fases por separado.

## Formato común

Dos grupos de cuatro, todos contra todos. Tres rondas, dos tableros por grupo:
cuatro tableros permiten jugar ambos grupos a la vez. Los primeros dos colores
del sorteo aportan sus A al Grupo A y B al Grupo B; los otros dos hacen lo inverso.
A juega dos veces con negras y una con blancas; B, al revés.

Victoria 2, tablas 1, derrota 0. Desempates: mini-clasificación, enfrentamiento
directo al reducirse a dos (tablas favorecen a negras), SB, victorias, menos
penalizaciones y prioridad B. Entre jugadores del mismo rol, B efectivo es menor
grado y luego fecha de nacimiento más reciente; el árbitro registra quién lo es.
No se juegan partidas adicionales de grupo.

Solo los líderes pasan a una final de dos partidas 15+0 por jugador, alternando
piezas. Elige color inicial quien tenga mejor desempeño en grupos: puntos, SB,
victorias, conducta y B/B efectivo; sin enfrentamiento directo entre grupos.
Empate 1-1, incluidas dos tablas: Armagedón directo. Los demás puestos se comparten según la clasificación de grupos.

Armagedón: puja secreta de 0 a 15 minutos, precisión de un segundo, sin incremento.
La puja menor obtiene negras con ese tiempo y gana con tablas. Blancas recibe
15 minutos y debe ganar. Pujas iguales se repiten; tras tres, se habilita sorteo.

## Primaria

Grupos sin reloj por jugador: 20 minutos por partida. El panel incluye un
temporizador común por ronda con iniciar, pausar, reanudar y restablecer.
El plazo se conserva al recargar o cambiar de pestaña; resultados lo muestra
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

Las tres categorías reparten 46 puntos base:

| Puesto | Puntos |
| --- | ---: |
| Campeón | 20 |
| Subcampeón | 12 |
| 3.º-4.º: segundos de grupo | 4 cada uno |
| 5.º-6.º: terceros de grupo | 2 cada uno |
| 7.º-8.º: cuartos de grupo | 1 cada uno |

No se desempata dentro de un par. Puntos del color = suma de sus dos jugadores
× multiplicador olímpico de su categoría. Cada categoría reparte 46 puntos base.
Se conservan decimales. Hasta resolver la final, sus participantes figuran
provisionalmente con los puntos de subcampeón.

## Horarios y asistencia

La propuesta distingue tiempos probables y máximos base, y presenta horarios
compactos pendientes del coordinador. **Si todas las partidas de una ronda
terminan antes, se adelanta la siguiente: no se espera la hora del cuadro.**
Una línea separa el fin de grupos/clasificación, cuando se retiran seis jugadores,
del bloque reservado a los dos finalistas. Los máximos base no incluyen pausas,
pujas, bonificaciones por ilegales ni la recaptura excepcional de primaria.

No hay tolerancia de llegada: la partida comienza a la hora anunciada y corre el
reloj correspondiente. Ante inasistencia o negativa a jugar, el color elige
reemplazo; solo en ese caso puede subir alguien desde una categoría inferior,
nunca bajar. Revisa su asignación A/B.

## Datos y respaldos

Cada panel exporta/importa un JSON exclusivo de su categoría. No incluye nombres,
conducta ni multiplicadores de Configuración. Reiniciar una categoría no afecta
las otras. Una corrección que cambie los finalistas regenera la final y elimina
sus resultados anteriores. Cambiar una partida de la final elimina su Armagedón.

Configuración usa `ajedrez_setup_v2`; secundarias usan
`ajedrez_secundaria_baja_v2` y `ajedrez_secundaria_alta_v2`.
Primaria usa `ajedrez_primaria_grupos_v3`.

La interfaz y los recursos son locales, sin descargas externas para funcionar.
El manual termina con ejemplos de captura al paso y restricciones del enroque.
