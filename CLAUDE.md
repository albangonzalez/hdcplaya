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
pnpm seed:units                       # add the condo's units (scripts/seed-units.ts, run with tsx); skips existing ones
```

There is no test runner configured.

## Commits

Always commit with short messages: a single concise subject line (e.g. `Add login page`), no body.

## Stack

Next.js 16.4 (App Router) · React 19.3 · TypeScript strict · Tailwind CSS v4 · shadcn/ui on Base UI · pnpm.

The Next.js version is newer than most training data — per `AGENTS.md`, read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code. Things already in use here that differ from older Next:

- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. With Cache Components on, uncached/request-time data access in a Server Component has to sit behind `<Suspense>` or be explicitly cached — check the docs before adding data fetching.
- Session checks wait for the request: `lib/supabase/server.ts` calls `await io()` before creating the client, because Supabase compares the session's expiry with the current time and Next otherwise reports `Date.now()` during prerendering. Anything that awaits it (directly or through `getCurrentUser()`) must therefore sit inside a `<Suspense>` placed in or below the layout shared with the previous page, or Next reports a blocking navigation. That is why `app/(app)/layout.tsx` and `app/(app)/(admin)/layout.tsx` are plain layouts wrapping an inner async component in `<Suspense>`, and why the login, forgot-password and set-password pages render `RedirectIfSignedIn` / `RedirectIfSignedOut` (`components/auth/SessionRedirect.tsx`) inside `<Suspense>` instead of awaiting the session themselves.
- Layout/page props use the globally generated `LayoutProps<"/route">` / `PageProps<"/route">` helpers (see `app/layout.tsx`) rather than hand-written prop types.
- Tailwind is wired through a Turbopack loader rule (`@tailwindcss/turbopack` in `next.config.ts`), not PostCSS. There is no `postcss.config.*` and no `tailwind.config.*`; all theme configuration lives in `app/globals.css`.

## Architecture

The product is an app for **Hacienda del Carmen Playa** (the name shown on the login screen). It is at an early scaffold stage: routes are shadcn blocks that have been dropped in and are only partly customized. `SPECS.md` is the product spec and data model.

- `app/login/page.tsx` — two-column login screen rendering `components/login-form.tsx`, which composes the OAuth buttons in `components/auth/`.
- `app/(app)/layout.tsx` — the shell for every signed-in page: checks the session with `getCurrentUser()` (redirects to `/login`), then renders `SidebarProvider` → `AppSidebar` + `SidebarInset` with `SiteHeader` and `{children}` as the right panel. New signed-in pages go inside `(app)` and render only their own content. `SiteHeader` takes its title from the menu item matching the current path.
- `app/(app)/page.tsx` (`/`) — the dashboard: `SectionCards` and `ChartAreaInteractive`, still the shadcn `dashboard-01` placeholder content. `components/data-table.tsx` (the block's table) is no longer rendered anywhere.
- `app/(app)/(admin)/layout.tsx` — admin-only pages; redirects non-admins to `/`. Route groups don't appear in URLs, so `app/(app)/(admin)/users/page.tsx` is `/users`.
- `app/(app)/(admin)/users/` — the users list, and the pattern for data pages: `page.tsx` renders the frame and wraps an async Server Component (`users-table.tsx`) in `<Suspense>` with a skeleton fallback; the query lives in `lib/data/` (`getUsers()`), re-checks the role itself, and returns plain objects (no `ObjectId`/`Date`) so rows can reach Client Components. Statistics cards (`users-stats.tsx`, `getUserStats()`) stream in their own `<Suspense>` above the table. `user-form-dialog.tsx` is the create/edit modal (no `user` prop = create), opened by `add-user-button.tsx` and by the Edit row action; creating calls the `createUser` Server Action in `actions.ts` (admin check, `userInputSchema`, Supabase `inviteUserByEmail` through `lib/supabase/admin.ts` with `SUPABASE_SECRET_KEY`, then the MongoDB insert with status `invited`, undoing the Supabase user if the insert fails, then `refresh()`); editing does not save yet. The other row actions (`user-row-actions.tsx`) are listed but not wired.
- `app/(app)/(admin)/units/` (`/units`) — the units list, built like the users page: statistics (`units-stats.tsx`, `getUnitStats()`; the ownership-share card warns when shares do not add up to 10,000), then the table (`units-table.tsx`, `getUnits()` and `getOwnerOptions()` in `lib/data/units.ts`). The only row action is Edit (`unit-form-dialog.tsx`): identifier, ownership share as a number of shares out of 10,000 (`OWNERSHIP_SHARE_TOTAL`), and the current owners picked from users with the owner role (multi-select). The `updateUnit` Server Action in `actions.ts` validates with `unitInputSchema` and keeps ownership history: an owner who is removed gets `to` set to now, a new one is appended with `from` now. There is no way to create a unit yet, and unit edits are not written to the audit log.

Component layers:

- `components/ui/` — shadcn-generated primitives. Style is `base-vega` (`components.json`), meaning they wrap **`@base-ui/react`**, not Radix. Base UI's API differs from Radix (e.g. composition via the `render` prop instead of `asChild`, `data-*` state attributes like `data-vertical`), so don't paste Radix-flavoured shadcn snippets in unchanged.
- `components/*.tsx` — block-level compositions (sidebar, nav-*, data table, chart, login form).
- The sidebar menu is data-driven: `config/menu.json` lists groups and items (`label`, `path`, `icon`, optional `roles` per group; `label` is a key in the `Menu` messages namespace, not display text), and `lib/menu.ts` maps icon names to `lucide-react` components and filters groups by role. To add an item, edit the JSON; a new icon also needs an entry in the `menuIcons` map. Most menu paths have no page yet.
- `components/auth/` — app-authored components; these use PascalCase filenames, unlike the kebab-case shadcn files.

Auth is Supabase via `@supabase/ssr`, with three clients in `lib/supabase/`: `client.ts` (browser), `server.ts` (Server Components / route handlers, cookie-backed) and `proxy.ts` (session refresh). The root `proxy.ts` runs `updateSession` on every non-asset request and redirects unauthenticated users to `/login` for everything except `/login` and `/auth/*`. Pages also check the session themselves with `getClaims()` via the server client: `app/(app)/layout.tsx` (through `getCurrentUser()`) redirects to `/login` when there is no user, and `app/login/page.tsx` redirects to `/` when there is one. Sign-in happens client-side: `components/login-form.tsx` calls `signInWithPassword` and the buttons in `components/auth/` call `signInWithOAuth` (Google, Facebook), which returns through `app/auth/callback/route.ts` to exchange the code for a session. Both paths land on `/`; a failed OAuth exchange goes to `/login?error=oauth`. Sign-out is the "Log out" item in `components/nav-user.tsx` (`signOut()` on the browser client, then `/login`). E-mailed links (invitation, later password reset) come back to `app/auth/confirm/page.tsx`, a Client Component: Supabase puts the tokens in the URL fragment (invitations cannot use PKCE), so it reads them in the browser, calls `setSession` and goes to `/auth/set-password`; a bad or expired link goes to `/login?error=link`. `createUser` passes `redirectTo: <origin>/auth/confirm`, which must be listed in Supabase's allowed redirect URLs. `app/auth/set-password/page.tsx` (`components/set-password-form.tsx`) needs a session (otherwise `/login`), calls `updateUser({ password })`, then the `activateCurrentUser` Server Action (`invited` → `active` in MongoDB), then goes to `/`. The "forgot password" link on the login form goes to `app/auth/forgot-password/page.tsx` (`components/forgot-password-form.tsx`), which calls the `requestPasswordReset` Server Action: it sends the reset e-mail from the server with a plain (non-PKCE) Supabase client so the link carries its tokens in the URL fragment like an invitation, passes no `redirectTo` (the link goes to the Site URL configured in Supabase, which has to be `/auth/confirm`), and answers the same whether or not the address has an account. Sign-up is not implemented.

Application data is MongoDB through the official `mongodb` driver (no ODM), validated with Zod. `lib/mongodb.ts` holds the shared client (`getDb`, `getCollection`; database name comes from `MONGODB_URI`). `models/` has one file per collection from `SPECS.md` section 10, each exporting a Zod schema, the inferred type and a typed collection accessor (`userSchema`, `User`, `usersCollection()`); import from `@/models`. The driver does not validate, so parse with the schema before every write. `ensureIndexes()` in `models/indexes.ts` creates the unique indexes the model relies on and is not called anywhere yet. Amounts are integer centavos; fields that can be absent are stored as `null`, not omitted. `lib/current-user.ts` (`getCurrentUser()`, cached per request) is the way to get the signed-in user on the server: it returns the Supabase id and e-mail plus `profile`, the MongoDB user document (null if the Supabase user has none). The `(app)` layout uses it for the session check and the sidebar's user block.

### Conventions

- `cn` comes from the **`cn` npm package** (shadcn's compiled clsx + tailwind-merge replacement), not a local implementation. Generated components import it directly (`import { cn } from "cn"`); `lib/utils.ts` just re-exports it. `clsx` and `tailwind-merge` are not dependencies.
- Path alias `@/*` maps to the repo root (there is no `src/`).
- Icons are `lucide-react`, using the `*Icon`-suffixed exports.
- Theme tokens are OKLCH CSS variables in `app/globals.css` (`:root` and `.dark`), exposed to Tailwind via `@theme inline`. Dark mode is class-based (`@custom-variant dark`).
- i18n is `next-intl` without locale routing: Spanish (default) and English, chosen by a `locale` cookie that `i18n/request.ts` reads; `i18n/actions.ts` (`setLocale`) writes it and `components/locale-switcher.tsx` calls that. Messages live in `messages/es.json` and `messages/en.json`, grouped by namespace (`Login`, …); `es.json` is the source of truth for key types (`global.d.ts`). Add every new user-facing string to both files and read it with `useTranslations` / `getTranslations` — no hard-coded copy. The login page and the sidebar menu are translated; the dashboard content and the user menu are still hard-coded English.
- Because the locale comes from a cookie, `app/layout.tsx` wraps the app in `<Suspense>` around `NextIntlClientProvider` (required by `cacheComponents`), so pages are partially prerendered: anything translated renders per request. `<html lang>` is rendered as the default and corrected on the client by `components/html-lang.tsx`.
- `app/layout.tsx` mounts `ThemeProvider` (next-themes, class-based, system default; pressing `d` outside inputs toggles dark mode) and the sonner `Toaster`, so `toast()` works from any client component.

### Known gaps in the current scaffold

These are existing loose ends, worth knowing before debugging around them:

- `app/layout.tsx` still has the default "Create Next App" metadata.
