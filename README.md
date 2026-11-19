# Club Kit

A framework for building walkable 3D nightclubs in the browser, and a library of the parts clubs are made of.

It comes in three layers:

- **`src/engine/`**: the framework. It knows nothing about any particular club. It is handed a plan (rooms, doors, stairs, lights, crowds, viewpoints) and does the rest: walking and collision, lighting, crowds, synthesised music, the city around the venue from OpenStreetMap, quality levels.
- **`src/kit/`**: the components library. DJ equipment, speaker stacks, moving lights, strobes, mirror balls, LED walls, bars, sofas, truss, railings, dancers, bouncers, queues. Any venue can use them.
- **`src/venues/<id>/`**: the clubs. Each is a folder of data and a build script.

| Venue | id | State |
|---|---|---|
| Ministry of Sound, London | `mos` | Fully dressed |
| Berghain, Berlin | `berghain` | Fully dressed |
| Flex, Vienna | `flex` | Dressed: fitted out from the kit, surfaces painted from the club's photographs of its empty rooms |

There are no model files. Every shape and texture is generated in code when the page loads. Each venue brings one data file, its surroundings from OpenStreetMap.

## Run it

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Then open the address Vite prints (normally http://localhost:5173). `npm run dev:mos`, `npm run dev:berghain` and `npm run dev:flex` open a venue directly. Every venue has an address of its own: `/berghain/`, `/mos/`, `/flex/`. The bare address lists the venues to choose from (`catalogue` in `src/venues/index.ts`), unless the build was made for one venue with the `VITE_VENUE` environment variable. The older form `?venue=<id>` still works.

`npm run build` writes a static site to `dist/`: the chooser at its root and a folder per venue. It uses relative paths, so it can be served from any folder; put it at `/projects/clubs/` and Flex is at `/projects/clubs/flex/`. `npm run typecheck` runs TypeScript.

## Controls

| Input | Action |
|---|---|
| Drag | Look around |
| W A S D | Walk and sidestep |
| Arrow up and down | Walk |
| Arrow left and right | Turn |
| Shift | Move faster |
| Q, E | Fly up and down, out of doors only |
| Wheel | Move along the view; indoors it stays on the floor |
| 1 to 9 (0 to 9 in Ministry of Sound) | Jump to a viewpoint |
| L | Next time of day |
| M | Sound on or off |
| I | Info card |
| Joystick (touch devices) | Walk |

Keys held with Ctrl, Cmd or Alt are left to the browser.

## URL parameters

| Parameter | Values | Effect |
|---|---|---|
| `venue` | a venue id | Which venue to show, for an address that does not name one in its path |
| `view` | a viewpoint id from the venue's plan | Open on that viewpoint |
| `time` | a time id from the venue's plan: `day` for Ministry of Sound, `morning` for Berghain | Open at that time of day |
| `detail` | `lite`, `balanced`, `ultra` | Force a quality level |
| `ui` | `0` | Hide all interface, for screenshots |
| `cull` | `0` | Ministry of Sound only: draw every room all the time, for checking the culling |

## The components library

Everything in `src/kit/` is exported from `src/kit/index.ts`.

| Group | Components |
|---|---|
| DJ equipment | `djBooth` (a desk with the gear on it), `djGear` (media players, mixer, turntables, in the `full` or `cdjs` layout), `djPieces` (the same pieces placed one by one, as in Berghain's booth of four turntables). All three clubs use this equipment. Screens scroll and platters turn with the music. |
| Lighting | `movingHeads` (fixtures that swing beams through the haze), `mirrorBall`, `strobe`, `parCan`, `ledScreen`, `swirlScreen`, `playScreens` |
| Sound | `speakerStack`, `speakerCabinet` |
| People | `dancers`, `talkers`, `bouncer`, `doorStaff`, `dj`, `queue`, `group`, `person`, and the `WARDROBE` presets |
| Structure | `railing`, `trussLeg`, `trussRun`, `openStair`, `openLeaves`, `barrierLine` |
| Furniture | `barCounter`, `sofa`, `bottles` |
| Finishes | `makeMats` (plain materials), `graffitiWall` |
| Outdoors | `tree`, `bollard`, `lampPost`, `stool` |
| Shapes | `box`, `along`, `cyl`, `tube`, `panel`, `quad4` |

Geometry components are drawn onto a **stage**: a group in the scene, a batch that merges solid parts by material, the materials, and hooks for the beat and the time of day. Coordinates are metres, `[x, z]` on the floor and `y` up.

```ts
import * as K from '../../kit';

export function build(ctx: BuildContext): VenueHooks {
  const blockout = buildBlockout(ctx, { byRoom: true });       // the plan as plain blocks
  const stages = K.makeStages(ctx.quality, K.makeMats(ctx.quality));
  const floor = stages.stage(blockout.rooms.get('floor')!);

  K.djBooth(floor, { at: [0, -6], y: 0 });
  K.speakerStack(floor, [-3, -6], 0, 0, { columns: 2, rows: 3 });
  K.mirrorBall(floor, { at: [0, 4.2, 0], spots: 60 });
  K.strobe(floor, { at: [0, 4.5, -3], tilt: Math.PI / 2 });
  stages.finish();

  return { update: (f) => stages.update(f, f.time.night), setTime: (t) => stages.setTime(t.night) };
}
```

People are data, not geometry. The helpers return crowd entries for the plan, and the engine draws each crowd as one instanced mesh:

```ts
crowds: [
  K.dancers({ room: 'floor', rect: [-5, -5, 5, 5], y: 0, count: [40, 90, 150], seed: 1, faceTo: [0, -6] }),
  K.queue({ path: [[0, 12], [0, 30]], y: 0, seed: 2, staff: [K.bouncer(-1, 11, 0, 0)] }),
],
```

The room's own strobe flash belongs to the engine: `plan.show.strobe` says when it fires, never faster than 2.9 flashes a second, and not at all for visitors whose system asks for reduced motion. The `strobe` component shows the lamp.

`src/venues/flex/` is the shortest worked example: it is built almost entirely from the kit.

## What is in `src/`

### `engine/`: reusable, names no venue

| File | What it does |
|---|---|
| `types.ts` | The schema of a venue: `VenuePlan` (rooms, links, stairs, platforms, ladders, obstacles, shells, lights, crowds, viewpoints, times of day, outdoor zones, show, copy), `Surroundings`, `VenueModule`. Start here. |
| `app.ts` | Renderer, post-processing, loader, look and walk controls, viewpoint buttons, captions, URL sync, warm-up of shaders and textures. |
| `world.ts` | Puts city and venue together: sky, sun or moon, fog, times of day, the strobe, which lights are on. |
| `nav.ts` | Where you can stand and what room you are in. See below. |
| `frame.ts` | Converts between a venue's own coordinates and the world's. |
| `lights.ts` | Builds the lights in a plan and switches them by set. |
| `crowds.ts` | Builds the crowds in a plan. |
| `city.ts` | The neighbourhood from a venue's map data: buildings, roads, rails (on a viaduct if the venue says so), grass, fences, lamps, trees, sky. |
| `blockout.ts` | Draws a plan as it stands, with no dressing: floors, walls with a hole wherever a link or stair goes through, ceilings and vaults, stepped stairs, platforms, obstacles, shells. A venue that has been measured but not yet dressed calls it from its build. |
| `people.ts` | One figure drawn hundreds of times with instancing; limbs are posed in the vertex shader. A DJ can be given headphones; nobody else can. |
| `materials.ts` | Painted textures: concrete, brick, gravel, asphalt, windows, dance floor. Also derives normal maps. |
| `geom.ts` | Boxes, extrusions, ribbons, a batcher that merges meshes by material. |
| `props.ts` | Steel stairs, railings, trusses, crowd barriers. |
| `fx.ts` | Light beams and dust in the air. |
| `copy.ts` | Puts a venue's words into the page. |
| `quality.ts` | The three quality levels and how a device is assigned one. |
| `audio.ts` | The music, synthesised with Web Audio: four loops (techno, house with chords, a plain house beat, and drum and bass at 160 beats a minute), faded and filtered by where you stand. |
| `util.ts` | Canvas texture helper and a seeded random number generator. |

### `venues/<id>/`: one club

| File | What it does |
|---|---|
| `plan.ts` | The venue as typed data: every room, the links and stairs between them, obstacles, lights, crowds, viewpoints, captions, times of day. |
| `copy.ts` | Every word on the page about the venue. |
| `surroundings.ts` | What the city builder should leave out, add or plant around the venue. |
| `build.ts` | The dressing: walls, slabs, facades, furniture, anything drawn. Reads positions from `plan.ts`. |
| `osm.json` | OpenStreetMap data around the venue, converted to metres. |
| `index.ts` | Ties the four together as a `VenueModule`. |

Ministry of Sound splits its dressing over more files:

| File | What it does |
|---|---|
| `build.ts` | Which finish each room's floor, walls and ceiling get, then the block model in those finishes, the dressing, the crowds and the culling. |
| `textures.ts` | The venue's own painted textures and signs: paving, blockwork, brick, boards, hedge, velvet, speaker grilles, posters, LED screens, the neighbours' fronts. |
| `kit.ts` | A stage for every room, and the kit's components on this venue's two grids. |
| `dress-exterior.ts` | Gaunt Street and the courtyard: pavement, gates, queue signs and barriers, banner, truss lane, hedge, container bar, overhang, canopy, shutter with the crest. |
| `dress-ground.ts` | Lobby, tunnel, box office, cloakroom, The 103, the two Box tunnels. |
| `dress-box.ts` | The Box: booth, lattice, video, speaker stacks, stairs, balcony. |
| `booth-gear.ts` | Puts the kit's DJ equipment on the four desks. The Box has four players, two turntables and a mixer; The Baby Box, The Loft and The 103 have two players and a mixer. |
| `dress-arches.ts` | The Baby Box, Arch80, toilets, load-in. |
| `dress-upstairs.ts` | The Lounge, the green room, The Loft. |

`venues/index.ts` lists the venues. `index.html` is an empty skeleton; `style.css` styles it.

## How the main pieces work

**Rooms.** A room has an id, a floor level, a height and one or more floor areas (rectangles or polygons) in the venue's own coordinates. `nav.zoneAt()` finds the room whose volume holds the camera; the room's `zone` decides which sets of lights are on, the fog, the exposure, how the music is filtered, and its `caption` is what the page says while you are in it. Out of doors the plan's `outdoors` block does the same for the street, the doorstep and the air.

**Walking.** There is no physics engine. Room areas, links, stairs (ramps) and platforms are surfaces. A step is allowed when the whole body, a centre and eight points at shoulder width, stays on surfaces that belong together: the same one, or two that share a room. A room only shares with the links and stairs that name it, so the only way through a wall is a link. On top of that, obstacles in the plan (a rectangle, circle, line or polygon with a height range) stop a body, and out of doors so do buildings, fences, trees and lamp posts from the map. A blocked step slides along the wall. People are not obstacles.

**Lights.** Each light in the plan belongs to a set; each zone names the sets it wants. Only those are switched on, which is what keeps the frame rate up. The venue's build script may animate individual lights by id.

**Strobe.** `plan.show.strobe` says when it fires. Whatever a venue asks for, the engine never flashes faster than `MAX_STROBE_HZ` in `world.ts` (2.9 a second), and not at all when the visitor's system asks for reduced motion.

**Quality levels.** Lite, Balanced and Ultra are defined in `quality.ts`. They differ in shadow resolution, normal maps, crowd size, dust, props, interior shadow lights and ambient occlusion. A governor in `app.ts` lowers the pixel ratio if frames get slow. A venue may also give `textureScale` per level in its `VenueModule`; painted textures are then made that much smaller on each side. Ministry of Sound halves them on Lite, the level phones get.

**Culling by room.** `buildBlockout` with `byRoom` builds each room into its own group. `buildVisibility` in `engine/visibility.ts` works out from the plan which rooms can be seen from the point where the camera is: it looks through the links and stairs as holes of a known shape, several in a row, narrowing the view at each, and errs toward drawing too much. What the links do not say the venue adds by hand: the line of a balcony's edge, a window or a hatch (`windows`), or a room that hangs inside another (`sees`). Ministry of Sound hides every room that is not seen from where you stand, and crowds in hidden rooms are not animated. `?cull=0` draws every room all the time; `tools/test/scout.mjs` with `shots-cull.json`, run with and without it and compared, shows that the culling hides nothing that is in view.

**Sound per room.** A room's zone sets how much of the music gets through (`music`: 0 is the low end through a wall, 1 is the dance floor), how loud it is (`loudness`), how much echo it has (`echo`) and which loop is heard (`track`: `techno`, the default, the softer `house`, `beat` (a standard house beat, drums and bass only) or `dnb`; `null` for none). The plan's `outdoors.track` does the same for the street and the air. All the loops start at the same moment. `techno`, `house` and `beat` run at the venue's tempo, so walking from a room that hears one into a room that hears another fades between them in time. `dnb` runs at 160 beats a minute whatever the venue's tempo is: where it is heard, the beat that drives the lights, the strobe and the crowd runs at 160 too, and the echo is retimed to it. A loop nobody hears is not played.

In Ministry of Sound each of the four rooms with a DJ plays its own loop: The Box `techno`, The 103 `house`, The Loft `beat` and The Baby Box `dnb`. The Box is heard only in the rooms built against it: its two tunnels, the VIP balcony, The Lounge above its passages (quietly, low end and little else), and the staff rooms behind it. The Baby Box is heard in its arch and, muffled, in the lobby that leads to it. The Loft is heard only in The Loft. The rest of the building hears The 103, the entrance tunnel and the courtyard included. Nothing is heard on Gaunt Street.

**Crowds.** A crowd in the plan is a scatter, a list of people or a queue, in a room, with a behaviour and optionally a `dress` (what they wear). A scatter can be kept inside an outline (`within`) and away from fittings (`avoid`, `clear`).

**Warm-up.** During loading, `app.ts` compiles all shaders against the post-processing target for every combination of light sets a zone uses, uploads all textures and renders one frame from each viewpoint. Without this the first step into each room stutters.

**Development hook.** In `npm run dev` only, `window.__club` offers `go(i)`, `pose()`, `where()`, `zone()`, `floor()`, `move()`, `strobe()`, `state()`, `at(timeId)`, `draw(on)`, `time()`, `hitches()`, `info()`, `textureMemory()` and `heaviest()` for jumping around, testing collision, scripting a walk without drawing every frame, and measuring frame times, draw calls and texture memory. For the sound, `heard()` lists which loop each place hears, `audio()` gives what the mix is set to now (the loop, its fader, the filter, the level) and `measureLoop(id)` renders four bars of a loop on its own and returns its peak and average level.

## Tests

`tools/test/` has scripted checks that drive the dev server in headless Chrome (Node 22 or newer, `google-chrome` on the path, no other dependencies). They replace the clock and the animation frames, so every run does the same thing. Start `npm run dev` first and give the address in `BASE` (for example `BASE=http://localhost:5173/`). Screenshots go to the folder in `OUT`, by default under `out/`.

Other settings, all environment variables: `CHROME` is the browser to start if it is not `google-chrome` on the path (on Windows, the full path to `chrome.exe`); `CDP_SIZE` is the window size, `1280,720` by default; `CDP_PORT` is the debugging port; `DETAIL` is the quality level. By default Chrome draws in software, which is slow (a full `moswalk.mjs` run takes about ten minutes) but gives the same pixels on any machine. `CDP_GPU=1` draws with the machine's graphics card instead. That setting was added for moving the project to a faster machine and has not been run yet. Pixel comparisons only mean something between two sets made on the same machine with the same setting.

| Command | What it checks |
|---|---|
| `node tools/test/cdp.mjs tools/test/moswalk.mjs` | Ministry of Sound: walks from the Gaunt Street pavement to the dance floor of The Box with the real keys, then collision against walls and fittings (gates, truss legs, counters, booths, rails, benches, the gantry steps, the Lounge tiers, the Loft alcove), the stairs to the Lounge, the ten viewpoints, the time of day, Q and E, the strobe. Saves screenshots to `OUT`. |
| `SHOTS=tools/test/shots-in.json node tools/test/cdp.mjs tools/test/scout.mjs` | Takes a screenshot from each position in a list, for looking at dressing. `shots-ext.json` and `shots-in.json` are the lists used for Ministry of Sound; `shots-cull.json` looks round from 37 places for the culling check. |
| `node tools/test/cdp.mjs tools/test/measure.mjs` | Draw calls and triangles at each viewpoint, and texture memory, on the detail level in `DETAIL`. `heaviest.mjs` lists what the triangles are; `vis.mjs` lists the rooms drawn from each viewpoint. |
| `VENUE=flex ROUTE=tools/test/routes/flex.json node tools/test/cdp.mjs tools/test/route.mjs` | Any venue: walks the routes in a JSON file through the collision code, and checks that the things listed as `blocked` stop a walker. |
| `node tools/test/cdp.mjs tools/test/navtest.mjs` | Berghain: the same kind of walk and collision checks, and the keyboard fixes. |
| `node tools/test/cdp.mjs tools/test/render.mjs`, then `node tools/test/compare.mjs dirA dirB` | Renders every viewpoint of a venue three times and compares two sets pixel by pixel, to show that an engine change has not changed a venue. |

## Adding a venue

If an AI agent is doing the work, point it at `.claude/skills/build-a-club/SKILL.md`: the order to work in, which component to use for what, what makes a room look real, and how to check it. Claude Code picks the skill up by itself.


1. Make `src/venues/<id>/` with `plan.ts`, `copy.ts`, `surroundings.ts`, `build.ts`, `osm.json` and `index.ts`, following `types.ts`.
2. Get the map data: `node tools/fetch-osm.mjs <lat> <lon> <radius in metres> src/venues/<id>/osm.json`. It asks the Overpass API, trying several mirrors with a growing wait between attempts, and converts the answer to metres around the given point.
3. Start `build.ts` with `buildBlockout(ctx)` from `engine/blockout.ts`. That draws the plan as plain blocks, which is enough to walk it and check it against the sources. Then fit it out from the kit (see `venues/flex/build.ts`) and dress it afterwards.
4. Add it to `src/venues/index.ts`.
5. Open `/<id>/`.

## Ministry of Sound: coordinates and what is guessed

`venues/mos/` is a model of 103 Gaunt Street, London SE1, built from research into the building (plans, licensing drawings, photographs). Rooms, doors, stairs and fittings are in the right places and at the right sizes as far as the sources go, and each room is dressed from the photographs the research describes.

All lengths are metres, y is up.

**Site grid.** The origin is the centre of the main gate on Gaunt Street (51.497696, -0.099825). **right** is along the street (true bearing 156°), **in** is away from the street into the site (true bearing 66°). The venue frame is this grid with x = right and z = -in; `P(right, in)` in `plan.ts` converts.

**Courtyard grid.** The courtyard, the lobby and the entrance tunnel stand 15° off the site grid. `K(a, b)` gives a point a metres along the courtyard's street boundary from its left corner and b metres in from it.

**Measured and guessed.** `plan.ts` keeps the two apart. `MEASURED` holds the few heights and sizes that come from a survey or a drawing. `GUESS` holds every value the research marks as estimated or does not give: the level of the upper floor, most ceiling heights, the heights of counters and rails, the size and place of the roller shutter and of the three crests, where the queue stands, which Box tunnel has the warning sign, and the place and size of fittings that are known only from photographs (gate leaves, truss lane, search arches, bollards, booth columns, furniture, the Loft's alcove, the arches of the viaduct). Change a value there and the model follows.

**What is left out.** Sponsors' branding on the bars, the Ministry Venues "M", and the makers' names on the DJ equipment. Posters and flyers on the walls are invented patterns, not real artwork.

**The crest.** `crest.png` is the club's own artwork, taken from the logo file on ministryofsound.com, scaled down and cropped to its bounds, with nothing redrawn. It appears where it does on the building: tone on tone on the roller shutter in the courtyard, projected on the neighbour's brick flank at night, and small at the foot of the sound-level warning sign in a Box tunnel. There is no sign on the street front, because the building has none.

**Times of day.** `night` (Saturday, 01:30, with the queue and the crowds) and `day` (empty).

Not affiliated with Ministry of Sound. The name and the crest are the club's and are used only to identify the building.

## Flex: coordinates and what is guessed

`venues/flex/` is Flex, Augartenbrücke 1, Vienna, built from `docs/flex-research.md` and from photographs of the hall with nobody in it. That file marks every fact as sourced or guessed, and `plan.ts` keeps the same split in `MEASURED` and `GUESS`.

**Frame.** The origin is the north-west end of the club's frontage on the quay wall. x runs along the wall downstream, toward the stage; z is negative toward the Donaukanal and positive inland, under the road. y is up from the street, so the quay is at about -6.5 and the water below that.

**Sunken ground.** The canal and its quays lie below the street. The plan says so with `outdoors.cut` (ground that is not there) and `outdoors.decks` (the bridge across it): the city leaves the cut alone, nobody walks off the street into it, and the venue draws the quays, the walls and the water. The way down is a stair from `outside`.

**Measured.** From the club's own technical drawings: the stage (1.02 m high, 5.7 m wide), the speaker columns 4.88 m apart, the mixing desk 7.86 m from the stage, the 5 by 3 m LED wall, the 19 by 8 grid of spots.

**From photographs.** The stage stands between two black pillars that carry the speaker columns, with the mouths of two bass horns open under its deck and a red ticker over each. A ring of truss hangs low in front of it with a lens ball in the middle. The raised side is only the last stretch before the stage, with curved concrete steps at its corner, red tube handrails, and two square columns chalked "Rauchen verboten" and "VIP". A wire mesh covers the upper part of the inland wall under a silver duct. `textures.ts` paints the surfaces: matt black masonry with tags, a pale worn screed, quay paving, tiles, and the wall of sweets in the toilets. The café follows its photographs too: the bar on a raised side behind three winding steps edged in red light, sofas on castors, a deck on scissor legs. Over the hall's bar hangs the COCKTAILS sign, and over the door the club's logo in bulbs (`logo.svg`, the club's own file). The painted heads along the garden are invented, in the spirit of the boards that stood there; they copy none of the real ones.

**Guessed.** The length of the hall, the height of the street above the quay, where the door, the cashier, the cloakroom and the toilets are, and how the café and the hall lie against each other.

**Who is playing.** The booth in the hall is a homage to Electric Indigo. The figure is the same figure as everyone else, and the techno is synthesised, not hers.

Not affiliated with Flex or with Electric Indigo.

## Berghain: coordinates and measurements

All lengths are metres, y is up.

**World frame** (used by `city.ts` and `osm.json`): x points east, z points south, the origin is near the club's door.

**Venue frame** (used by everything in `venues/berghain/`): x runs along the long axis of the building, from the Berghain end (x = -38.25, where the door is) to the Halle end (x = +38.25). z runs across it, +z towards the substation on the east side, -z towards the Kantine and the garden.

| Constant in `plan.ts` | Value | Meaning |
|---|---|---|
| `CENTRE` | (17.0, -18.6) | Centre of the building in the world frame |
| `ROT` | atan2(0.8262, 0.5634), about 55.7° | Rotation of the venue frame in the world frame |
| `L2` | 38.25 | Half the length (full footprint 76.5 m) |
| `W2` | 18.95 | Half the width (full footprint 37.9 m) |
| `H_MACHINE` | 22.5 | Height of the Berghain block |
| `H_KESSEL` | 23.3 | Height of the Halle block |
| `T` | 0.6 | Wall thickness |
| `CROSS` | -24.5 | x of the wall between the front strip and the turbine hall |
| `DOOR_Z` | -3.16 | z of the entrance door on the SSW wall |
| `LADDER_TOP` | 15 | Height of the ladder platform |

`osm.json` has six lists: `buildings` (each with an OSM id, height `h` and footprint `p`), `roads`, `rails`, `areas`, `fences` and `entrances`. Every `p` is a list of `[x, z]` points in the world frame. The club is building id 25649554, the Kantine 286165789, the Bierhof 345217927.

On the main floor there is a service ladder on the wall. Walk into it and keep walking forward to climb to a platform at 15 m; walk backward to climb down.

**Accuracy.** The exterior footprint, position and surroundings come from map data and are accurate. The facade is built from published photographs. The interior is a reconstruction from written descriptions and the few published images, since photography is not allowed inside. Where sources are silent, it is a guess. The graffiti and the art on the walls are invented.

Not affiliated with Berghain.

## Credits

- Models: Berghain and Flex by Nader Cserny, Ministry of Sound by Tim Huckle.
- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, under the Open Database License. Keep this credit visible wherever a venue's `osm.json` or anything derived from it is shown.
- Rendering: [Three.js](https://threejs.org/) r186.
- The booth on Berghain's main floor is a homage to Jeff Mills, and the booth in Flex's hall to Electric Indigo. The DJ figures depict nobody in particular.

## License

Club Kit’s original code and assets are licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](LICENSE), except where a file states otherwise.

You can use, adapt, and share the material for noncommercial purposes. When sharing it, credit Nader Cserny, link to the original project where reasonably practicable, and indicate any changes. Share adaptations under CC BY-NC-SA 4.0 or a compatible license.

Suggested credit: [Built with Club Kit by Nader Cserny](https://github.com/ncserny/clubkit).

For promotional or other commercial use, contact [Nader Cserny](https://github.com/ncserny) for permission.

**Not covered by the license:** `src/venues/mos/crest.png` is Ministry of Sound's own artwork and `src/venues/flex/logo.svg` is Flex's own logo; both are used only to identify the buildings. The names of the clubs and artists are theirs. Map data in each venue's `osm.json` is © OpenStreetMap contributors under the Open Database License.
