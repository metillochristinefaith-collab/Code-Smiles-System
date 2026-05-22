# Staff Booking - Multiple Service Selection Debug Guide

## Issue: Can't Select Multiple Services

If you're unable to select multiple services in staff booking, follow this guide to debug the issue.

---

## Step-by-Step Flow (IMPORTANT)

### Step 1: Select a Category
1. You should see 6 category cards (General Dentistry, Cosmetic Arts, etc.)
2. **Click on ONE category** (e.g., "General Dentistry")
3. The card should show a checkmark
4. You should see a "Continue" button at the bottom

### Step 2: Click "Continue" Button
1. After selecting a category, **you MUST click the "Continue" button**
2. This takes you to Step 1.5 where you can select services
3. **Without clicking Continue, you won't see the services list**

### Step 3: Select Services (Step 1.5)
1. You should now see a list of services on the left
2. You should see a "Staff Selection" cart on the right
3. **Click on services to select them** (up to 3 services, max 120 minutes)
4. Selected services appear in the cart on the right
5. Progress bar shows total duration

### Step 4: Click "Next: Date & Time"
1. After selecting services, click the "Next: Date & Time" button
2. This proceeds to Step 2 (or Step 2.5 if multi-service)

---

## Common Issues & Solutions

### Issue 1: Can't See Services List
**Problem**: After selecting a category, you don't see the services list
**Solution**: 
- Make sure you clicked the "Continue" button
- The button should be at the bottom of the page
- It should say "Continue" with an arrow

### Issue 2: Services Are Disabled/Grayed Out
**Problem**: Service buttons are disabled and you can't click them
**Solution**:
- Check if you've already selected 3 services (max limit)
- Check if adding the service would exceed 120 minutes
- Try deselecting a service first, then selecting a different one

### Issue 3: Can't Select More Than 1 Service
**Problem**: After selecting 1 service, other services are disabled
**Solution**:
- Check the total duration
- If 1 service is 120 minutes, you can't add more
- Try selecting services with shorter durations
- Example: Oral Consultation (15 min) + Dental Cleaning (45 min) + Digital X-Rays (20 min) = 80 min ✓

### Issue 4: Selection Cart Is Empty
**Problem**: You click services but nothing appears in the cart
**Solution**:
- Make sure you're on Step 1.5 (not Step 1)
- Make sure you clicked the "Continue" button
- Try refreshing the page and starting over

---

## Testing Checklist

### Test 1: Single Service
- [ ] Select "General Dentistry"
- [ ] Click "Continue"
- [ ] Select "Dental Cleaning" (45 min)
- [ ] Should appear in cart
- [ ] Click "Next: Date & Time"
- [ ] Should go to Step 2 (simple date/time picker)

### Test 2: Two Services
- [ ] Select "General Dentistry"
- [ ] Click "Continue"
- [ ] Select "Dental Cleaning" (45 min)
- [ ] Select "Digital X-Rays" (20 min)
- [ ] Total: 65 min ✓
- [ ] Both should appear in cart
- [ ] Click "Next: Date & Time"
- [ ] Should go to Step 2.5 (individual scheduling)

### Test 3: Three Services
- [ ] Select "General Dentistry"
- [ ] Click "Continue"
- [ ] Select "Oral Consultation" (15 min)
- [ ] Select "Dental Cleaning" (45 min)
- [ ] Select "Digital X-Rays" (20 min)
- [ ] Total: 80 min ✓
- [ ] All three should appear in cart
- [ ] Click "Next: Date & Time"
- [ ] Should go to Step 2.5 (individual scheduling)

### Test 4: Exceed Limits
- [ ] Select "Cosmetic Arts"
- [ ] Click "Continue"
- [ ] Select "Smile Makeover" (120 min)
- [ ] Try to select another service
- [ ] Should be DISABLED (can't add more)
- [ ] Try "Teeth Whitening" (60 min) + "Dental Veneers" (90 min)
- [ ] Total: 150 min ✗ (exceeds 120)
- [ ] "Dental Veneers" should be DISABLED

---

## Expected Behavior

### Step 1: Category Selection
```
┌─────────────────────────────────────┐
│ Select a Treatment for the Patient  │
├─────────────────────────────────────┤
│ [General Dentistry] [Cosmetic Arts] │
│ [Orthodontics]      [Oral Surgery]  │
│ [Dental Implants]   [Pediatric Care]│
├─────────────────────────────────────┤
│ [Cancel]                 [Continue →]│
└─────────────────────────────────────┘
```

### Step 1.5: Service Selection
```
┌──────────────────────────────────────────┐
│ General Dentistry                        │
├──────────────────────────────────────────┤
│ Services          │  Staff Selection     │
│ ☐ Oral Consult   │  ✓ Dental Cleaning  │
│ ☑ Dental Clean   │  ✓ Digital X-Rays   │
│ ☑ Digital X-Rays │                      │
│ ☐ Tooth Fillings │  Progress: 65/120   │
│ ☐ Fluoride Treat │  [Reset Selection]  │
├──────────────────────────────────────────┤
│ [← Previous] [Cancel]  [Next: Date & Time →]│
└──────────────────────────────────────────┘
```

### Step 2.5: Multi-Service Scheduling
```
┌──────────────────────────────────────────┐
│ Schedule Dental Cleaning                 │
│ Service 1 of 2                           │
├──────────────────────────────────────────┤
│ [Progress: 1 of 2 services scheduled]   │
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

## Browser Console Check

If you're still having issues, open the browser console (F12) and check for errors:

1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Look for any red error messages
4. Take a screenshot and share the error

Common errors to look for:
- `Cannot read property 'length' of undefined`
- `toggleService is not a function`
- `currentSubServices is undefined`

---

## Quick Troubleshooting

### If nothing works:
1. **Refresh the page** (Ctrl+F5 or Cmd+Shift+R)
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Try a different browser** (Chrome, Firefox, Safari)
4. **Check if you're logged in** as staff

### If you see errors:
1. Open browser console (F12)
2. Copy the error message
3. Share it with the development team

---

## Expected Results

### Single Service (1 service)
- Step 1 → Step 1.5 → Step 2 (simple date/time) → Step 3 → Step 4
- Creates 1 appointment

### Multi-Service (2-3 services)
- Step 1 → Step 1.5 → Step 2.5 (loop) → Step 3 → Step 4
- Creates separate appointment for each service

---

## Contact Support

If you're still unable to select multiple services after following this guide:

1. Check the browser console for errors (F12)
2. Take a screenshot of the issue
3. Note which step you're stuck on
4. Share with development team

---

**Last Updated**: May 22, 2026
**Status**: Debugging Guide

