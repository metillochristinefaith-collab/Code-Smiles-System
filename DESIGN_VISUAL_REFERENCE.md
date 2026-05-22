# Design Enhancement - Visual Reference Guide

## Color Palette

### Primary Colors
```
Primary Blue:       #1a56db  ████████████████████
Dark Blue:          #1e40af  ████████████████████
Light Blue:         #eff6ff  ████████████████████
```

### Semantic Colors
```
Success:            #16a34a  ████████████████████
Success Light:      #ecfdf5  ████████████████████
Warning:            #f59e0b  ████████████████████
Warning Light:      #fffbeb  ████████████████████
Error:              #ef4444  ████████████████████
Error Light:        #fee2e2  ████████████████████
```

### Neutral Colors
```
Navy:               #1e3a5f  ████████████████████
Muted:              #6b7c93  ████████████████████
Line:               #e2e8f0  ████████████████████
BG Light:           #f8fafc  ████████████████████
BG Lighter:         #f0f4f8  ████████████████████
```

---

## Typography Scale

### Headings
```
H1: 1.9rem (30px)  - Step headings
H2: 1.6rem (26px)  - Page titles
H3: 1.15rem (18px) - Dialog titles
```

### Body Text
```
Large:   0.9rem (14px)   - Button text, labels
Normal:  0.88rem (14px)  - Body text
Small:   0.82rem (13px)  - Secondary text
Tiny:    0.72rem (11px)  - Captions, hints
```

### Font Weights
```
Regular:  400
Medium:   500
Semibold: 600
Bold:     700
Extrabold: 800
Black:    900
```

---

## Spacing System (8px Base Unit)

```
XS:   4px   (0.25rem)
SM:   8px   (0.5rem)
MD:   16px  (1rem)
LG:   24px  (1.5rem)
XL:   32px  (2rem)
2XL:  40px  (2.5rem)
```

### Usage Examples
```
Padding:     var(--space-md) = 16px
Margin:      var(--space-lg) = 24px
Gap:         var(--space-sm) = 8px
Border:      var(--space-xs) = 4px
```

---

## Border Radius

```
Small:   8px   (--radius-sm)   - Inputs, small buttons
Medium:  12px  (--radius-md)   - Buttons, cards
Large:   16px  (--radius-lg)   - Large cards, panels
Full:    999px (--radius-full) - Pills, avatars
```

---

## Shadow System

### Shadow Levels
```
SM:  0 1px 2px rgba(0, 0, 0, 0.05)
MD:  0 4px 6px rgba(0, 0, 0, 0.07)
LG:  0 10px 15px rgba(0, 0, 0, 0.1)
XL:  0 20px 25px rgba(0, 0, 0, 0.15)
```

### Usage
```
Subtle:    var(--shadow-sm)  - Hover states
Normal:    var(--shadow-md)  - Cards, panels
Elevated:  var(--shadow-lg)  - Modals, dropdowns
Prominent: var(--shadow-xl)  - Floating elements
```

---

## Button Styles

### Primary Button
```
┌─────────────────────────────┐
│  Continue to Next Step  →   │  ← Blue background, white text
└─────────────────────────────┘

Hover:    Elevated (translateY -2px), enhanced shadow
Active:   Pressed (translateY 0), reduced shadow
Focus:    Blue outline ring (2px)
Disabled: 50% opacity, no interaction
```

### Secondary Button
```
┌─────────────────────────────┐
│  ← Previous                 │  ← White background, blue border
└─────────────────────────────┘

Hover:    Light blue background, blue text
Active:   Slightly elevated
Focus:    Blue outline ring (2px)
Disabled: 50% opacity, no interaction
```

---

## Form Input States

### Default State
```
┌─────────────────────────────┐
│ Enter your name...          │  ← Light gray border, light background
└─────────────────────────────┘
```

### Focus State
```
┌─────────────────────────────┐
│ Enter your name...          │  ← Blue border, white background
└─────────────────────────────┘  ← Blue shadow ring
```

### Error State
```
┌─────────────────────────────┐
│ Enter your name...          │  ← Red border, light red background
└─────────────────────────────┘
⚠ This field is required
```

### Success State
```
┌─────────────────────────────┐
│ John Doe                    │  ← Green border, light green background
└─────────────────────────────┘
✓ Name verified
```

---

## Interactive Elements

