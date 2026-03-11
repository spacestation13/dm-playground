# DM Playground

This is the repository for the [DM Playground](https://play.dm-lang.org/).

## What's it do?

The playground allows you to experiment with [DM](http://ref.dm-lang.org/) code purely in your browser.

It has a number of features, including:

1. A simple editor with themes and syntax highlighting.
2. The ability to compile and run DM code against different [BYOND](https://www.byond.com/) versions.
3. A built-in terminal for direct interaction with the underlying Linux VM.
4. A quick-share function.

## Architecture

The frontend is powered by [React](https://reactjs.org/), while [v86](https://github.com/copy/v86) emulates x86 running a Linux environment where BYOND is installed. **Everything happens 100% client-side.**

## Development

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

## Embedding the playground

Use the playground in an iframe with `?embed=1` to show an editor/output-only layout.

```html
<iframe
	src="https://play.dm-lang.org/?embed=1&code=<base64>"
	width="800"
	height="500"
></iframe>
```

Supported URL parameters:

- `embed=1`: enables the embed layout and hides playground chrome.
- `autorun=1`: runs the snippet automatically after the runtime is ready.
- `theme=<themeId>`: sets the editor theme for the embed. Example values: `vs-light`, `one-dark`, `dracula`.
- `code=<base64>`: seeds the editor with base64 text.
- `codez=<compressed-base64url>`: seeds the editor with text compressed with gzip and then encoded as URL-safe base64. Takes priority.

Embed requirements:

- If you must `sandbox` it, the minimum flags are `allow-scripts allow-same-origin allow-popups`.
- GitHub Pages does not send `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`, so cross-origin framing works without deployment changes.

## License

[MIT](./LICENSE)
