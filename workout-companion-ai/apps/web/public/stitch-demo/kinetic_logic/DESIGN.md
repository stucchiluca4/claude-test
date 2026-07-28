---
name: Kinetic Logic
colors:
  surface: '#0f141a'
  surface-dim: '#0f141a'
  surface-bright: '#353941'
  surface-container-lowest: '#0a0e15'
  surface-container-low: '#181c23'
  surface-container: '#1c2027'
  surface-container-high: '#262a32'
  surface-container-highest: '#31353d'
  on-surface: '#dfe2ec'
  on-surface-variant: '#c3c5d8'
  inverse-surface: '#dfe2ec'
  inverse-on-surface: '#2d3038'
  outline: '#8d90a1'
  outline-variant: '#434655'
  surface-tint: '#b6c4ff'
  primary: '#b6c4ff'
  on-primary: '#00277e'
  primary-container: '#1e5af0'
  on-primary-container: '#e4e7ff'
  inverse-primary: '#014fe6'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#007387'
  on-tertiary-container: '#c1f1ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164f'
  on-primary-fixed-variant: '#003ab1'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#0f141a'
  on-background: '#dfe2ec'
  surface-variant: '#31353d'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1440px
---

## Brand & Style
The design system is engineered for high-performance fitness professionals, blending the precision of data analytics with the energy of athletic training. The aesthetic is **Corporate Modern** with a lean, technical edge—prioritizing clarity, speed of recognition, and functional density.

The target audience consists of elite personal trainers and gym owners who require a reliable, professional tool to manage complex athlete data. The UI evokes a sense of "command and control," using high-contrast typography and a rigorous modular grid to organize diverse data streams into actionable insights.

## Colors
The palette is anchored by a deep obsidian background (`#0B0E14`) to reduce eye strain during prolonged coaching sessions. The primary blue (`#1E5AF0`) serves as the core action color, representing trust and technological precision.

- **Surface Layers:** Cards and containers use `#151920` to create subtle depth against the true-dark background.
- **Semantic Accents:** Success, Warning, and Alert colors are high-chroma to ensure critical athlete updates are never missed.
- **Secondary Accents:** Purple and Cyan are reserved for data visualization categories, such as distinguishing between different muscle groups or workout types in complex charts.

## Typography
This design system utilizes **Inter** exclusively to maintain a systematic, utilitarian aesthetic. The type scale is optimized for data density.

- **Data Presentation:** For numeric values in tables and dashboards, use the `data-mono` role which enables tabular figures to ensure columns of numbers align perfectly.
- **Hierarchy:** Use `label-md` in uppercase for section headers within sidebars and small card titles to maintain a "dashboard" feel without occupying excessive vertical space.
- **Readability:** Body text should maintain a minimum weight of 400 to ensure legibility against the dark background.

## Layout & Spacing
The design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The rhythm is based on a 4px base unit, ensuring all components align to a consistent mathematical scale.

- **Modular Approach:** Content is housed in modular cards. On desktop, complex analytics views should utilize a "bento-box" style layout where cards vary in span (e.g., a 2-column wide "Heart Rate" chart next to a 1-column "Quick Stats" list).
- **Density:** Padding within cards is kept tight (16px to 20px) to maximize the information visible on a single screen without scrolling.
- **Breakpoints:**
  - Mobile: < 600px (Margins: 16px)
  - Tablet: 600px - 1024px (Margins: 24px)
  - Desktop: > 1024px (Margins: 32px)

## Elevation & Depth
Depth is achieved through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows, preserving a modern, flat-tech aesthetic.

- **Base Layer:** `#0B0E14` (Global background).
- **Surface Layer:** `#151920` (Cards and navigation rails).
- **Stroke:** Elements are defined by a 1px solid border of `rgba(255, 255, 255, 0.08)`. This creates a crisp "technical" boundary that feels sharper than a shadow.
- **Active State:** When an element is lifted (e.g., a dragged workout block), use a subtle primary-tinted glow (`0px 4px 20px rgba(30, 90, 240, 0.15)`) to indicate focus.

## Shapes
The shape language balances approachability with professional structure. A standard **12px radius** (Level 2) is applied to all primary containers and cards. 

- **Small Components:** Buttons and input fields use a slightly tighter 8px radius to feel more precise.
- **Interactive Indicators:** Selection indicators in navigation or segmented controls use a 6px radius to sit comfortably inside larger parent containers.

## Components
Consistent styling across the application ensures a cohesive user experience.

- **Buttons:** Primary buttons are solid `#1E5AF0` with white text. Secondary buttons use the card background with the 1px subtle border.
- **Cards:** Defined by the `#151920` background and 12px rounded corners. Header areas within cards should have a thin bottom border to separate titles from data.
- **Input Fields:** Darker than the card background (`#0B0E14`) to create an "etched" look. Use a 2px primary blue border on focus.
- **Status Chips:** Small, low-profile badges with a subtle background tint and high-contrast text (e.g., Success: Dark Green background with Bright Green text).
- **Data Tables:** Row-based with alternating subtle highlights or 1px dividers. Headers should be `label-md` for maximum clarity.
- **Progress Rings:** Used for athlete goal tracking, utilizing the Secondary (Purple) or Tertiary (Cyan) colors to differentiate between multiple concurrent goals.