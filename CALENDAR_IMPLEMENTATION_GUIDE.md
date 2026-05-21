# Calendar Implementation Guide

## Overview
Both Staff and Dentist calendars now feature a unified, card-based design across all three views: Day, Week, and Month.

## Architecture

### Data Flow
```
API (getCalendarAppointments / getDentistAppointments)
  ↓
allAppointments (current week/day)
  ↓
boardEvents (computed property - for day view)
getDayEvents(day) (method - for week view)
  ↓
HTML Templates (render cards)
```

### Key Methods

#### `getDayEvents(day: any): any[]`
- **Purpose**: Filter appointments for a specific day in week view
- **Input**: Day object from `calendarDays` array
- **Output**: Array of formatted event objects
- **Logic**:
  1. Get day index from calendarDays array
  2. Calculate actual date for that day
  3. Filter allAppointments by date
  4. Map to event objects with formatted time

#### `boardEvents` (getter)
- **Purpose**: Get all appointments for day view
- **Used by**: Day view template
- **Returns**: Array of events with dayIndex and startSlot

### View Layouts

#### Week View
- **Grid**: 7 columns (one per day)
- **Responsive**: `repeat(auto-fit, minmax(200px, 1fr))`
- **Components**:
  - `.week-day-col` - Day column container
  - `.week-day-header` - Day label and date
  - `.week-event-card` - Individual event card
  - `.week-day-empty` - Empty state message

#### Day View
- **Layout**: Vertical flex column
- **Components**:
  - `.day-event-card` - Individual event card
  - `.day-ev-header` - Time and status badge
  - `.day-empty-state` - Empty state message

#### Month View
- **Grid**: 7 columns (calendar grid)
- **Components**:
  - `.month-day` - Day cell
  - `.month-event` - Event summary
  - `.month-event-more` - "+X more" indicator

## Status Colors

| Status | Background | Text Color | Hex |
|--------|-----------|-----------|-----|
| Confirmed | #edfaf4 | #27a96c | Green |
| In Progress | #eaf2ff | #4d8fe1 | Blue |
| Pending | #fdf3e7 | #e09a2a | Orange |
| Cancelled | #fdeef0 | #e05c6e | Red |
| No-Show | #f3f4f6 | #6b7280 | Gray |

## CSS Classes

### Layout Classes
- `.week-grid-simple` - Week view grid container
- `.day-grid-simple` - Day view flex container
- `.month-grid` - Month view grid container

### Card Classes
- `.week-event-card` - Week view event card
- `.day-event-card` - Day view event card
- `.month-event` - Month view event

### Status Classes
- `.status-confirmed` - Green styling
- `.status-in-progress` - Blue styling
- `.status-pending` - Orange styling
- `.status-cancelled` - Red styling
- `.status-no-show` - Gray styling

## Responsive Breakpoints

```css
@media (max-width: 1280px) {
  .page-layout { grid-template-columns: 260px 1fr; }
}

@media (max-width: 1024px) {
  .calendar-page { margin-left: 0; }
  .page-layout { grid-template-columns: 1fr; }
}
```

## Files Structure

```
dental-frontend/src/app/
├── staff-calendar/
│   ├── staff-calendar.ts       (getDayEvents method)
│   ├── staff-calendar.html     (week/day/month views)
│   └── staff-calendar.css      (all styling)
└── dentist-calendar/
    ├── dentist-calendar.ts     (getDayEvents method)
    ├── dentist-calendar.html   (week/day/month views)
    └── dentist-calendar.css    (all styling)
```

## Testing Checklist

- [ ] Week view displays 7 day columns
- [ ] Week view shows correct appointments for each day
- [ ] Day view shows all appointments in vertical list
- [ ] Month view displays calendar grid
- [ ] Status colors display correctly in all views
- [ ] Hover effects work on event cards
- [ ] Navigation buttons work (prev/next)
- [ ] View toggle buttons work (day/week/month)
- [ ] Empty states display when no appointments
- [ ] Responsive layout works on mobile

## Common Issues & Solutions

### Issue: getDayEvents returns empty array
**Solution**: Verify `allAppointments` is populated and date format matches

### Issue: Status colors not showing
**Solution**: Check that `getEventClass()` returns correct class name

### Issue: Week view not responsive
**Solution**: Verify CSS grid uses `repeat(auto-fit, minmax(200px, 1fr))`

### Issue: Day view shows wrong appointments
**Solution**: Check that `boardEvents` getter filters correctly by date

## Performance Notes

- `getDayEvents()` is called for each day in week view (7 times)
- Consider memoization if performance becomes an issue
- `allAppointments` is loaded once per week/day change
- Month view loads `allUpcoming` separately

## Future Enhancements

1. Add appointment click handlers
2. Add drag-and-drop rescheduling
3. Add appointment creation from calendar
4. Add time slot visualization
5. Add color coding by service type
6. Add dentist availability indicators
