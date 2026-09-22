# API Schema Coverage Dashboard

A small React and Express app for checking a GET endpoint response against an OpenAPI-style YAML schema. The client provides a form for the target URL, optional authorization, and schema input. The server fetches the endpoint, parses the JSON response, validates it, and returns a compact coverage report.

## Requirements

- Node.js 20 or newer
- npm

## Install

```sh
npm install
```

## Development

Run the API server and Vite client together:

```sh
npm run dev
```

The client is served by Vite, and the Express API exposes:

- `POST /api/check` to run a schema check
- `GET /api/health` for a lightweight health check

## Production Build

```sh
npm run build
npm start
```

`npm run build` writes the client bundle to `dist/`, which is intentionally excluded from version control.

Production-oriented nginx, systemd, and Lightsail Terraform files live in `infra/`.

## Tests

```sh
npm test
```

## Project Structure

```text
server/   Express API and schema validation logic
src/      React application
test/     Node test runner tests
```

## Notes

- `node_modules/`, `dist/`, coverage output, local environment files, logs, and editor metadata are ignored by Git.
- Keep secrets out of committed files. Use local environment files when configuration is needed.
