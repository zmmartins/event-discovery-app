# Event Discovery App

Functional mobile prototype for the course **Interactive Multimedia Applications 2025/2026**.

This project implements a social local event discovery app focused on spontaneous exploration of nearby experiences. The app was designed first as a low-fidelity prototype, then as a high-fidelity Figma prototype, and is now being implemented as a functional mobile prototype.

The current implementation uses **Expo + React Native + Expo Router**.

---

## Project Goal

The goal is to build a functional mobile prototype that demonstrates the core interaction flows of the app:

- Discover local events.
- Explore events through a map.
- Explore events through a list.
- Open event details.
- Mark participation in an event.
- Use device feedback such as visual feedback and haptic feedback.
- Use mobile input mechanisms such as touch, accelerometer/shake, and location.
- Collect interaction logs for usability testing.

The final academic delivery must include:

- Functional application code.
- Screenshots of the prototype.
- Justification of changes from previous prototype versions.
- Usability tests with 5–6 users.
- Photos of usability tests, with permission.
- Descriptive statistics based on quantitative interaction logs.
- Link to the online source code repository.

---

## Concept

The app is a **social local event discovery platform**.

Unlike traditional event platforms that tend to highlight mainstream or highly promoted events, this app focuses on helping users discover both mainstream and niche local experiences.

The app targets:

- Local users looking for something spontaneous to do.
- Travellers looking for authentic local experiences.
- Small organizers, independent artists, local businesses, and community-driven events.

The social component is centered on **events**, not personal vanity. A user profile acts as a kind of **cultural passport**, showing events the user plans to attend or has attended in the past.

---

## Current Technical Stack

- **Expo**
- **React Native**
- **Expo Router**
- **JavaScript**
- **AsyncStorage**
- **Expo Haptics**
- **Expo Sensors**
- **Expo Location**
- **React Native Maps**

Expo Router is used as the routing system. It uses file-based routing, where files inside the `app/` directory define navigation routes.

---

## Development Platform

The project is developed in:

- VS Code
- Expo Go
- GitHub

Recommended VS Code extensions:

- ESLint
- Prettier
- React Native Tools
- GitLens

---

## How to Run the Project

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

If the QR code does not work properly on the local network, use:

```bash
npx expo start --tunnel
```

To clear the Expo cache:

```bash
npx expo start -c
```

Open the app using Expo Go on a physical device.

## Important Routing Note

This project uses **Expo Router**.

The `app/` directory is used only as the routing layer. The actual screen implementations live in `src/screens`.

Current route files:

app/
\_layout.tsx
index.tsx
list.tsx
map.tsx
profile.tsx
event/
[id].tsx

The route files should remain thin indexers that import and export the corresponding screen from `src/screens`.

Example:

```TypeScript
import ListScreen from "../src/screens/ListScreen";

export default ListScreen;
```

Dynamic event details use:

```
app/event/[id].tsx
```

This route should point to:

```
src/screens/EventDetailScreen.js
```

The event detail screens hould read the event id using:

```JavaScript
import { useLocalSearchParams } from "expo-router";
```

Example:

```JavaScript
const { id } = useLocalSearchParams();
```

Navigation to an event detail page should use:

```JavaScript
router.push({
    pathname: "/event/[id]",
    params: { id: event.id },
});
```

Do not use React Navigation's `navigation.navigate(...)` inside screens unless the project is intentionally migrated away from Expo Router.

---

## Current Project Structure

```
event-discovery-app/
  app.config.js
  app.json
  package.json
  tsconfig.json
  expo-env.d.ts
  list_project_structure.py
  README.md
  app/
    _layout.tsx
    (tabs)/
      _layout.tsx
      community.tsx
      index.tsx
      list.tsx
      messages.tsx
      notifications.tsx
      profile.tsx
      search.tsx
      shake-discover.tsx
      map/
        _layout.tsx
        index.tsx
        list.tsx
        notifications.tsx
        shake-discover.tsx
    event/
      [id].tsx
  src/
    assets/
      avatars/
      events/
    components/
      AppShell.js
      DiscoverModePill.js
      EventCard.js
      EventPin.js
      ExperiencePin.js
      PlaceholderScreen.js
      ProfileExperienceCard.js
      ScreenStatusBar.js
      TopNav.js
    context/
      DiscoveryModeContext.js
    data/
      mockEvents.js
      mockUsers.js
    hooks/
      useInteractionLogger.js
      useShakeToDiscover.js
    screens/
      CommunityScreen.js
      EventDetailScreen.js
      ListScreen.js
      MapScreen.js
      MessagesScreen.js
      NotificationsScreen.js
      ProfileScreen.js
      SearchScreen.js
      ShakeDiscoverScreen.js
    services/
      eventService.js
      interactionLogService.js
      locationService.js
      profileService.js
      userService.js
    theme/
      colors.js
      mapStyle.js
      spacing.js
    utils/
      imageAssets.js
```

