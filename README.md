<div align="center">

# Rival

**Your only rival is yesterday.**

_A duel lit by starlight — you, and the rival-glow of who you were yesterday._

</div>

---

Rival is a habit and progress tracker built around one idea: your only real opponent is the version of you from before. No leaderboards, no strangers to outperform — just you, in orbit with yesterday-you, always tracking, never quite catching up.

It's an installable app (works offline, lives on your home screen) with its own visual identity — **Cosmic Rival** — built to feel less like a productivity tool and more like a small, quiet universe you check in on.

## Getting it running

```sh
npm install
npm run dev
```

That's it — opens at the usual Vite dev URL.

A few other commands worth knowing:

- `npm run check` — the all-in-one gate (types, lint, format) — run this before you push anything
- `npm run build` / `npm run preview` — build for real and look at what actually ships

## Contributing / poking around

This is a young project, so expect things to move. A couple of house rules that'll save you a round-trip:

- **Formatting and linting are on oxlint + oxfmt**, not ESLint/Prettier — install the **Oxc** extension in VS Code (`oxc.oxc-vscode`) and it'll pick up the project's config automatically. Don't reach for Prettier here; it'll just fight with oxfmt over the same files.
- **Dark is the real default** — if you're touching theme logic, don't assume OS preference should win; the app deliberately opens dark regardless of system setting on first visit.
- **Icons come in theme pairs** — if you ever add a new icon/asset, check whether it needs a light _and_ dark variant before you call it done. Most of what's in `public/` does.

Questions, half-formed ideas, "does this even make sense" — all welcome. This is still small enough that a conversation before a PR usually beats a big diff after one.
