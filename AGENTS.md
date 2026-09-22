# Agent Notes

## Styling

- Keep color values centralized in `src/colors.js`.
- Component CSS should use the CSS variables exported through `colorVariables`; do not add raw hex, `rgb()`, or `rgba()` values directly in style files.
- If a new visual treatment needs a new color, add a named token to `colors` and expose it in `colorVariables`.

## Privacy

- Do not persist privacy notice dismissal, auth fields, cookies, bearer tokens, custom header values, endpoint URLs, or schema input in cookies, `localStorage`, or `sessionStorage`.
- Keep sensitive request values out of logs, docs, metrics files, and examples.

## Verification

- Run `npm run lint` and `npm run build` after UI changes.
- Run `npm test` when server behavior, validation logic, or security-sensitive request handling changes.
