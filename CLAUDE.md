# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is pnpm (pinned via `packageManager`).

```bash
pnpm dev                              # dev server (Turbopack) on http://localhost:3000
pnpm build                            # production build (also type-checks)
pnpm lint                             # ESLint (flat config, eslint-config-next core-web-vitals + typescript)
pnpm lint path/to/file.tsx            # lint a single file
pnpm exec tsc --noEmit                # type-check only
pnpm dlx shadcn@latest add <name>     # add a shadcn/ui component into components/ui/
```

There is no test runner configured.

## Stack

Next.js 16.4 (App Router) · React 19.3 · TypeScript strict · Tailwind CSS v4 · shadcn/ui on Base UI · pnpm.

The Next.js version is newer than most training data — per `AGENTS.md`, read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code. Things already in use here that differ from older Next:

- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. With Cache Components on, uncached/request-time data access in a Server Component has to sit behind `<Suspense>` or be explicitly cached — check the docs before adding data fetching.
- Layout/page props use the globally generated `LayoutProps<"/route">` / `PageProps<"/route">` helpers (see `app/layout.tsx`) rather than hand-written prop types.
- Tailwind is wired through a Turbopack loader rule (`@tailwindcss/turbopack` in `next.config.ts`), not PostCSS. There is no `postcss.config.*` and no `tailwind.config.*`; all theme configuration lives in `app/globals.css`.

## Architecture

The product is an app for **Hacienda del Carmen Playa** (the name shown on the login screen). It is at an early scaffold stage: routes are shadcn blocks that have been dropped in and are only partly customized, with no backend yet.

- `app/page.tsx` — untouched create-next-app landing page.
- `app/login/page.tsx` — two-column login screen rendering `components/login-form.tsx`, which composes the OAuth buttons in `components/auth/`.
- `app/dashboard/page.tsx` — shadcn `dashboard-01` block: `SidebarProvider` → `AppSidebar` + `SidebarInset` (`SiteHeader`, `SectionCards`, `ChartAreaInteractive`, `DataTable`). Rows come from the static `app/dashboard/data.json`; nav items and the user in `components/app-sidebar.tsx` are placeholder data.

Component layers:

- `components/ui/` — shadcn-generated primitives. Style is `base-vega` (`components.json`), meaning they wrap **`@base-ui/react`**, not Radix. Base UI's API differs from Radix (e.g. composition via the `render` prop instead of `asChild`, `data-*` state attributes like `data-vertical`), so don't paste Radix-flavoured shadcn snippets in unchanged.
- `components/*.tsx` — block-level compositions (sidebar, nav-*, data table, chart, login form).
- `components/auth/` — app-authored components; these use PascalCase filenames, unlike the kebab-case shadcn files.

Auth is intended to be Supabase OAuth (Google, Facebook) with a `/auth/callback` redirect, but it is only stubbed: the `signInWithOAuth` calls in `components/auth/*OAuthButton.tsx` are commented out, and neither `@/lib/supabase/client` nor the Supabase packages exist yet.

### Conventions

- `cn` comes from the **`cn` npm package** (shadcn's compiled clsx + tailwind-merge replacement), not a local implementation. Generated components import it directly (`import { cn } from "cn"`); `lib/utils.ts` just re-exports it. `clsx` and `tailwind-merge` are not dependencies.
- Path alias `@/*` maps to the repo root (there is no `src/`).
- Icons are `lucide-react`, using the `*Icon`-suffixed exports.
- Theme tokens are OKLCH CSS variables in `app/globals.css` (`:root` and `.dark`), exposed to Tailwind via `@theme inline`. Dark mode is class-based (`@custom-variant dark`).
- User-facing copy is currently mixed English and Spanish (the OAuth buttons are Spanish).
- `app/layout.tsx` mounts `ThemeProvider` (next-themes, class-based, system default; pressing `d` outside inputs toggles dark mode) and the sonner `Toaster`, so `toast()` works from any client component.

### Known gaps in the current scaffold

These are existing loose ends, worth knowing before debugging around them:

- `app-sidebar.tsx` references `/avatars/shadcn.jpg`, which is not in `public/`.
- `app/layout.tsx` still has the default "Create Next App" metadata and `lang="en"`.
