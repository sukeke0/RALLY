# RALLY

[Open RALLY](https://rally-au7.pages.dev/)

A mobile-first badminton scoreboard PWA for umpires. Tap to score, track service order and court positions, and undo mistakes. Supports singles and doubles, Japanese and English, offline use, and local match history with JSON import/export.

<img width="600" height="600" alt="RALLY badminton scoreboard" src="https://github.com/user-attachments/assets/e4ae0e19-68bc-4436-8c74-4592cfa0e0d7" />

## Development

Requires Node.js 22.13+ and pnpm.

```sh
git clone https://github.com/sukeke0/RALLY.git
cd RALLY
pnpm install --frozen-lockfile
pnpm dev
```

## Build

```sh
pnpm build
pnpm start
```

Deploy the contents of `dist/` at the root of an HTTPS site. Offline support is enabled in production builds after the first successful load. Match data stays in the browser.

## Tests

```sh
pnpm test
```

## License

[MIT](LICENSE)
