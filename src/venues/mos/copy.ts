import type { Copy } from '../../engine/types';

/** The words, from section 7.16 of the research document. */

const OSM = 'Map data © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors';
const DISCLAIMER =
  'Unofficial. This model is not made, endorsed or sponsored by Ministry of Sound, and is not affiliated with it. “Ministry of Sound” and the portcullis crest are the club’s name and logo and are used here only to identify the building.';

export const copy: Copy = {
  name: 'Ministry of Sound',
  address: '103 Gaunt Street, Elephant and Castle, London SE1 6DP',
  documentTitle: 'Ministry of Sound: a walk through 103 Gaunt Street',
  canvasLabel: 'Unofficial 3D model of the Ministry of Sound nightclub in London. Drag to look around, WASD or the joystick to walk, number keys 0 to 9 for viewpoints.',
  kicker: 'London SE1 · open since 21 September 1991',
  intro:
    'Ministry of Sound opened in 1991 in a derelict building behind Elephant and Castle, with one room sealed like a bunker to hold the sound. Walk in from Gaunt Street: courtyard, tunnel, bar and The Box, laid out from the venue’s 2026 plans.',
  start: 'Go in',
  hintKeys: 'Drag to look · WASD to walk · 0 to 9 for viewpoints · T for the tour · L for daytime',
  hintTouch: 'Drag to look · the joystick walks · tap a viewpoint below',
  credit: `Unofficial model, not affiliated with Ministry of Sound. ${OSM}`,
  aboutHeading: 'About this model',
  about: [
    '<p>This is an unofficial three-dimensional model of Ministry of Sound, a nightclub at 103 Gaunt Street in south London, as it stood in 2026. You start at night on the pavement of a short back street. In front of you a black gate opens into an open-air courtyard about twenty-three metres wide, with a bar, picnic benches and a canopy overhead. The club’s crest, a crowned portcullis drawn as a sphere, is projected high on the brick wall of the building to the left.</p>',
    '<p>In the far left corner of the courtyard, double doors lead into a straight corridor eighteen metres long, past the box office and the cloakroom. It ends in The 103, a tall bar room with a sixteen-metre counter, a screen above it, a curved steel walkway overhead and a rig of white lights that rise and fall. Two short passages on the left lead to The Box, the main dance floor: a dark five-sided room with no bar and no seats, a DJ booth standing in the crowd and a metal lattice of light and video overhead.</p>',
    '<p>Across the bar, a brick railway arch holds a smaller room, The Baby Box. Stairs climb to the walkway, which leads one way to The Lounge, with windows down into The Box, and the other way to The Loft, a small red-lit bar. You can walk freely or jump between ten viewpoints, for example <a href="?view=box">The Box</a> or <a href="?view=courtyard&amp;time=day">the courtyard by day</a>.</p>',
    '<p>This is a block model: rooms, doors, stairs and fittings are in their places and to size, but surfaces are plain. Room sizes and positions come from the venue’s 2026 plans; most heights are estimates.</p>',
    `<p>${DISCLAIMER}</p>`,
  ],
  infoTitle: 'Ministry of Sound: a walk through 103 Gaunt Street',
  infoMeta: 'An unofficial model, 2026. Code, map data, synthesised sound. Runs in a browser.',
  info: [
    'This is an unofficial model of Ministry of Sound at 103 Gaunt Street, London SE1, as it was in 2026, built from the venue’s published floor plans and photographs.',
    'The club was the idea of Justin Berkmann, who had spent the late 1980s at the Paradise Garage in New York. With James Palumbo and Humphrey Waterhouse he opened it on 21 September 1991. His priorities: sound system first, lights second, design third.',
    'Accounts of the building’s earlier life do not agree: a bus garage, a car park, a tubing factory, a warehouse. Four of the club’s rooms are arches under the railway viaduct behind it.',
    'The main room, The Box, was built as a room within a room so that the system could run loud without being heard outside. It has no bar, no seats and no two walls parallel. Six speaker stacks stood around its sprung floor from 1991 to 2025.',
    'The club held the first 24-hour music and dance licence in the United Kingdom, and it opened without a licence to sell alcohol.',
    'You enter through a courtyard and an eighteen-metre corridor into The 103, the bar that joins every room. The Box is to the left, The Baby Box in a railway arch to the right. Stairs lead up to The Lounge and The Loft.',
    'The crest is the portcullis of Parliament made round like a loudspeaker, with a crown on top. The artist Chemical X drew it by hand in the early 1990s. In 1993 the club projected it onto the Houses of Parliament.',
    'The building keeps changing. In 2024 The 103 gained a rig of 124 winches that moves its lights. In January 2026 The Box was rebuilt with a new sound system, a DJ booth lowered into the crowd and a lattice of light and video overhead.',
    'From 2009 to 2014 the club fought plans for a 41-storey block of flats opposite, fearing noise complaints would cost it its licence. The tower was approved with sealed acoustic glazing and a legal agreement protecting the club’s existing noise, and now stands across the street.',
    'Room sizes and positions come from the venue’s 2026 plans. Heights, materials and colours are estimated from photographs; some are guesses. This is not an official Ministry of Sound product.',
    'Floor plans and room photographs consulted: Ministry Venues, the club’s venue-hire arm; no photograph is embedded. The crest was drawn by the artist Chemical X in the early 1990s and redrawn in 2002 by Scott Parker with a typeface by Dalton Maag. The Box, 2026: lighting and video design by Lucid Creates, KV2 Audio sound system installed by Patchwork London, lighting fixtures by beamZ. The 2025 VIP room: A-nrd Studio. The words quoted at the warning sign are from Daniel Sokolovskiy’s account of a night at the club in 2019.',
  ],
  infoFoot: `${DISCLAIMER} ${OSM}. Built with Three.js.`,
  loaderNote: 'Nothing is downloaded as a model. The building is being generated on your device.',
  loading: {
    map: 'Finding Gaunt Street',
    venue: 'Laying out the courtyard, building The Box',
    lights: 'Hanging the lights',
    warm: 'Tuning the sound',
    open: 'Opening the gate',
  },
  fallbackTitle: 'This model of Ministry of Sound needs WebGL',
  fallbackText: 'This browser could not start a 3D view. Try a recent Chrome, Safari or Firefox with hardware acceleration on.',
  noscript: 'The 3D model of Ministry of Sound needs JavaScript.',
};
