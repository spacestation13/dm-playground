# DM Playground

This is the repository for the [DM Playground](https://play.dm-lang.org/).

The playground allows you to experiment with [DM](http://ref.dm-lang.org/) code purely in your browser.

## Architecture

The frontend is powered by [React](https://reactjs.org/), while [v86](https://github.com/copy/v86) emulates x86 running a Linux environment where BYOND is installed. **Everything happens 100% client-side.**

## Embedding the playground

Use the playground in an iframe with `?embed` to show an editor/output-only layout.

```html
<iframe
  src="https://play.dm-lang.org/?embed#<msgpack-gzip-b64>"
  width="800"
  height="500"
></iframe>
```

Supported URL parameters:

- `embed`: enables the minimized embedded layout.
- `autorun`: runs the snippet automatically after the runtime is ready.
- `theme=<themeId>`: sets the editor theme for the embed. Example values: `vs-light`, `one-dark`, `dracula`.
- `code=<base64>`: seeds the editor with base64 text.
- `#<msgpack-gzip-b64>`: the anchor seeds the editor with a [compressed share string](#share-payload-helpers). Format: `{v: 1, f: {main: string}}`.

Embed requirements:

- If you must `sandbox` it, the minimum flags are `allow-scripts allow-same-origin allow-popups`.

### Share payload helpers

Payloads use MessagePack binary format + gzip compression for efficient serialization.

You can use the Share Code button in the playground, or use the following scripts:

```bash
npm run share:encode -- "/proc/main()\n  world.log << \"hello\"\n"
npm run share:encode:json -- "{\"v\":1,\"f\":{\"main\":\"/proc/main()\\n\",\"bootstrap\":\"/world/New()\\n  ..()\\n  call(/proc/main)()\\n  eval(\"\")\\n  shutdown()\\n\"}}"
npm run share:decode -- "<msgpack-gzip-b64>"
```

If you omit the value, the script prompts for it interactively.

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
