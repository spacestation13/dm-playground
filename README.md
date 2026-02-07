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
```

## License

[MIT](./LICENSE)
