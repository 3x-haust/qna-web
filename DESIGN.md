# QnA Design System

## 1. Atmosphere & Identity

QnA is a focused live-classroom surface: dark, calm, and authoritative without feeling administrative. Its signature is the “live response board” — a teacher’s question at the center, with student participation becoming visible as an immediate green signal.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---:|---|
| Surface/base | `gray600` | `#2e2e2e` | Page background |
| Surface/card | `gray500` | `#3b3b3b` | Cards and previews |
| Surface/raised | `gray400` | `#4a4a4a` | Raised controls |
| Border/control | `gray300` | `#575757` | Input and panel outlines |
| Text/primary | `white` | `#ffffff` | Headlines and primary labels |
| Text/secondary | `gray70` | `#b0b0b0` | Supporting copy |
| Text/tertiary | `gray90` | `#858585` | Disabled metadata only |
| Action/background | `primary` | `#008156` | Filled buttons |
| Action/foreground | `accent` | `#26d29a` | Links, live states, focus |
| Status/error | `error` | `#ff9b9b` | Inline errors on dark surfaces |

Accent is semantic: it marks an action, connection, or live classroom state, not decoration.

## 3. Typography

| Level | Size | Weight | Line Height | Usage |
|---|---:|---:|---:|---|
| Display | `clamp(44px, 5vw, 72px)` | 800 | 1.06 | Landing statement |
| H1 | 32px | 700 | 1.25 | Page headings |
| H2 | 28px | 700 | 1.3 | Question and panel headings |
| Body/lg | 20px | 500 | 1.65 | Landing lead |
| Body | 16px | 500 | 1.6 | Main UI copy |
| Body/sm | 14px | 500 | 1.5 | Metadata |
| Caption | 13px | 600 | 1.4 | Status and counts |

Primary font: self-hosted `Noto Sans KR` through `next/font`.

## 4. Spacing & Layout

Base unit: 4px. Preferred steps are 8, 12, 16, 20, 24, 32, 40, 48, and 64px.

- App maximum width: 1440px.
- Landing content width: 1140px.
- Authenticated content width: 1172px.
- Main question column: 808px.
- Breakpoints: compact 640px, stacked landing 820px, medium 1100px.
- The landing uses document scroll. Application question screens keep the header fixed in normal flow and let the document own scrolling.

## 5. Components

### Brand Header
- **Structure**: header → home link + action.
- **Variants**: guest login; authenticated create-question.
- **States**: default, hover, active, focus-visible.
- **Accessibility**: labelled home link and button; logo preserves its 3:2 exported aspect ratio.
- **Layout**: cluster with space-between.

### Primary Button
- **Structure**: icon + label.
- **States**: default, hover, active, focus-visible, disabled/loading.
- **Accessibility**: 44px minimum target where space permits and visible focus.
- **Motion**: 150ms transform/color feedback.

### Live Response Board
- **Structure**: live status, teacher question, response progress, sample response.
- **States**: waiting, collecting, complete.
- **Accessibility**: status does not rely on color alone; response progress has text.
- **Layout**: stack inside an elevated article.

### Session Invite
- **Structure**: six-character code, copy-link action, participant count.
- **States**: creating, waiting, connected, expired, unavailable.
- **Accessibility**: code is uppercase, grouped visually, and available as both text and URL.
- **Motion**: status changes use color and text without decorative animation.
- **Layout**: compact stack; raw WebRTC signaling payloads are never user-facing.

### Session List Item
- **Structure**: title, time, overflow action.
- **States**: default, hover, focus-visible, empty list.
- **Layout**: content row with constrained metadata.

## 6. Motion & Interaction

- Micro feedback: 150ms ease-out.
- Standard transitions: 240ms ease-in-out.
- Only `transform` and `opacity` animate.
- Every interactive control has hover, active, and focus-visible feedback.
- Non-essential motion is disabled by `prefers-reduced-motion`.

## 7. Depth & Surface

Mixed strategy: tonal shifts establish hierarchy, thin borders define controls, and only the landing response board receives a tinted ambient shadow. Lighting originates from the upper-right green live-state glow.

## 8. Accessibility Constraints & Accepted Debt

- WCAG 2.2 AA target: 4.5:1 body text, 3:1 large text and UI graphics.
- Korean copy uses `word-break: keep-all` and balanced wrapping where supported.
- Interactive controls are keyboard reachable with visible focus.
- No accepted accessibility debt.
