# Changelog

Everything notable that changes in Club Kit, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each entry says which layer it touches: the **engine** (`src/engine/`), the **kit** (`src/kit/`), or a venue.

## [Unreleased]

### Added

- **Pages that describe themselves.** The build writes an `ai-summary` meta tag into the start page (what Clubs Worldwide is and which clubs it has) and into each venue's page (what that club is, who made the model, and that the rest of the collection and Club Kit exist). Each venue's page also gets a `description` of its own instead of the collection's.
- **Berghain: the man on the door.** A figure of his own stands beside the portal, in homage to Sven Marquardt: grey hair and beard, the left of the face tattooed, rings in the lip and the nose, all in black. He watches the queue; walk up and he turns his head to you, holds the look, nods twice and holds an arm out to the door. He takes the place of one of the three generic door staff. `doorman.ts` depends on nothing but three.js.
- **Engine: open and closed.** A time of day now says two things separately: what the light is (`night`) and whether the club is running (`open`). While a club is closed there is no music, only a faint room tone (air in the ducts, a fridge, the mains hum), no strobe, nobody there, and the fittings are switched off; the visitor can still walk everywhere. Daylight and open go together, as on Berghain's Sunday morning. The button that changes the time says so: "Daytime · closed".
- **README: what it looks like.** Screenshots of the three clubs (two of Berghain and Ministry of Sound, three of Flex) in `docs/screenshots/`, and the YouTube walkthrough of Berghain.
- **Contributing by pull request.** `CONTRIBUTING.md` says how to add a club or a component, what a new club's pull request needs, and what the license means for a contribution. Pull requests start from a template with the checks to run. `main` takes changes by pull request only.
- **Pages that read without JavaScript.** The build writes the chooser's cards into the start page, and each venue's name, city and opening line into its own page, so search engines and link previews see real text.
- **Hosting the build on a site of your own.** The build reads four optional settings: `SITE_URL` and `SHARE_IMAGE` add a canonical link and link-preview tags to the start page and to every venue's page, and `VITE_SITE_NAME` with `VITE_SITE_HOME` put a small link back to your site on the start page.
- **Start page, "Clubs Worldwide".** Opening the page without `?venue=` now lists the clubs to choose from: Berghain (Berlin), Ministry of Sound (London) and Flex (Vienna). Each card is a link, so a choice can be shared. A build made with `VITE_VENUE` still opens that venue directly.
- **Flex: the hall's bar.** The steel bar on the left of the hall, on its plinth, with crates lit blue behind it and the COCKTAILS sign in red letters and bulbs above.
- **Flex: the café, from photographs.** The bar now stands on a raised side along the canal, behind three winding concrete steps edged in red light, with red stools and blue crates. Red and black leather sofas on castors, a silver duct along the inner wall with its branch to the floor, strips of tube light on the red ceiling, and a plywood deck on scissor legs with old par cans, LED bars and the glass doors beside it.
- **Flex: outside.** The club's own logo over the door as a sign set with bulbs, an EINTRITT ticker beside the door, a railing along the water's edge, the quay walls sprayed from the quay to the street, and a wall of painted heads along the garden (invented, in the spirit of the boards that stood there).
- **Flex: toilets, cloakroom, seating.** Toilets with the wall of sweets, a cloakroom counter with coats, people sitting on the café's sofas, at its bar and at the picnic tables in the garden.
- **Kit:** `tree`, `bollard`, `lampPost`, `stool`, and `prism` (a slab over any outline, for curved steps and counters that are not square).
- **Start page: name and title.** The page is headed "Clubs Worldwide", and its HTML title is "Clubs Worldwide: Virtual Tours of Famous Nightclubs in 3D", with a description for search engines and link previews. The site is built with relative paths, so it can be served from any folder, for example `/projects/clubs/`.
- **Start page: who made each model.** Each card names the model's maker (Berghain and Flex by Nader Cserny, Ministry of Sound by Tim Huckle), and under the cards a line links to this repository: "Open source. Build your own club experience with Club Kit".
- **Credits:** the README names who made each model: Berghain and Flex by Nader Cserny, Ministry of Sound by Tim Huckle.
- **A skill for building a club**, shared by every agent that works here: `.claude/skills/build-a-club/SKILL.md`, linked from `AGENTS.md` and `CLAUDE.md`. It gives the order to work in, the kit component for each job, what makes a room look real, and how to check the result.
- **A walk test for any venue:** `tools/test/route.mjs` walks the routes in a JSON file and checks that what should stop a walker does. `tools/test/routes/flex.json` is Flex's.
- `AGENTS.md`, with the rules for working in this repository, and this changelog.

### Changed

- **Ministry of Sound and Flex by day are closed:** silent but for the room tone, where the music used to play on in empty rooms. Berghain's Sunday morning stays open.
- **Crowds are there whenever the club is open** unless they name the times they are there, so a plan no longer lists the same time on every crowd. A crowd that belongs to a closed building (a cleaner, a sound engineer) names that time.
- **Kit:** what an animation is told is whether the club is `open`, where it used to be told whether it was night. Decks, screens, beams and signs follow that.
- **Ministry of Sound:** the crest is stored as lossless WebP instead of PNG. It is the same picture, pixel for pixel.
- **Addresses.** Every venue has an address of its own, `/berghain/`, `/mos/`, `/flex/`, in place of `?venue=berghain`. The build writes a page per venue, each with the venue's name in its title, and every venue page has a link back to the start page. Viewpoints and the time of day stay in the query (`/flex/?view=floor`). The old `?venue=` form is still read.
- **Berghain: the booth's decks.** The four turntables and the mixer on the main floor are now the kit's DJ equipment, the same finely made pieces that stand in Ministry of Sound and Flex. The drum machine, the record crate and the DJ stay Berghain's own, as does everything else about the room: only the DJ equipment is shared between the clubs.
- **Kit: `djPieces`** places single turntables, media players and mixers anywhere on a desk, for a booth that is not one of the two ready layouts. `DJ_SIZES` gives their sizes.
- **Flex: the hall, from photographs.** The stage is a deck on legs between two black pillars that carry the speaker columns, with the mouths of two bass horns and a red RAUCHVERBOT ticker under each end. A ring of truss hangs low in front of it with a lens ball in the middle. The raised side is only the last stretch before the stage, with curved concrete steps at its corner, red tube handrails and two square columns chalked "Rauchen verboten" and "VIP". A wire mesh covers the upper inland wall under a silver duct. The hall is 4.3 m high, not 4.6.
- **Flex: surfaces.** Plain colours are replaced by painted finishes: matt black masonry with tags, a pale worn screed, a dark polished floor in the café, quay paving, tiles, rippling water in the canal.
- **Flex: light.** The matrix over the dance floor and the LED bars on the pillars run amber, as the club runs them. By day a working light is on in the hall and the café's tubes are lit.
- **Flex: music.** The hall plays techno, with the booth as a homage to Electric Indigo.
- The link between Flex's café and hall moved along the wall to make room for the bar.

### Fixed

- **Engine: the wheel no longer lifts a walker into the air.** Out of doors, scrolling toward a building while looking up at it climbed without end once the wall stopped the walk, and left the visitor hovering high over the scene. Someone standing on the ground now walks with the wheel, indoors and out; only someone already in the air (Q, or a viewpoint above) climbs and dives with it. E no longer drops to street level where there is no floor underneath. The route test can check this (`grounded` entries), and Flex's does.
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
