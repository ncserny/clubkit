# Club Kit

A framework (`src/engine/`), a components library (`src/kit/`) and venues (`src/venues/<id>/`) for walkable 3D clubs in the browser. The README explains each layer.

## Building or dressing a club

Follow `.claude/skills/build-a-club/SKILL.md`. It is a plain Markdown file, written for any agent: the order to work in, which kit component to reach for, what makes a room look real, and how to check it. Use the most capable model available (the venues here were built with Claude Fable 5.2); the work is reading photographs and reasoning about space, and smaller models get rooms the wrong way round.

## Changelog

**Every change updates `CHANGELOG.md` in the same commit.** It follows Keep a Changelog: newest first, grouped under Added, Changed, Fixed and Removed, written for someone who uses the repository, not as a list of commits. Say which layer a change is in: the engine, the kit, or a named venue.

## Components first

Before building a fitting inside a venue, look in `src/kit/`. If it is something another club could use (a light, a speaker, a bar, a kind of furniture, a kind of person), add it to the kit and use it from there. A venue's own files hold only what that club alone has.

## Share equipment, not character

The clubs share what is the same in real life: DJ equipment, speaker cabinets, truss, rails, the people. They do not share what makes each of them itself: surfaces, layout, signs, lighting design, furniture with a look of its own. When moving something into the kit, ask whether two real clubs would have bought the same thing. If not, leave it in the venue.

## Guessed and measured

A venue's `plan.ts` keeps what comes from a source in `MEASURED` and what is estimated in `GUESS`. Do not present a guess as a fact, in the plan or in the venue's copy.

## Checks before a push

- `npm run typecheck` and `npm run build`.
- A change to the engine or the kit must not change a venue by accident: render before and after with `tools/test/render.mjs` and compare with `tools/test/compare.mjs` (see Tests in the README).
- Walk the venue that changed: `tools/test/navtest.mjs` (Berghain), `tools/test/moswalk.mjs` (Ministry of Sound).

## Not ours

Club names, artists' names, the Ministry of Sound crest and the Flex logo belong to their owners and are not covered by the repository's license. Posters, graffiti and murals in the models are invented, never copied from the real ones.

## Writing

No em dashes in copy, comments, commit messages or docs.
