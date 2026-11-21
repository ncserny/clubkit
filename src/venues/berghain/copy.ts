import type { Copy } from '../../engine/types';

/** The write-up of how the model was built and the sources it was checked against. */
const ABOUT = 'https://nader.io/posts/berghain-in-3d/';
const OSM = 'Map data © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors';

export const copy: Copy = {
  name: 'Berghain',
  address: 'Am Wriezener Bahnhof, 10243 Berlin',
  documentTitle: 'Berghain Virtual Tour: An Interactive 3D Model of the Berlin Club',
  canvasLabel: '3D model of Berghain. Drag to look around, WASD or the joystick to walk, number keys 1 to 9 for viewpoints.',
  kicker: 'The famous club, built in code',
  intro: 'The former Heizkraftwerk Friedrichshain, built in 1953, its gravel forecourt and the queue at the door. Inside: the cloakroom, the main floor in the old turbine hall and Panorama Bar upstairs.',
  start: 'Join the queue',
  hintKeys: 'Drag to look · WASD to walk · 1 to 9 for viewpoints · T for the tour · L for Sunday morning',
  hintTouch: 'Drag to look · the joystick walks · tap a viewpoint below',
  credit: `<a href="${ABOUT}" rel="noopener">About the project</a> · ${OSM}`,
  aboutHeading: 'About this model',
  about: [
    '<p>Berghain is the techno club in the former Heizkraftwerk Friedrichshain, a heating power station built in 1953 to 1955 on Am Wriezener Bahnhof in Berlin-Friedrichshain. This page models it in the browser with Three.js, with no photographs or model files: every surface is drawn in code.</p>',
    '<ul>' +
      '<li>The building stands on its OpenStreetMap footprint, about 76 by 38 metres, turned about 34 degrees east of north: the Maschinenhaus (Berghain) at the south-south-west end, where the door is, and the Kesselhaus (Halle am Berghain) at the other. Rusticated plinth, colossal pilasters, steel windows, a heavy cornice, the 2006 fire escape, and no sign.</li>' +
      '<li>Outside: the gravel forecourt and the queue between crowd barriers, the bouncers, the Kantine and the Bierhof with the beer garden, the 110 kV substation next door, the old freight tracks of Wriezener Bahnhof, and every building within about 500 metres extruded from map data, with the Fernsehturm on the skyline.</li>' +
      '<li>Inside: the cloakroom, the steel stairs, the main floor in the old turbine hall with its crane runway and four speaker stacks, the bar behind the glass, and Panorama Bar upstairs, whose roller shutters go up on a Sunday morning.</li>' +
      '</ul>',
    '<p>Nine viewpoints: above, the queue, the door, the Kantine, the cloakroom, the stairs, the ground floor, the main floor and Panorama Bar. A link can open on any of them, for example <a href="?view=main">the main floor</a> or <a href="?view=panorama&amp;time=morning">Panorama Bar on Sunday morning</a>.</p>',
  ],
  infoTitle: 'Berghain in 3D',
  infoMeta: '2026. Code, map data, synthesised sound. Runs in a browser.',
  info: [
    'Nobody is allowed to photograph the inside of this building, and the model contains no photograph of it either. Nothing in it was scanned, traced or downloaded as a shape. Every wall is a sentence of code.',
    'Berghain was the first club Nader Cserny built in code. Talking about it with a friend, Tim, who wanted to build Ministry of Sound the same way, led to <a href="https://github.com/ncserny/clubkit" rel="noopener">Club Kit</a>: the open-source library this model now runs on, with which anyone can build a club of their own.',
    'The work began with a map. The footprint of the former Heizkraftwerk Friedrichshain, 76.5 by 37.9 metres and turned 34 degrees east of north, was taken from OpenStreetMap, along with every neighbouring building within 500 metres, the dead freight tracks, the substation and the dirt path that leads from the street to the door. The city around the club is therefore real in its positions, even though it is only raised boxes.',
    'The building was then assembled bay by bay from written descriptions and from looking closely at published photographs: beige render, a ground floor sprayed from end to end, a grid of narrow steel windows, a heavy cornice. The concrete, the rust, the gravel and the graffiti are painted by small programs each time the page loads. The graffiti spells nothing. The art on the walls upstairs is invented, because the real art belongs to others.',
    'The crowd is one figure, drawn several hundred times, moving to a beat that is also generated on the spot. Outside, the music is filtered as if through a metre of wall. Inside, it opens.',
    'The booth on the main floor, four turntables and a drum machine played live, is a homage to Jeff Mills. The figure behind it is nobody in particular.',
    'The man on the door is a homage to Sven Marquardt: grey beard, a tattooed face, rings in the lip, all in black. He is a doll in that spirit, not a likeness, and kinder than the legend. Walk up to him. He looks you over, nods, and holds an arm out to the door.',
    'Where the sources fell silent, the model guesses, and it says so. It is a reconstruction of a place built to resist being recorded: accurate where the public record is, imagined where the door stays shut.',
    'On Sunday morning the shutters go up.',
    'The model comes in three levels of detail. Lite is for phones. Balanced adds depth to every surface, dust in the light and a full crowd. Ultra adds shadows from the club lights and soft contact shadows, for strong graphics. Your device is given the one it can carry; the small Detail link at the bottom left switches between them.',
  ],
  infoFoot: `<a href="${ABOUT}" rel="noopener">About the project</a>: how it was built, and the sources it was checked against. Not affiliated with Berghain or with anyone named here. ${OSM}. Built with Three.js.`,
  loaderNote: 'Nothing is downloaded as a model. The building is being generated on your device.',
  loading: {
    map: 'Laying out Friedrichshain from the map',
    venue: 'Pouring concrete, spraying the ground floor',
    lights: 'Hanging the lights',
    warm: 'Warming up the sound system',
    open: 'Doors open',
  },
  fallbackTitle: 'Berghain in 3D needs WebGL',
  fallbackText: 'This browser could not start a 3D view. Try a recent Chrome, Safari or Firefox with hardware acceleration on.',
  noscript: 'The 3D model of Berghain needs JavaScript.',
};