---

## Architecture Principles

### 1. Keep `app/`as routing only

Files inside `app/`should stay small and should not contain complex UI or business logic.

Good:

```TypeScript
import MapScreen from "../src/screens/MapScreen";

export default MapScreen;
```

Avoid putting full screen implementations directly inside `app/`.

---

### 2. Keep screen logic in `src/screens`

Main screens should live in:

```
src/screens/
```

Current planned screens:

- `MapScreen.js`
- `ListScreenjs`
- `EventDetailScreen.js`
- `ProfileScreen.js`

Possible future screens:

- `LogsScreen.js`
- `DiscoverScreen.js`
- `CreateEventScreen.js`
- `SettingsScreen.js`

---

### 3. Keep reusable UI in `src/components`

Reusable visual elements should live in:

```
src/components/
```

Examples:

- `EventCard.js`
- `EventPin.js`
- `BottomNav.js`
- `TopNav.js`
- `CategoryFilter.js`
- `FeedbackToast.js`
- `ParticipantAvatarGroup.js`

Components should be reusable and should avoid directly fetching data from services.

---

### 4. Keep data access in `src/services`

Screens should not directly manipulate mock data.

Use service functions such as:

```JavaScript
getEvents()
getEventById(id)
getEventsByCategory(category)
joinEvent(id)
getDiscoverEvents()
logInteraction(action, metadata)
getInteractionLogs()
clearInteractionLogs()
```

This allows the mock backend to be replaced later by a real backend, probably Supabase, without rewriting the entire app.

---

### 5. Use mock data for the academic prototype

For now, data is stored locally in:

```
src/data/mockEvents.js
src/data/mockUsers.js
```

The app should behave as if it had a backend, but the data can remain local for the academic prototype.

---

## Current Data Layer

The current mock backend lives in:

```
src/services/eventService.js
```

It currently supports:

```JavaScript
getEvents()
getEventById(id)
getEventsByCategory(category)
joinEvent(id)
getDiscoverEvents()
```

The service should be the only place that directly imports `mockEvents`.

Avoid the inside screens:

```JavaScript
import { mockEvents } from ".../data/mockEvents";
```

Prefer this:

```JavaScript
import { getEvents } from "../services/eventService";
```

---

## Interaction Logs

Interaction logs are required for usability testing.

The logging service lives in:

```
src/services/interactionLogService.js
```

It currently supports:

```JavaScript
logInteraction(action, metadata)
getInteractionLogs()
clearInteractionLogs()
```

Logs are stored in AsyncStorage.

Recommended logged actions:

```
app_opened
map_view_opened
list_view_opened
profile_opened
event_card_pressed
event_pin_selected
event_detail_opened
participation_clicked
participation_confirmed
shake_detected
discover_mode_activated
filter_changed
location_permission_requested
location_permission_granted
location_permission_denied
task_started
task_finished
```

Recommended metadata:

```
{
  screen: "ListScreen",
  eventId: "event-001",
  participantId: "P1",
  taskId: "find-and-join-event"
}
```

A future debug/logs screen should allow:

- viewing logs;
- copying logs as JSON;
- clearing logs between participants;
- optionally showing simple stats.

This is important because the academic report needs descriptive statistics based on quantitative interaction data.

---

## Main User Flows

### Flow 1 - List to Event Detail

```
Open app
→ Open event list
→ Select event
→ View event details
→ Tap Participate
→ Receive haptic/visual feedback
→ Event appears in profile
→ Interaction is logged
```

### Flow 2 - Map to Event Detail

```
Open map
→ View event pins
→ Select pin
→ See expanded event preview
→ Open event detail
→ Tap Participate
→ Interaction is logged
```

