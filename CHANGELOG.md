# Changelog

Everything notable that changes in Club Kit, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each entry says which layer it touches: the **engine** (`src/engine/`), the **kit** (`src/kit/`), or a venue.

## [Unreleased]

### Added

- **Start page, "Clubs Worldwide".** Opening the page without `?venue=` now lists the clubs to choose from: Berghain (Berlin), Ministry of Sound (London) and Flex (Vienna). Each card is a link, so a choice can be shared. A build made with `VITE_VENUE` still opens that venue directly.
- **Flex: the hall's bar.** The steel bar on the left of the hall, on its plinth, with crates lit blue behind it and the COCKTAILS sign in red letters and bulbs above.
- **Flex: the café, from photographs.** The bar now stands on a raised side along the canal, behind three winding concrete steps edged in red light, with red stools and blue crates. Red and black leather sofas on castors, a silver duct along the inner wall with its branch to the floor, strips of tube light on the red ceiling, and a plywood deck on scissor legs with old par cans, LED bars and the glass doors beside it.
- **Flex: outside.** The club's own logo over the door as a sign set with bulbs, an EINTRITT ticker beside the door, a railing along the water's edge, the quay walls sprayed from the quay to the street, and a wall of painted heads along the garden (invented, in the spirit of the boards that stood there).
- **Flex: toilets, cloakroom, seating.** Toilets with the wall of sweets, a cloakroom counter with coats, people sitting on the café's sofas, at its bar and at the picnic tables in the garden.
- **Kit:** `tree`, `bollard`, `lampPost`, `stool`, and `prism` (a slab over any outline, for curved steps and counters that are not square).
- **Start page: who made each model.** Each card names the model's maker (Berghain and Flex by Nader Cserny, Ministry of Sound by Tim Huckle), and under the cards a line links to this repository: "Open source. Build your own club experience with Club Kit".
- **Credits:** the README names who made each model: Berghain and Flex by Nader Cserny, Ministry of Sound by Tim Huckle.
- **A skill for building a club**, shared by every agent that works here: `.claude/skills/build-a-club/SKILL.md`, linked from `AGENTS.md` and `CLAUDE.md`. It gives the order to work in, the kit component for each job, what makes a room look real, and how to check the result.
- **A walk test for any venue:** `tools/test/route.mjs` walks the routes in a JSON file and checks that what should stop a walker does. `tools/test/routes/flex.json` is Flex's.
- `AGENTS.md`, with the rules for working in this repository, and this changelog.

### Changed

- **Berghain: the booth's decks.** The four turntables and the mixer on the main floor are now the kit's DJ equipment, the same finely made pieces that stand in Ministry of Sound and Flex. The drum machine, the record crate and the DJ stay Berghain's own, as does everything else about the room: only the DJ equipment is shared between the clubs.
- **Kit: `djPieces`** places single turntables, media players and mixers anywhere on a desk, for a booth that is not one of the two ready layouts. `DJ_SIZES` gives their sizes.
- **Flex: the hall, from photographs.** The stage is a deck on legs between two black pillars that carry the speaker columns, with the mouths of two bass horns and a red RAUCHVERBOT ticker under each end. A ring of truss hangs low in front of it with a lens ball in the middle. The raised side is only the last stretch before the stage, with curved concrete steps at its corner, red tube handrails and two square columns chalked "Rauchen verboten" and "VIP". A wire mesh covers the upper inland wall under a silver duct. The hall is 4.3 m high, not 4.6.
- **Flex: surfaces.** Plain colours are replaced by painted finishes: matt black masonry with tags, a pale worn screed, a dark polished floor in the café, quay paving, tiles, rippling water in the canal.
- **Flex: light.** The matrix over the dance floor and the LED bars on the pillars run amber, as the club runs them. By day a working light is on in the hall and the café's tubes are lit.
- **Flex: music.** The hall plays techno, with the booth as a homage to Electric Indigo.
- The link between Flex's café and hall moved along the wall to make room for the bar.

### Fixed

- The README no longer carries a stale second copy of itself below the credits.
- **Engine:** in a room sunk below the street, the street's ground no longer held a walker up or lifted them to street level while they crossed a thick wall.
- **Engine:** a doorway through a thick wall now counts as part of the room it leads into, so light and sound no longer flick to "outdoors" in the doorway.

## [0.1.0] - 2026-11-19

The first version in this repository.

### Added

- **Engine:** the walkable 3D club engine: plans as data (rooms, links, stairs, platforms, lights, crowds, viewpoints, times of day), walking and collision without a physics engine, lights switched by zone, instanced crowds that move to the beat, synthesised music filtered by room, the surrounding city from OpenStreetMap, three levels of detail, a block model of any plan, and culling by room.
- **Engine:** sunken ground. A plan can declare a cut (a canal, a quay below the street) and the decks that bridge it; the city leaves the cut alone and nobody walks off the street into it.
- **Engine:** the map tool fetches water and bridges, and the city draws water where a venue has not sunk it.
- **Kit:** the components library. DJ equipment (`djBooth`, `djGear`), lighting (`movingHeads`, `mirrorBall`, `strobe`, `parCan`, `ledScreen`, `swirlScreen`, `playScreens`), sound (`speakerStack`, `speakerCabinet`), people (`dancers`, `talkers`, `bouncer`, `doorStaff`, `dj`, `queue`, wardrobes), structure (`railing`, truss, `openStair`, `barrierLine`), furniture (`barCounter`, `sofa`, `bottles`), `graffitiWall`, and the `Stage` that components are drawn onto.
- **Ministry of Sound** (`mos`): 103 Gaunt Street, fully dressed, now built on the kit. Rendering every viewpoint before and after the move gave identical images.
- **Berghain** (`berghain`): the former power station, fully dressed, with the virtual-tour title and "About the project" links from the latest version of the model.
- **Flex** (`flex`): a first pass, on the Donaukanal in Vienna, laid out from the club's technical drawings and OpenStreetMap, with the research in `docs/flex-research.md`.

### Fixed

- `?venue=` only accepts venues the build lists. Names every object inherits (`constructor`, `toString`) no longer leave the page on a blank loader.