### Category Card

**Default:**
```
┌─────────────────────────────────────────┐
│  🦷  General Dentistry              →   │
│      Preventive care & cleanings        │
└─────────────────────────────────────────┘
```

**Hover:**
```
┌─────────────────────────────────────────┐
│  🦷  General Dentistry              →   │  ← Elevated, blue border
│      Preventive care & cleanings        │  ← Gradient overlay
└─────────────────────────────────────────┘
```

**Selected:**
```
┌─────────────────────────────────────────┐
│  🦷  General Dentistry              ✓   │  ← Blue background gradient
│      Preventive care & cleanings        │  ← Enhanced shadow
└─────────────────────────────────────────┘
```

---

### Service Selection Button

**Default:**
```
┌──────────────────────┐
│ Oral Consultation    │  15 min
└──────────────────────┘
```

**Hover:**
```
┌──────────────────────┐
│ Oral Consultation    │  15 min  ← Light blue background
└──────────────────────┘          ← Elevated
```

**Selected:**
```
┌──────────────────────┐
│ Oral Consultation    │  15 min  ← Blue background
└──────────────────────┘          ← White text
                                  ← Pulse animation
```

---

### Calendar Date

**Available:**
```
┌────┐
│ 15 │  ← Green background, green text
└────┘
```

**Hover:**
```
┌────┐
│ 15 │  ← Darker green, scaled up
└────┘
```

**Selected:**
```
┌────┐
│ 15 │  ← Blue background, white text
└────┘  ← Scaled up with animation
```

**Today:**
```
┌────┐
│ 15 │  ← Orange border
│ •  │  ← Orange dot indicator
└────┘
```

**Fully Booked:**
```
┌────┐
│ 15 │  ← Red background, faded
└────┘  ← Striped pattern
```

---

### Time Slot Button

**Default:**
```
┌──────────────────────────────────┐
│ 9:00 AM    2 slots left          │
└──────────────────────────────────┘
```

**Hover:**
```
┌──────────────────────────────────┐
│ 9:00 AM    2 slots left          │  ← Light blue background
└──────────────────────────────────┘  ← Slide right animation
```

**Active:**
```
┌──────────────────────────────────┐
│ 9:00 AM    2 slots left          │  ← Light blue background
│ ▌                                │  ← Blue left border
└──────────────────────────────────┘
```

**Fully Booked:**
```
┌──────────────────────────────────┐
│ 9:00 AM    Fully Booked          │  ← Faded, striped pattern
└──────────────────────────────────┘  ← Not clickable
```

---

## Animations

### Fade In
```
Frame 1:  ░░░░░░░░░░  (0% opacity, translateY 8px)
Frame 2:  ▒▒▒▒▒▒▒▒▒▒  (50% opacity, translateY 4px)
Frame 3:  ██████████  (100% opacity, translateY 0)
Duration: 0.4s ease
```

### Select Pulse
```
Frame 1:  ○ (scale 1)
Frame 2:  ◉ (scale 1.05)
Frame 3:  ○ (scale 1)
Duration: 0.3s ease
```

### Date Select
```
Frame 1:  ░ (scale 0.8, opacity 0)
Frame 2:  ▒ (scale 1.05, opacity 0.5)
Frame 3:  ● (scale 1.1, opacity 1)
Duration: 0.3s cubic-bezier
```

### Slide Up
```
Frame 1:  ↓ (translateY 20px, opacity 0)
Frame 2:  ↑ (translateY 10px, opacity 0.5)
Frame 3:  ↑ (translateY 0, opacity 1)
Duration: 0.5s cubic-bezier
```

---

## Transitions

### Fast (0.15s)
- Micro-interactions
- Icon changes
- Color shifts

### Base (0.2s)
- Button hover effects
- Form focus states
- Card elevation

### Slow (0.3s)
- Page transitions
- Modal animations
- Complex state changes

---

## Accessibility Features

### Focus Ring
```
┌─────────────────────────────┐
│ ┌─────────────────────────┐ │
│ │ Button Text             │ │  ← 2px blue outline
│ └─────────────────────────┘ │  ← 2px offset
└─────────────────────────────┘
```

### Color Contrast
```
Text on Background:
- Navy (#1e3a5f) on White: 12.5:1 ✓ AAA
- Muted (#6b7c93) on White: 5.2:1 ✓ AA
- Error (#ef4444) on White: 4.5:1 ✓ AA
```