### Flow 3 - Shake to Discover

```
Open map or discover mode
→ Shake device
→ Accelerometer detects shake
→ App activates Discover Mode
→ App suggests nearby/random events
→ Haptic feedback is triggered
→ Interaction is logged
```

### Flow 4 - Cultural Passport

```
Open profile
→ See events marked as "going"
→ See mock past experiences
→ Optionally open event details again
```

---

## Implementation Priority

Recommended implementation order:

1. General layout
2. Navigation integrated into UI components
3. Event list screen
4. Event detail screen
5. Participate action + haptic feedback + logs
6. Simple profile / cultural passport
7. Event map screen
8. Shake to Discover
9. Real location
10. Logs/debug/export screen
11. Visual polish
12. Usability testing

The app should be demonstrable before map and sensors are fully implemented.

Minimum safe demo:

```
List -> Event Detail -> Participate -> Feedback -> Log recorded -> Profile updated
```

---

## Design Requirements

The app should follow the visual direction from the Figma high-fidelity prototype:

- mobile-first;
- bottom navigation;
- top navigation/toggle for map/list/discover where appropriate;
- event cards consistent with expanded event pins;
- clear visual hierarchy;
- large touch targets;
- visual feedback for selected states;
- subtle but clear Discover Mode state;
- haptic feedback for important actions.

Avoid over-polishing before functionality is complete.

Functional first, visual polish second.

---

## Feedback Requirements

The final prototype should include at least two types of feedback.

Planned feedback types:

- Visual feedback
- Text feedback
- Haptic feedback
- Optional audio feedback

Required examples:

- Button state changes after joining an event.
- Haptic feedback after tapping Participate.
- Haptic feedback after Shake to Discover.
- Visual Discover Mode indicator after shake
- Text confirmation after participation.

---

## Input Requirements

The final prototype should use touch input and at least two additional input/sensor mechanisms.

Planned input types:

- Touch input
- Accelerometer input for Shake to Discover
- Location input for nearby events/map centering

Implementation priority:

1. Touch
2. Accelerometer
3. Location

Location can initially fallback to a default Lisbon coordinate if permissions are denied or unavailable.

---

## Coding Guidelines for Codex

When implementing changes, follow these rules:

1. Use Expo Router, not React Navigation props.
2. Do not use `navigation.navigate(...)` in screens.
3. Use `useRouter()` from `expo-router` for navigation.
4. Use `useLocalSearchParams()` for dynamic route params.
5. Keep route files in `app/` thin.
6. Keep screen implementations in `src/screens`.
7. Keep reusable UI in `src/components`.
8. Keep data fetching/manipulation in `src/services`.
9. Do not import mock data directly into screens unless there is a strong reason.
10. Log important user interactions through `interactionLogService`.
11. Do not introduce backend yet
12. Do not introduce authentication yet.
13. Do not implement payments, ticketing, chat, or real event publishing in the academic prototype.
14. Prefer simple, reliable implementation over complex architecture.
15. Keep the app functional on Expo Go.
16. Avoid adding dependencies unless necessary.
17. If adding dependencies, explain why.
18. Keep styles close to the existing theme files.
19. Prefer small components with clear props.
20. Do not break existing routes.

---

## Expo Router Rules

Use this pattern for navigation:

```JavaScript
import { useRouter } from "expo-router";

const router = useRouter();

router.push("/list");
router.push("/map");
router.push("/profile");
```

For dynamic event routes:

```JavaScript
import { useRouter } from "expo-router";

const router = useRouter();

router.push("/list");
router.push("/map");
router.push("/profile");
```

Use this pattern for reading dynamic route params:

```JavaScript
import { useLocalSearchParams } from "expo-router";

const { id } = useLocalSearchParams();
```

Do not use:

```JavaScript
navigation.navigate("EventDetail", { eventId: id });
```

---

## Event Object Shape

Events should generally follow this structure:

```JavaScript
{
  id: "event-001",
  title: "Art Gallery Inauguration",
  category: "Art",
  description: "Inauguração de uma galeria independente em Lisboa.",
  locationName: "R. Genérica, Lisboa",
  latitude: 38.7223,
  longitude: -9.1393,
  date: "2026-06-03",
  time: "19:00",
  price: "Free",
  popularity: 42,
  friendsGoing: ["Ana", "Miguel"],
  friendsWentBefore: ["Rita", "João", "Clara"],
  isJoined: false
}
```

