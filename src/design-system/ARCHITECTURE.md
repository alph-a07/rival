# `src/design-system` — Tokens, Icons & Living Docs

The **design foundation** of Rival: design tokens (CSS variables), the icon set, global styles, and a self-documenting component library with a rendered docs site.

> **One-sentence purpose:** _Define the visual language once (tokens + icons +
> global styles) and document every primitive with a live, rendered playground._

```
   ┌──────────────────────────────┐
   │ design-system/design-tokens.css│  (tokens: color, type, space, ...)
   │ design-system/global.css      │  (reset + base)
   │ design-system/breakpoints.css │  (responsive)
   ├──────────────────────────────┤
   │ design-system/icons.ts        │  (the named icon set)
   ├──────────────────────────────┤
   │ design-system/docs/           │  (registry + doc pages + playground)
   └──────────▲───────────────────┘
              │ consumed by components + screens + shells
```

---

## File-by-file map

| Path                    | Responsibility                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `design-tokens.css`     | The CSS custom-property tokens (color, typography, spacing, radius, motion, shadow/glow)  |
| `generated-tokens.json` | A machine-readable token export (consumed by tooling)                                     |
| `global.css`            | Reset + global base styles                                                                |
| `breakpoints.css`       | Responsive breakpoint custom properties                                                   |
| `icons.ts`              | The authoritative `IconName` union + `iconRegistry` (the named icon set)                  |
| `docs/registry.tsx`     | Registers every doc entry (foundations + components) for the docs route                   |
| `docs/content/**`       | The per-item `.doc.ts(x)` metadata (props, examples, notes)                               |
| `docs/ui/*`             | The docs-shell components (`DocLayout`, `DocPage`, `DocPlayground`, `DocPropsTable`, ...) |

---

## Tokens drive everything

Every component styles itself from `var(--token)` custom properties, so theming is a single `data-theme` flip on `<html>` — components never hard-code values. The design system is the **styling source of truth** that `src/components` and `src/theme` both consume.

```mermaid
flowchart LR
    Tokens[design-tokens.css] --> Global[global.css]
    Theme[data-theme on html] --> Tokens
    Tokens --> Components[components read var(--token)]
    Icons[icons.ts] --> Components
    Docs[registry + playground] --> Components
```

## The living docs

The `/design-system` route (in `routes.tsx`) renders the registry through
`DocLayout`/`DocPage`: a foundations section (color, typography, motion,
shadow-glow, shape) and a components section, each with a `DocPlayground` that
renders the primitive live with editable props.

---

## Cross-package connections (one level deeper)

### Inbound — what `design-system` imports

- React (for the doc components)
- the primitives from `@/components` (to render live examples in the playground)

### Outbound — who consumes `design-system`

| Consumer                               | What it uses                                               |
| -------------------------------------- | ---------------------------------------------------------- |
| `src/components`                       | `@/design-system/icons` (`IconName`) + token CSS variables |
| `src/domain/models`                    | `IconName` on `Option` (GIS icons)                         |
| `src/domain/gis`, `src/domain/domains` | icon names for GIS/domain definitions                      |
| `src/main.tsx`                         | `@/design-system/global.css` (imported at boot)            |
| `src/routes.tsx`                       | the `/design-system` doc route                             |
| `src/shells/screens`                   | token-driven styling via components                        |

---

## Testing

The design system is documented and rendered through the `/design-system` route;
its visual correctness is asserted via the component docs playground.

```bash
npx vitest run --config vite.config.ts src
```