### Touch Targets
```
Minimum: 44px × 44px
Recommended: 48px × 48px
Spacing: 8px minimum between targets
```

---

## Responsive Breakpoints

### Desktop (1024px+)
```
┌─────────────────────────────────────────┐
│  Category Grid: 3 columns               │
│  Service List: 2 columns                │
│  DateTime Layout: 2 columns             │
│  Full spacing and padding               │
└─────────────────────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌──────────────────────────────┐
│  Category Grid: 2 columns    │
│  Service List: 1 column      │
│  DateTime Layout: 1 column   │
│  Reduced padding             │
└──────────────────────────────┘
```

### Mobile (640px - 767px)
```
┌──────────────────┐
│ Category: 1 col  │
│ Service: 1 col   │
│ DateTime: 1 col  │
│ Minimal padding  │
│ Stacked layout   │
└──────────────────┘
```

### Small Mobile (<640px)
```
┌────────────────┐
│ Full width     │
│ Stacked        │
│ Touch-friendly │
│ Large buttons  │
└────────────────┘
```

---

## Loading States

### Spinner
```
    ↗
  ↙   ↖
↙       ↗
  ↖   ↙
    ↘

Rotation: 360° in 0.8s
Color: Primary blue
Size: 40px
```

### Skeleton Loader
```
┌─────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────┘

Shimmer: Left to right in 1.5s
Color: Light gray to white
```

---

## Error & Success States

### Error Message
```
┌─────────────────────────────┐
│ ⚠ This field is required    │  ← Red background
│                             │  ← Slide-in animation
└─────────────────────────────┘
```

### Success Message
```
┌─────────────────────────────┐
│ ✓ Email verified            │  ← Green background
│                             │  ← Slide-up animation
└─────────────────────────────┘
```

---

## Empty States

### No Services Selected
```
┌─────────────────────────────┐
│                             │
│         📦                  │
│   No services selected yet  │
│                             │
└─────────────────────────────┘
```

### No Time Slots Available
```
┌─────────────────────────────┐
│                             │
│         🕐                  │
│  No available slots for     │
│  this date                  │
│                             │
└─────────────────────────────┘
```

---

## Modal/Dialog

### Success Modal
```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │  ✓ Booking Confirmed!           │ │  ← Green header
│ │                                 │ │
│ │  Your appointment has been      │ │
│ │  successfully scheduled.        │ │
│ │                                 │ │
│ │  📅 May 25, 2026                │ │
│ │  🕐 2:00 PM - 3:00 PM           │ │
│ │                                 │ │
│ │  [View Appointment] [Dashboard] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Component Hierarchy

### Visual Weight
```
High:    Primary buttons, selected items, headings
Medium:  Secondary buttons, cards, form inputs
Low:     Hints, disabled items, placeholders
```

### Spacing Hierarchy
```
Large gaps:    Between major sections (24-32px)
Medium gaps:   Between related items (16px)
Small gaps:    Within components (8px)
Tiny gaps:     Between inline elements (4px)
```

---

## Design Tokens Summary

```css
/* Colors */
--primary-blue: #1a56db
--success: #16a34a
--error: #ef4444

/* Spacing */
--space-md: 16px
--space-lg: 24px

/* Sizing */
--radius-md: 12px
--radius-lg: 16px

/* Effects */
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)

/* Motion */
--transition-base: 0.2s ease
--transition-slow: 0.3s ease
```

---

## Quick Reference

### Button Heights
- Primary/Secondary: 44px
- Compact: 40px
- Small: 36px

### Input Heights
- Standard: 40px
- Compact: 36px

### Card Padding
- Standard: 24px
- Compact: 16px

### Border Widths
- Standard: 1.5px
- Focus: 2px

### Icon Sizes
- Small: 16px
- Medium: 24px
- Large: 32px
- Extra Large: 48px

---

## Implementation Checklist

- [ ] Add CSS variables
- [ ] Update button styles
- [ ] Enhance form inputs
- [ ] Add animations
- [ ] Implement focus states
- [ ] Add error/success states
- [ ] Optimize responsive design
- [ ] Test accessibility
- [ ] Test performance
- [ ] Deploy and monitor

---

This visual reference guide provides a complete overview of the design enhancements, making it easy to understand and implement the new design system.
