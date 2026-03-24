# PickMyPlate

An Expo app for exploring restaurant menus and discovering dishes. Built with a centralized design system based on wireframes in `UserInterfaces/`.

## Get Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx start
   ```

## Design System

Design tokens and reusable components live in `constants/theme.ts` and `components/`. All screens should use these—no duplicated styles.

### Theme (`constants/theme.ts`)

**Colors**

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#FF6A3D` | Buttons, links, accents |
| `background` | `#FFFFFF` | Screen background |
| `text` | `#101828` | Headings, labels |
| `textSecondary` | `#667085` | Body, subtitles |
| `textPlaceholder` | `#A0AEC0` | Input placeholders |
| `error` | `#E53E3E` | Error text, validation |
| `border` | `#D0D5DD` | Input borders, dividers |

**Spacing** (`xs` 4 → `xxxl` 40)

**Border radius** (`sm` 8 → `base` 12 → `full`)

**Typography** — `heading`, `headingSmall`, `body`, `bodyMedium`, `caption`, `label`, `button`, `small`

### UI Components

| Component | Props | Description |
|-----------|-------|-------------|
| `PrimaryButton` | `text`, `onPress`, `style`, `disabled`, `loading` | Orange primary CTA |
| `SecondaryButton` | `text`, `onPress`, `style`, `disabled`, `loading`, `icon` | Outlined secondary action |
| `InputField` | `label`, `error`, `placeholder`, `style`, `inputStyle`, `containerStyle` + `TextInput` props | Labeled input with optional error |
| `ScreenContainer` | `children`, `scroll`, `padding`, `backgroundColor`, `centered` | Screen layout with safe area |
| `ErrorText` | `text` or `children`, `style` | Red error message |
| `Divider` | `text`, `style` | Horizontal divider, optional "OR" text |

**Usage**

```tsx
import {
  Divider,
  InputField,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function LoginScreen() {
  return (
    <ScreenContainer scroll padding="xl">
      <Text style={[Typography.heading, { color: Colors.text }]}>PickMyPlate</Text>
      <InputField label="Email" placeholder="your@email.com" />
      <PrimaryButton text="Log In" onPress={() => {}} />
      <Divider text="OR" />
    </ScreenContainer>
  );
}
```

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
├── hooks/
│   ├── use-color-scheme.ts
│   ├── use-color-scheme.web.ts
│   └── use-theme-color.ts
├── UserInterfaces/         # Wireframes & assets
└── app-example/            # Starter reference (excluded from build)
```

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
