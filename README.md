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
