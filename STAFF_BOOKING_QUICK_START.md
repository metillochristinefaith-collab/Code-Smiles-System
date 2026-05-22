# Staff Booking - Quick Start Guide

## ⚠️ IMPORTANT: You MUST Follow These Steps in Order

---

## How to Book Multiple Services

### Step 1️⃣: Select a Category
1. You see 6 category cards
2. **Click ONE category** (e.g., "General Dentistry")
3. A checkmark appears on the selected category
4. **Look at the bottom of the page**

### Step 2️⃣: Click "Continue" Button ⭐ CRITICAL
1. At the bottom, you should see: `[Cancel]` and `[Continue →]`
2. **Click the "Continue" button**
3. **This is the most important step!**
4. If you don't see this button, scroll down

### Step 3️⃣: Select Services (Now on Step 1.5)
1. You should now see:
   - **Left side**: List of services (Dental Cleaning, X-Rays, etc.)
   - **Right side**: "Staff Selection" cart
2. **Click on services to select them**
3. Selected services appear in the cart on the right
4. You can select up to 3 services (max 120 minutes total)

### Step 4️⃣: Click "Next: Date & Time"
1. After selecting services, click the "Next: Date & Time" button
2. This takes you to Step 2 or Step 2.5

---

## Example: Book 2 Services

### What You'll See:

**Step 1** (Category Selection):
```
┌─────────────────────────────────────┐
│ Select a Treatment for the Patient  │
├─────────────────────────────────────┤
│ [General Dentistry] ✓               │
│ [Cosmetic Arts]                     │
│ [Orthodontics]                      │
│ [Oral Surgery]                      │
│ [Dental Implants]                   │
│ [Pediatric Care]                    │
├─────────────────────────────────────┤
│ [Cancel]                 [Continue →]│
└─────────────────────────────────────┘
```

**Step 1.5** (Service Selection):
```
┌──────────────────────────────────────────┐
│ General Dentistry                        │
│ Select services for this patient visit   │
├──────────────────────────────────────────┤
│ Services              │  Staff Selection │
│ ☐ Oral Consultation  │  ✓ Dental Clean  │
│ ☑ Dental Cleaning    │  ✓ Digital X-Ray │
│ ☑ Digital X-Rays     │                  │
│ ☐ Tooth Fillings     │  65 / 120 mins   │
│ ☐ Fluoride Treatment │  [Reset]         │
│ ☐ Dental Sealants    │                  │
│ ☐ Simple Extraction  │                  │
│ ☐ Emergency Care     │                  │
├──────────────────────────────────────────┤
│ [← Previous] [Cancel]  [Next: Date & Time →]│
└──────────────────────────────────────────┘
```

**Step 2.5** (Individual Scheduling):
```
┌──────────────────────────────────────────┐
│ Schedule Dental Cleaning                 │
│ Service 1 of 2                           │
├──────────────────────────────────────────┤
│ [████░░░░░░] 1 of 2 services scheduled  │
│                                          │
│ Calendar          │  Available Slots    │
│ [May 2026]        │  9:00 AM (4 left)  │
│ Su Mo Tu We Th Fr │  10:00 AM (3 left) │
│  1  2  3  4  5  6 │  11:00 AM (2 left) │
│  7  8  9 10 11 12 │  2:00 PM (5 left)  │
│ ...               │  3:00 PM (4 left)  │
├──────────────────────────────────────────┤
│ [← Previous] [Cancel]  [Next Service →]  │
└──────────────────────────────────────────┘
```

---

## Troubleshooting

### ❌ Problem: I don't see the "Continue" button
**Solution**: 
- Scroll down to the bottom of the page
- Make sure you selected a category (it should have a checkmark)

### ❌ Problem: I don't see the services list after clicking Continue
**Solution**:
- Refresh the page (Ctrl+F5)
- Make sure you clicked "Continue" (not just selected a category)
- Check if you're on Step 1.5 (look at the stepper at the top)

### ❌ Problem: Services are grayed out/disabled
**Solution**:
- You've already selected 3 services (max limit)
- OR adding the service would exceed 120 minutes
- Deselect a service first, then try again

### ❌ Problem: I selected services but they don't appear in the cart
**Solution**:
- Make sure you're on Step 1.5 (not Step 1)
- Try clicking the service again
- Refresh the page and try again

---

## Service Duration Reference

### General Dentistry
- Oral Consultation: 15 min
- Dental Cleaning: 45 min
- Digital X-Rays: 20 min
- Tooth Fillings: 60 min
- Fluoride Treatment: 15 min
- Dental Sealants: 30 min
- Simple Tooth Extraction: 45 min
- Emergency Dental Care: 60 min

### Cosmetic Arts
- Teeth Whitening: 60 min
- Dental Veneers: 90 min
- Dental Bonding: 60 min
- Smile Makeover: 120 min
- Tooth Contouring: 45 min
- Gum Contouring: 60 min

### Orthodontics
- Traditional Braces: 90 min
- Ceramic Braces: 90 min
- Self-Ligating Braces: 90 min
- Clear Aligners: 45 min
- Retainers: 30 min
- Orthodontic Consultation: 30 min

---

## Valid Combinations (Examples)

✅ **Valid** (Total ≤ 120 min):
- Dental Cleaning (45) + Digital X-Rays (20) + Oral Consultation (15) = 80 min
- Teeth Whitening (60) + Dental Bonding (60) = 120 min
- Dental Cleaning (45) + Tooth Fillings (60) = 105 min

❌ **Invalid** (Total > 120 min):
- Smile Makeover (120) + Teeth Whitening (60) = 180 min ✗
- Dental Veneers (90) + Dental Bonding (60) = 150 min ✗
- Multiple 90-min services = exceeds limit ✗

---

## Still Having Issues?

1. **Open browser console** (Press F12)
2. **Go to Console tab**
3. **Look for red error messages**
4. **Take a screenshot**
5. **Share with development team**

---

**Last Updated**: May 22, 2026
**Status**: Ready to Use