Avoid changing this shape without updating:

- eventService.js
- EventCard.js
- EventPin.js
- ListScreen.js
- MapScreen.js
- EventDetailScreen.js
- ProfileScreen.js

---

## Planned Screens

### Home / Index

Purpose:

- Simple entry point.
- Can link to Map and List.

Route:

```
/
```

File:

```
app/index.tsx
```

---

## Map Screen

Purpose:

- Main exploration screen.
- Shows event pins.
- Allows event pin expansion.
- Allows navigation to event detail.

Route:

```
/map
```

File:

```
app/map.tsx
```

Screen:

```
src/screens/MapScreen.js
```

---

## List Screen

Purpose:

- Shows events in list/card format.
- Supports category filtering.
- Allows navigation to event detail.

Route:

```
/list
```

File:

```
app/list.tsx
```

Screen:

```
src/screens/ListScreen.js
```

---

## Event Detail Screen

Purpose:

- Shows full event information
- Allows the user to mark participation.
- Triggers haptic feedback
- Logs detail opening and participation.

Route:

```
/event/[id]
```

File:

```
app/event/[id].tsx
```

Screen:

```
src/screens/EventDetailScreen.js
```

---

## Profile Screen

Purpose:

- Cultural passport.
- Shows joined/planned events
- Shows mock past events.
- May include hidden debug access to logs.

Route:

```
/profile
```

File:

```
app/profile.tsx
```

Screen:

```
src/screens/ProfileScreen.js
```

---

## Planned Components

### EventCard

Used in:

- List screen
- Discover Suggestions
- Profile joined events

Responsibilities:

- Display event title, category, location, date/time, price, popularity.
- Trigger `onPress`.
- Avoid fetching data internally.

---

### EventPin

Used in:

- Map screen

Responsibilities:

- Display location marker.
- Show popularity visually
- Support selected/expanded state.
- Trigger `onPress`.

---

### BottomNav

Used in:

- Main screens

Responsibilities:

- Navigate between map, list, profile.
- Indicate active route.
- Use Expo Router Navigation

---

### CategoryFilter

Used in:

- List screen
- Map screen

Responsibilities:

- Show available categories.
- Trigger selected category changes
- Log `filter_changed`.

---

## What not to implement yet

Do not implement these for the academic prototype unless all core flows are already finished:

- Real authentication.
- Real backend
- Real event publishing
- Payments
- Ticket purchasing.
- Chat/messaging
- Push notifications
- Complex social feed
- Real image uploads
- Advanced recommendation algorithm

These can be listed as future work in the report.

---

## Future Work

Possible post-delivery improvements:

- Supabase backend
- User authentication
- Organizer accounts
- Real event creation
- Event image uploads
- Friend system
- Cultural passport with real attendance history
- Photo posting tied to event location
- Event recommendations based on user behaviour.
- Real-time event popularity
- Push notifications
- Web admin dashboard for organizers

---

## Academic Report Notes

The implementation should support collecting evidence for the final report:

- Screenshots of each screen
- Description of changes from previous prototypes.
- Explanation of simplified features
- Usability testing task list
- Interaction logs
- Descriptive statistics
- Photos of tests with permission
- Link to GitHub repository

Recommended usability test tasks:

1. Find an event through the list
2. Open an event detail page
3. Mark participation in an event
4. Find the event in the profile
5. Explore events through the map
6. Use Shake to Discover

Recommended quantitative metrics:

- Time to find an event
- Time to open event details
- Time to mark participants
- Number of events opened
- Number of shakes performed
- Number of filters used
- Number of navigation actions
- Task completion rate
- Error count.

---

## Development Philosophy

This is a one-week academic functional prototype with future real-world potential.

Therefore:

Build the core experience first.
Keep the architecture clean enough to grow.
Avoid premature backend complexity.
Prioritize working mobile interactions.
Log usability data from the beginning.

Minimum successful prototype:

List -> Detail -> Participate -> Haptic Feedback -> Log -> Profile

Map -> Pin -> Detail

Shake -> Discover Mode -> Suggested events -> Log
