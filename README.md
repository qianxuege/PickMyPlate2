# PickMyPlate

An Expo app for exploring restaurant menus and discovering dishes. Built with a centralized design system based on wireframes in `UserInterfaces/`.

## Get Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npm start
   ```

3. **Supabase + Expo Go — email confirmation**

   **Why Chrome on iOS often fails:** In-app browsers and **Google Chrome** on iPhone frequently **block** jumping from a web page to a custom app URL (`pickmyplate://`). Mail may not list **Expo Go** as an option because the OS treats the link as a browser job first.

   **Try first:** In Mail, **long-press** the confirm link → **Open in Safari** (not Chrome). Safari usually allows the handoff to `pickmyplate://` so **Expo Go** can open.

   **Reliable approach — HTTPS bridge (recommended):**

   1. Host the static file `public/auth-callback-bridge.html` on any **https** URL (e.g. [GitHub Pages](https://pages.github.com/), Netlify Drop, Cloudflare Pages). Example final URL:  
      `https://YOURNAME.github.io/YOUR_REPO/auth-callback-bridge.html`
   2. Supabase → **Authentication → URL Configuration**
      - **Site URL:** that full `https://…/auth-callback-bridge.html` URL (no wildcards).
      - **Redirect URLs:** add the same `https://…` URL **and** `pickmyplate://**` (and `pickmyplate://auth/callback` if you like).
   3. Request a **new** confirmation email. Flow: email → opens **https** page → page redirects to `pickmyplate://auth/callback#access_token=…` → **AuthDeepLinkHandler** in the app calls `setSession`.

   **Local-only (same Wi‑Fi, fiddly):** `npm run web`, then temporarily set Site URL to `http://YOUR_LAN_IP:8081/auth-callback-bridge.html` and add it under Redirect URLs — only works if the phone can reach your PC.

   **Dev shortcut:** disable **Confirm email** under **Authentication → Providers → Email** so you don’t depend on the link.

## Supabase database

Schema and RLS live in `supabase/migrations/`. The app reads **`EXPO_PUBLIC_SUPABASE_URL`** and **`EXPO_PUBLIC_SUPABASE_KEY`** from `.env` (see `lib/supabase.ts`), so you choose **local** or **cloud** by which values you put there—not by which CLI command you run.

### Local stack (does not touch cloud)

- **`npm run supabase:start`** runs `supabase start`: starts the full Supabase stack in **Docker** on your machine (Postgres, Auth, Studio, etc.) and applies migrations to that **local** database.
- Data is **only in those containers**. Starting or resetting locally **does not change** your hosted Supabase project.
- After start, run **`npm run supabase:status`** and copy the API URL and anon key into `.env` for local development.
- **`npm run supabase:db:reset`** wipes the local DB and reapplies migrations (useful when iterating on schema).
- **`npm run supabase:stop`** stops the local stack.

Requires [Docker](https://docs.docker.com/get-docker/) running and the [Supabase CLI](https://supabase.com/docs/guides/cli) (the repo includes the `supabase` dev dependency; `npx supabase …` works too).

**Troubleshooting `Cannot connect to the Docker daemon`:** Open **Docker Desktop** from Applications and wait until it reports **Docker is running** (whale icon in the menu bar). Confirm with `docker ps` (should list containers or print an empty table, not a connection error). If it still fails, fully **Quit Docker Desktop** (menu bar → Docker → Quit) and start it again; avoid running `supabase start` until the daemon is up. You can skip local Docker entirely by using a **hosted** Supabase project and `npm run supabase:db:push` instead.

### Hosted project (Supabase Cloud)

To apply the same migrations to a **remote** project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run supabase:db:push
```

`YOUR_PROJECT_REF` is the id in the dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`.

Use that project’s **Project URL** and **anon public** key in `.env` when you want the app to talk to cloud.

### Other npm scripts

| Script | Purpose |
| ------ | ------- |
| `supabase:link` | Link CLI to a remote project (`supabase link`) |
| `supabase:db:push` | Push local migrations to the linked remote database |
| `supabase:migration:new` | Create a new empty migration file |

## Design System

Design tokens and reusable components live in `constants/theme.ts` and `components/`. All screens should use these—no duplicated styles.

### Theme (`constants/theme.ts`)

**Colors**

| Token             | Value     | Usage                   |
| ----------------- | --------- | ----------------------- |
| `primary`         | `#FF6A3D` | Buttons, links, accents |
| `background`      | `#FFFFFF` | Screen background       |
| `text`            | `#101828` | Headings, labels        |
| `textSecondary`   | `#667085` | Body, subtitles         |
| `textPlaceholder` | `#A0AEC0` | Input placeholders      |
| `error`           | `#E53E3E` | Error text, validation  |
| `border`          | `#D0D5DD` | Input borders, dividers |

**Spacing** (`xs` 4 → `xxxl` 40)

**Border radius** (`sm` 8 → `base` 12 → `full`)

**Typography** — `heading`, `headingSmall`, `body`, `bodyMedium`, `caption`, `label`, `button`, `small`

### UI Components

| Component         | Props                                                                                        | Description                            |
| ----------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| `PrimaryButton`   | `text`, `onPress`, `style`, `disabled`, `loading`                                            | Orange primary CTA                     |
| `SecondaryButton` | `text`, `onPress`, `style`, `disabled`, `loading`, `icon`                                    | Outlined secondary action              |
| `InputField`      | `label`, `error`, `placeholder`, `style`, `inputStyle`, `containerStyle` + `TextInput` props | Labeled input with optional error      |
| `ScreenContainer` | `children`, `scroll`, `padding`, `backgroundColor`, `centered`                               | Screen layout with safe area           |
| `ErrorText`       | `text` or `children`, `style`                                                                | Red error message                      |
| `Divider`         | `text`, `style`                                                                              | Horizontal divider, optional "OR" text |

**Usage**

```tsx
import {
  Divider,
  InputField,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from "@/components";
import { Colors, Spacing, Typography } from "@/constants/theme";

export default function LoginScreen() {
  return (
    <ScreenContainer scroll padding="xl">
      <Text style={[Typography.heading, { color: Colors.text }]}>
        PickMyPlate
      </Text>
      <InputField label="Email" placeholder="your@email.com" />
      <PrimaryButton text="Log In" onPress={() => {}} />
      <Divider text="OR" />
    </ScreenContainer>
  );
}
```

## Documentation

- **[Diner personalization & smart preference tags](docs/diner-personalization.md)** — onboarding flow, rule-based tag parsing, and Supabase schema (`diner_*` tables, diner-only RLS).
- **[Restaurant owner: login, registration, profile](docs/restaurant-owner.md)** — auth vs `restaurants` / `restaurant_cuisine_types`, restaurant-only RLS.
- **[Dual diner + restaurant accounts](docs/account-roles.md)** — `user_roles`, role picker, and switching after login.

## Project Structure

```
PickMyPlate2/
├── app/                    # Expo Router screens
│   ├── _layout.tsx
│   └── index.tsx
├── assets/
├── components/             # Reusable UI (design system)
│   ├── PrimaryButton.tsx
│   ├── SecondaryButton.tsx
│   ├── InputField.tsx
│   ├── ScreenContainer.tsx
│   ├── ErrorText.tsx
│   ├── Divider.tsx
│   └── index.ts
├── constants/
│   └── theme.ts            # Design tokens
├── docs/                   # Feature / architecture notes
├── lib/                    # Supabase client, parsers, etc.
├── hooks/
│   ├── use-color-scheme.ts
│   ├── use-color-scheme.web.ts
│   └── use-theme-color.ts
├── supabase/
│   └── migrations/         # Postgres schema + RLS
├── UserInterfaces/         # Wireframes & assets
└── app-example/            # Starter reference (excluded from build)
```

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
