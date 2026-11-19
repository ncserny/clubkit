import type { Copy } from '../../engine/types';

const OSM = 'Map data © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors';

/** What the page says while you stand somewhere. */
export const TEXT = {
  rooms: {
    hall: 'A closed-off stretch of the old Stadtbahn gallery under the Franz-Josefs-Kai, the club since 1995. Black walls, a flat ceiling of beams and ducts, a dance strip on one side and a raised side with the bar and the mixing desk on the other.',
    cafe: 'The pavilion built in front of the hall in 2007: a low red ceiling, a bar, steps to sit on along the canal side and a small stage at the far end.',
    foyer: 'Cashier on the left, the café ahead, the hall through the old quay wall.',
    quay: 'The lower quay of the Donaukanal, six or seven metres below the street. The walls along here have been a legal place to spray since 1994.',
  },
  views: {
    bridge: 'The Augartenbrücke, 1931. Flex is the low black building on the quay below, between the bridge and Schottenring station.',
    steps: 'The way down from the street to the quay, which the club gives as its address: Abgang Augartenbrücke.',
    door: 'The queue stands along the café’s front. Most nights the door is 16 and over.',
    floor: 'Between the two speaker columns. Under the stage are two bass horns cast in concrete; over the floor hangs a grid of 152 spots.',
    foh: 'The mixing desk stands on the raised side, 7.86 metres from the front of the stage.',
    booth: 'Electric Indigo is playing. From the stage, looking back down the hall toward the bar and the door.',
    canal: 'The far bank, in Leopoldstadt. The club’s whole frontage lies across the water, with the Ringturm behind it.',
    street: 'Franz-Josefs-Kai runs along the top of the quay wall. The hall is under the road; the U4 runs beside it.',
    above: 'The Donaukanal between the Augartenbrücke and the Kaiserbad lock. The club lies on the lower quay of the inner-city bank.',
  },
};

export const copy: Copy = {
  name: 'Flex',
  address: 'Augartenbrücke 1, Am Donaukanal, 1010 Wien',
  documentTitle: 'Flex in 3D: the club on the Donaukanal in Vienna',
  canvasLabel: '3D model of Flex in Vienna. Drag to look around, WASD or the joystick to walk, number keys 1 to 9 for viewpoints.',
  kicker: 'Vienna · on the Donaukanal since 1995',
  intro: 'A club in a disused stretch of U-Bahn gallery under the Franz-Josefs-Kai, known for its sound system. Tonight: Electric Indigo. Come down the steps from the Augartenbrücke, along the quay, through the café and into the hall.',
  start: 'Go down to the canal',
  hintKeys: 'Drag to look · WASD to walk · 1 to 9 for viewpoints · L for daytime',
  hintTouch: 'Drag to look · the joystick walks · tap a viewpoint below',
  credit: `A first pass: measured, not yet fully dressed. ${OSM}`,
  aboutHeading: 'About this model',
  about: [
    '<p>Flex is a club on the lower quay of the Donaukanal in Vienna, at the foot of the Augartenbrücke. It opened here on 1 October 1995, in a disused section of the gallery the Stadtbahn was built in, after five years in Meidling. This page models it in the browser with Three.js, with no photographs or model files.</p>',
    '<ul>' +
      '<li>The canal, both quays, the bridge and the steps down from the street stand where OpenStreetMap has them. The quay lies about six and a half metres below the street; that figure comes from a coarse terrain model and may be a metre out.</li>' +
      '<li>The hall follows the club’s own technical drawings: the stage 1.02 metres high, the two speaker columns 4.88 metres apart, the mixing desk 7.86 metres from the stage, the LED wall of 5 by 3 metres, the grid of 19 by 8 spots over the floor.</li>' +
      '<li>What no source gives is guessed, and the plan says which: the length and height of the hall, where the door, the cashier and the bars are, and how the café and the hall lie against each other.</li>' +
      '</ul>',
    '<p>Nine viewpoints: the bridge, the steps, the door, the café, the hall, the dance floor, the mixing desk, the booth and the far bank. A link can open on any of them, for example <a href="?venue=flex&amp;view=floor">the dance floor</a>.</p>',
  ],
  infoTitle: 'Flex in 3D',
  infoMeta: '2026. Code, map data, synthesised sound. Runs in a browser. A first pass.',
  info: [
    'Flex is built from the same kit as the other clubs here: the decks, the speaker stacks, the moving lights, the strobes, the mirror ball, the bar, the dancers and the people on the door are parts that any venue can use.',
    'The building is half underground. The street runs along the top of the quay wall, and the hall lies behind that wall, under the road, in a stretch of the gallery that the Stadtbahn ran through from 1901. The underground still passes on the other side of the hall’s inner wall.',
    'The hall is laid out from the club’s own stage plot and lighting plan. Its length, its height and the place of the bar are estimates. The café pavilion in front of it, built in 2007, is drawn on the outline the map gives it.',
    'The walls of the quay are sprayed from end to end, as they are: this stretch of the canal has been a legal wall since 1994. The graffiti here is invented and spells nothing.',
    'On the decks in the hall: Electric Indigo, the Viennese DJ and producer who founded female:pressure. The booth is a homage to her; the figure behind it is the same figure as everyone else in the room, and the techno is synthesised on the spot, not hers. The café plays house.',
    'This is a first pass. The rooms are measured and the fittings are in place, but most surfaces are still plain.',
  ],
  infoFoot: `Not affiliated with Flex or with Electric Indigo. ${OSM}. Built with Three.js and Club Kit.`,
  loaderNote: 'Nothing is downloaded as a model. The building is being generated on your device.',
  loading: {
    map: 'Laying out the Donaukanal from the map',
    venue: 'Digging out the quay, building the hall',
    lights: 'Hanging the lights',
    warm: 'Warming up the sound system',
    open: 'Doors open',
  },
  fallbackTitle: 'Flex in 3D needs WebGL',
  fallbackText: 'This browser could not start a 3D view. Try a recent Chrome, Safari or Firefox with hardware acceleration on.',
  noscript: 'The 3D model of Flex needs JavaScript.',
};
