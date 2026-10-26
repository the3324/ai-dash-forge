# AI Dash Forge

A static, browser-only Geometry Dash level generator and editor. The generator is deterministic from its seed and uses procedural rules plus simple keyword parsing. It does **not** call a language model, paid API, server, or account service. Generated levels and saves stay in your browser unless you export a file.

## Run locally

Serve this folder with any static web server (ES modules may be blocked when opening `index.html` directly as a `file://` URL). For example, if Python 3 is available, run `python3 -m http.server 8000` from this folder and open `http://localhost:8000`. No package install or build step is required. For a free public deployment, push these files to a public GitHub repository and enable Pages from the repository settings; GitHub Pages serves static HTML, CSS, and JavaScript from public repositories on GitHub Free. [GitHub Pages details](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

## Native file format

The editor serializes Geometry Dash object records in the native `key,value,...;` form. Every object includes keys `1` (object ID), `2` (X), and `3` (Y); the level string begins with level-start settings (`kA...`) and is followed by the object records. The app places the inner level string in the `k4` field of a plist-style XML level dictionary, gzip-compresses and Base64-encodes that inner string, then gzip-compresses and Base64-encodes the full XML document; the `.gdlvl` download is that Base64 text. Export performs a local decode round-trip and verifies the XML field and object count before downloading.

The `.gdlvl` container and object-string structure are based on the community-maintained [GD Docs level resource](https://boomlings.dev/resources/client/level), [level object resource](https://github.com/gd-programming/gd.docs/blob/main/docs/resources/client/level-components/level-object.md), and [level string encoding notes](https://github.com/gd-programming/gd.docs/blob/main/docs/topics/levelstring_encoding_decoding.md). The game’s object IDs and parsing behavior are version-sensitive. Treat 2.209+ as the target and import the file in the game to confirm compatibility. The in-browser round-trip proves the file is internally well-formed; it cannot prove RobTop’s importer accepts every generated combination because this project does not bundle or emulate the game.

### Importing

On Geometry Dash 2.209 or later, use the editor’s built-in level import action and choose the downloaded `.gdlvl` file. On desktop, choose it from the file picker. On iPhone/iPad or Android, save it to the system Files/Downloads location first, then select it through the game’s picker. Exact menus and picker behavior vary by game and OS build. Versions before 2.209 lack the documented built-in `.gdlvl` import/export flow. No mod or direct save-file replacement is required by the supported workflow. You need a legitimate copy of Geometry Dash; this project cannot provide the game.

## Current scope and limitations

- Cube is the default gameplay. Optional mode portals add wave/cube/ship/ball portal objects; speed and gravity portal objects can also be generated based on the prompt. The level editor can place blocks, spikes, and blocks used as platforms.
- Prompt parsing is rule-based keyword detection, not generative AI. It is free, immediate, and works offline.
- The preview is an editor visualization, not a full Geometry Dash physics engine. Validation flags tight spike spacing and hazards near mode changes, and explicitly reports its findings as warnings. It does not prove a level beatable. Test levels in Geometry Dash, especially Demon, speed, and mode-transition sections.
- Object IDs and XML key conventions may change in future game versions. Compatibility is not claimed for versions below 2.209 or for untested future builds.
- The level itself and the website are free. Geometry Dash is a separately purchased game and is not free.

## Files

- `index.html` — interface
- `styles.css` — responsive dark UI
- `app.js` — editor, interaction, storage, and download flow
- `core.js` — procedural generator, native string serialization, gzip/Base64 container, validation, and round-trip verification
