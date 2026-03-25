# PickMyPlate

An Expo app for exploring restaurant menus and discovering dishes. Built with a centralized design system based on wireframes in `UserInterfaces/`.

## Run the app

### Prerequisites

- **Node.js** (LTS) and **npm**
- **Expo Go** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) if you want to test on a device
- For **iOS Simulator**: Xcode (macOS)
- For **Android Emulator**: Android Studio with a virtual device

### Install and start

```bash
npm install
npm start
```

This starts the Expo dev server (Metro). A QR code and shortcuts appear in the terminal; you can also use the Dev Tools page that opens in the browser.

### Expo Go (physical device)

1. Install **Expo Go** on your phone.
2. Ensure the phone and computer are on the **same Wi‑Fi** (or run `npx expo start --tunnel` if they are not).
3. **iPhone:** open the **Camera** app and scan the QR code → open in Expo Go.  
   **Android:** open **Expo Go** and use **Scan QR code**.
4. The project loads in Expo Go. If the bundle fails to load, check the firewall and that Metro is reachable from the phone.

### iOS Simulator (macOS)

1. Install **Xcode** from the App Store and open it once to finish setup.
2. Run `npm start`, then press **`i`** in the terminal to open the iOS Simulator, or choose **Run on iOS simulator** from the Dev Tools UI.

### Android Emulator

1. Install **Android Studio**, create a virtual device (AVD), and start the emulator.
2. Run `npm start`, then press **`a`** in the terminal to install and launch the app on the emulator, or choose **Run on Android device/emulator** from the Dev Tools UI.

### Environment

Create a `.env` file in the project root (see `.env.example` if present) with your **hosted** Supabase project values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY` (anon / public key)

Restart the dev server after changing `.env`.

## Supabase (cloud)

Schema and RLS live in `supabase/migrations/`. This project is intended to use **Supabase Cloud** (not a local Docker stack).

1. Create a project at [supabase.com](https://supabase.com).
2. Install the CLI and link your project, then push migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npm run supabase:db:push
   ```

   `YOUR_PROJECT_REF` is in the dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`.

3. In the Supabase dashboard → **Project Settings → API**, copy the **Project URL** and **anon public** key into `.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`.

The app reads these in `lib/supabase.ts`.

### Other npm scripts

| Script | Purpose |
| ------ | ------- |
| `supabase:link` | Link CLI to a remote project (`supabase link`) |
| `supabase:db:push` | Push migrations to the linked remote database |
| `supabase:migration:new` | Create a new empty migration file under `supabase/migrations/` |

## Design system

Design tokens and reusable components live in `constants/theme.ts` and `components/`. All screens should use these—no duplicated styles.

### Global theme (`constants/theme.ts`)

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

**Spacing** (`xs` 4 → `xxxl` 40) · **Border radius** (`sm` 8 → `base` 12 → `full`) · **Typography** — `heading`, `headingSmall`, `body`, `bodyMedium`, `caption`, `label`, `button`, `small`

### Role themes (`constants/role-theme.ts`)

Users can be a **diner**, a **restaurant owner**, or both. The app uses two shell palettes so each mode feels distinct:

| Role | Theme object | Primary | Screen feel |
| ---- | ------------ | ------- | ----------- |
| **Diner** | `dinerRoleTheme` | Orange `#FF6A3D` (matches global brand) | Warm off-white background (`#FFFCFA`), orange tabs/CTAs/cards where the diner shell applies |
| **Restaurant** | `restaurantRoleTheme` | Green `#059669` | **White** background, mint-tinted accents (`primaryLight`, borders), green active tabs and primary buttons |

**Where it shows up:** `DinerTabScreenLayout` / `RestaurantTabScreenLayout`, `DinerBottomNav` / `RestaurantBottomNav`, `RoleAppHeader` (badges and segmented **Diner | Restaurant** switch), and role-colored `PrimaryButton` usage (`accentColor` / `accentShadowRgb`) on profile and similar screens.

Shared screens (e.g. login) use the global `Colors` from `theme.ts`. See `docs/account-roles.md` for dual-role behavior.

### UI Components

| Component         | Props                                                                                        | Description                            |
| ----------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| `PrimaryButton`   | `text`, `onPress`, … optional `accentColor`, `accentShadowRgb` for role-colored CTAs         | Primary filled button                  |
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
│   ├── theme.ts            # Global design tokens
│   └── role-theme.ts       # Diner vs restaurant shell colors
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
