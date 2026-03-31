# DM Playground

This is the repository for the [DM Playground](https://play.dm-lang.org/).

The playground allows you to experiment with [DM](http://ref.dm-lang.org/) code purely in your browser.

## Architecture

The frontend is powered by [React](https://reactjs.org/), while [v86](https://github.com/copy/v86) emulates x86 running a Linux environment where BYOND is installed. **Everything happens 100% client-side.**

## Embedding the playground

Use the playground in an iframe with `?embed` to show an editor/output-only layout.

```html
<iframe
  src="https://play.dm-lang.org/?embed#<share-b64>"
  width="800"
  height="500"
></iframe>
```

Supported URL parameters:

- `embed`: enables the minimized embedded layout.
- `autorun`: runs the snippet automatically after the runtime is ready.
- `theme=<themeId>`: sets the editor theme for the embed. Example values: `vs-light`, `one-dark`, `dracula`.
- `code=<base64>`: seeds the editor with base64 text.
- `#<share-b64>`: the anchor seeds the editor in the [compressed share string](#share-payload-helpers) format.

Embed requirements:

- If you must `sandbox` it, the minimum flags are `allow-scripts allow-same-origin allow-popups`.

### Share payload helpers

Compressed share payloads use zlib compression for efficient serialization.

You can use the `Share Code` button in the playground, or use the following scripts:

```bash
# From a file
npm run share:encode -- ./main.dm
npm run share:encode:json -- ./payload.json

# From stdin (bash)
cat payload.json | npm run share:encode:json

# From stdin (PowerShell)
Get-Content .\payload.json -Raw | npm run share:encode:json

npm run share:decode -- "<share-b64>"
```

If you omit the argument, the script reads from stdin when piped or prompts interactively otherwise.

Example (`payload.json`):

```json
{
  "v": 1,
  "f": {
    "main": "/proc/main()\n  world.log << \"hello\"\n"
  }
}
```

## Development

The serial controller is found here: https://github.com/spacestation13/dm-playground_controller

The buildroot linux image code is found here: https://github.com/spacestation13/dm-playground-linux

### Build the UI

```bash
npm install
npm run dev # Starts development server with hot reload
```

### Build for production

```bash
npm run build   # Type-check and build
npm run preview # Preview production build
```

### Code quality

```bash
npm run lint   # Run ESLint
npm run format # Format code with Prettier
npm run test   # Run playwright tests
```

## License

[MIT](./LICENSE)
