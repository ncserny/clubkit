---
name: build-a-club
description: Build a new walkable 3D club (a venue) in this repository, or make an existing one more realistic. Use when asked to add a club, model a venue, dress a room, or match the model to photographs or plans.
---

# Build a club

A venue is a folder in `src/venues/<id>/`. The engine (`src/engine/`) walks it, lights it and fills it with people; the kit (`src/kit/`) supplies the parts. Your job is the plan, the placing of parts, and the few things only this club has. `src/venues/flex/` is the worked example: read its `plan.ts` and `build.ts` before you start.

## Which model to use

Use the most capable model you have. These venues were built with Claude Fable 5.2 (`claude-fable-5-2`). The work is mostly reading photographs and drawings and reasoning about space in three dimensions, and a weaker model gets rooms the wrong way round, puts the bar on the wrong wall and cannot tell from a screenshot that it has. If you are a smaller model, say so and keep to small, checkable steps.

## The order that works

1. **Research first, in writing.** Write `docs/<id>-research.md`. Tag every fact SOURCED (with a link) or GUESSED (with the reasoning). Look for the venue's own technical documents (stage plot, hall plan, lighting plot, tech rider): they give real dimensions. Get coordinates and the footprint from OpenStreetMap. Ask the user for photographs of the rooms empty; they correct more than any text.
2. **Fetch the map.** `node tools/fetch-osm.mjs <lat> <lon> <radius> src/venues/<id>/osm.json`.
3. **Choose a frame.** Put the origin on a wall you can find on the map and run x along the building's long axis. Say in a comment at the top of `plan.ts` what x, z and y mean. Work out which way is left and right when facing the stage, once, and write it down.
4. **Write the plan** (`plan.ts`, typed by `engine/types.ts`): rooms, links, stairs, platforms, obstacles, lights, crowds, viewpoints, times of day. Keep sourced numbers in `MEASURED` and estimates in `GUESS`.
5. **Block it out.** `build.ts` starts with `buildBlockout(ctx, { byRoom: true })`. Register the venue in `src/venues/index.ts` (in `venues` and in `catalogue`) and walk it before adding anything.
6. **Fit it out from the kit.** See the table below. Draw onto one stage per room.
7. **Dress it.** Only now paint surfaces (`textures.ts`) and add what the kit does not have.
8. **Check it** (below), update `CHANGELOG.md`, and add the venue to the README's table.

## Reach for the kit before you write geometry

| You need | Use |
|---|---|
| A DJ and their gear | `djBooth` (returns where the DJ stands), `dj` for the person |
| A sound system | `speakerStack`, `speakerCabinet` |
| Lights that move | `movingHeads`, `strobe`, `mirrorBall`, `parCan` |
| A video wall | `ledScreen` + `playScreens`, or `swirlScreen` |
| A bar | `barCounter` (with `backBar` for shelves of bottles), `stool` |
| Seating | `sofa`; people with the `sit` behaviour at the seat's height |
| A dance floor, a bar crowd, a queue, a door | `dancers`, `talkers`, `queue`, `bouncer`, `doorStaff` |
| Rails, truss, stairs, crowd barriers | `railing`, `trussRun`, `trussLeg`, `openStair`, `barrierLine` |
| Outdoors | `tree`, `lampPost`, `bollard`, `graffitiWall` |
| Anything else | `box`, `along`, `cyl`, `tube`, `panel`, `prism` from `kit/shapes.ts` |

If you build something another club could use, put it in `src/kit/`, export it from `kit/index.ts`, and use it from there. But share equipment, not character: decks, cabinets and truss are the same in every club, while surfaces, signs, layout and the lighting design are what make a club itself and stay in the venue. For a booth that is not one of the ready layouts, place the pieces one by one with `djPieces` (see Berghain's booth).

## What makes it look real

- **Proportions before detail.** Count things in the photograph against a known size (a door is about 2 m, a pillar's width, a person). A room that is the right size with plain walls reads as the place; a wrong-sized room with good textures does not.
- **Dark rooms are not black.** Give walls a painted texture with wear at hand and shoulder height, and keep tags small and pale. Bright, saturated graffiti indoors looks like stickers.
- **Light is the dressing.** A club is seen by its own light. Give each room two or three coloured point lights in a set of its own, name only that set in the room's zone, and let fixtures pulse with `f.pulse`. Add a plain white working light for the daytime state.
- **Clutter overhead.** Beams, ducts, cable trays and hung fixtures do more for a hall than anything at eye level.
- **Open and closed.** A time of day has `night` (the light) and `open` (the club running). Give every venue an open night and one other state: closed by day if it shuts, open in daylight if it runs through the morning. Closed is handled for you: no music, no crowds, no strobe, kit fittings off. Add what the closed building has of its own: tube lights on, a working light, signs dark.
- **Signs and words** carry a place: the notice on a column, the ticker under the stage, the sign over the bar. Paint them on a canvas.

## Rules that will save you

- **Everything a visitor should not walk through is an obstacle in the plan**, not only a mesh in the build. Bars, sofas, columns, rails, the water's edge.
- **A step higher than 0.75 m cannot be walked up.** A stage at 1 m is unreachable from the floor, which is right. Give it a way up from a platform if people should stand on it.
- **Ground that is not at street level** (a quay, a sunken yard) is declared with `outdoors.cut` and reached by a stair from `outside`. See Flex.
- **A thick wall needs its doorway added to a room** with `also`, or the visitor is briefly "outdoors" in it.
- **Keep viewpoints clear of the crowd**: give `dancers` an `avoid` rectangle where a viewpoint stands.
- **Text on a panel reads the right way round only from one side.** Order the panel's two points so that it reads from where people stand.
- **Never copy** a real logo, poster, mural or photograph into the model unless the user gives you the file and says to use it; even then, note in the README that the license does not cover it. Invent posters and graffiti.
- **Name real people only as a homage**, and say that the figure and the music are not theirs.

## Checking

Run the dev server (`npm run dev`) and:

1. **Typecheck and build:** `npm run typecheck && npm run build`.
2. **Look at every viewpoint**, at night and by day (`/<id>/?view=<viewpoint>&time=day&ui=0`). Wait until the page says it is ready before judging a screenshot. Compare each against the photograph it came from.
3. **Walk it.** Write `tools/test/routes/<id>.json` (see `flex.json`) with the routes a visitor takes and the things that must stop them, then:
   `VENUE=<id> ROUTE=tools/test/routes/<id>.json BASE=http://localhost:5173/ node tools/test/cdp.mjs tools/test/route.mjs`
4. **If you changed the engine or the kit**, prove the other venues did not change: render before and after with `tools/test/render.mjs` and compare with `tools/test/compare.mjs`.

On a Mac, set `CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. `CDP_GPU=1` makes the walk tests fast; leave it off for pixel comparisons.
