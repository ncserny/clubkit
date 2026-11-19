# Contributing to Club Kit

Club Kit is a shared library of walkable clubs. You can add a club you remember or one you go to today, improve one that is here, or add a component other clubs can use. Everything comes in by pull request.

## How a change gets in

1. Fork the repository and make a branch.
2. Make the change. `README.md` explains the three layers (engine, kit, venues); `.claude/skills/build-a-club/SKILL.md` is the step-by-step for a new club, written for people and for AI agents alike.
3. Run the checks below.
4. Add a line to `CHANGELOG.md` under Unreleased.
5. Open a pull request against `main`. Nobody pushes to `main` directly, the maintainer included.

## Adding a club

A club is a folder in `src/venues/<id>/` and an entry in `src/venues/index.ts`. What a pull request for a new club needs:

- **Research you can show.** `docs/<id>-research.md`, with every fact marked sourced (with a link) or guessed. In the plan, sourced numbers go in `MEASURED` and estimates in `GUESS`.
- **Built from the kit** wherever the kit has the part: DJ equipment, speakers, lights, bars, people. Share equipment, not character: surfaces, layout, signs and the lighting design are what make a club itself.
- **A route file,** `tools/test/routes/<id>.json`, that walks the club and names what must stop a walker.
- **Your name in the catalogue** if you want it there: the `by` field in `src/venues/index.ts` is shown on the start page as "Model by ...".
- **Nothing that is not yours to give.** No copied logos, posters, murals or photographs. Invent the graffiti. A club's own logo may be used to identify the building only if you note in the README that the license does not cover it. Real people are named only as a homage, and the model must say that the figure and the music are not theirs.
- **Safety.** The engine caps strobes at 2.9 flashes a second and switches them off for visitors who ask for reduced motion. Do not work round that.

## Checks

```bash
npm run typecheck
npm run build
```

With the dev server running (`npm run dev`):

```bash
VENUE=<id> ROUTE=tools/test/routes/<id>.json BASE=http://localhost:5173/ node tools/test/cdp.mjs tools/test/route.mjs
```

If you changed `src/engine/` or `src/kit/`, show that the other clubs did not change: render before and after with `tools/test/render.mjs` and compare with `tools/test/compare.mjs` (see Tests in the README). Say in the pull request what you ran and what it gave.

## License

By contributing you agree that your contribution is licensed under [CC BY-NC-SA 4.0](LICENSE), like the rest of the repository, and that you have the right to license it. Others may use, adapt and share it for noncommercial purposes with credit, and must share adaptations under the same license. Commercial use needs permission from the maintainer.

## Reporting a problem

Open an issue. For a club that is wrong (a room the wrong way round, a bar on the wrong wall), a photograph or a link to a plan is the most useful thing you can attach.
