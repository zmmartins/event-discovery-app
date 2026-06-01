# Event Discovery App

Functional mobile prototype for the course **Interactive Multimedia Applications 2025/2026**.

The app is a social local event discovery prototype for exploring nearby cultural experiences in Lisbon. It focuses on map/list discovery, social attendance context, a cultural-passport style profile, shake-to-discover interaction, location awareness, haptic/visual feedback, and interaction logging for usability testing.

## Current State

The project is implemented with **Expo 54**, **React Native 0.81**, **React 19**, and **Expo Router 6**. The routing layer lives in `app/`; the actual screens, services, components, data, and theme files live in `src/`.

Implemented core areas:

- Native tab shell with Explore, Messages, Search, Community, and Profile tabs.
- Nested Explore stack with map, list, shake-discover, and notifications routes.
- Map exploration with event pins, user-location recentering, morphing event preview cards, save/bookmark support, and event-detail navigation.
- List exploration with event cards, save/bookmark support, and Discover Mode filtering.
- Event detail screen with a draggable sheet, event media, social context, save/bookmark, participate action, and haptic feedback.
- Profile screen with list and map views for attended mock experiences.
- Shake to Discover using the accelerometer, vibration/haptics, animated feedback, and Discover Mode activation.
- Interaction logging with AsyncStorage persistence and JSON/CSV/bundle export helpers.
- Placeholder tabs for Messages, Search, Community, and Notifications.

Not implemented as real product features:

- Authentication.
- Real backend.
- Real event publishing.
- Payments or ticketing.
- Chat/messaging.
- Push notifications.
- Real image uploads.

## Tech Stack

- Expo / Expo Go
- React Native
- Expo Router
- JavaScript for app code, TypeScript route files
- React Native Maps
- Expo Location
- Expo Sensors
- Expo Haptics
- Expo FileSystem and Sharing
- Expo Glass Effect and native tabs
- AsyncStorage
- Mock local data

## Run The Project

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm run start
```

Useful scripts:

```bash
npm run ios
npm run android
npm run web
npm run lint
```

Clear Expo cache:

```bash
npx expo start -c
```

Tunnel mode is useful when the physical device cannot reach the local development server:

```bash
npx expo start --tunnel
```

### Known Local Startup Issue

On the current local setup, `npx expo start -c` has previously failed under Node `v22.21.0` with:

```text
RangeError [ERR_SOCKET_BAD_PORT]: options.port should be >= 0 and < 65536. Received type number (65536).
```

This comes from Expo CLI's port probing through `freeport-async`, not from application code. If it appears, use a Node LTS version supported by the Expo SDK, for example Node 20, then rerun `npm install` if needed and start Expo again.

## Configuration

Location permission text and native identifiers are configured through `app.config.js`.

Google Maps API keys are read from environment variables for native builds:

```bash
GOOGLE_MAPS_IOS_API_KEY=...
GOOGLE_MAPS_ANDROID_API_KEY=...
```

The app falls back to a default Lisbon region when user location is unavailable or denied.

## Routing

Expo Router is the only navigation system used by screens. Route files stay thin and import/export screen implementations from `src/screens`.

Current route structure:

```text
app/
  _layout.tsx
  event/
    [id].tsx
  (tabs)/
    _layout.tsx
    index.tsx
    map/
      _layout.tsx
      index.tsx
      list.tsx
      notifications.tsx
      shake-discover.tsx
    list.tsx
    notifications.tsx
    shake-discover.tsx
    messages.tsx
    search.tsx
    community.tsx
    profile.tsx
```

Important routes:

- `/` redirects to `/map`.
- `/map` renders `MapScreen`.
- `/map/list` renders `ListScreen`.
- `/map/shake-discover` renders `ShakeDiscoverScreen`.
- `/map/notifications` renders `NotificationsScreen`.
- `/event/[id]` renders `EventDetailScreen`.
- `/profile` renders `ProfileScreen`.
- `/messages`, `/search`, and `/community` are placeholder tabs.

Navigation to event details uses Expo Router:

```js
router.push({
  pathname: "/event/[id]",
  params: { id: event.id },
});
```

Event details read the route parameter with `useLocalSearchParams()`.

## Project Structure

```text
app/                         File-based Expo Router routes
src/assets/avatars/          Mock avatar images
src/assets/events/           Mock event images
src/components/              Reusable UI components
src/context/                 Discovery Mode context
src/data/                    Mock events and users
src/hooks/                   Interaction and sensor hooks
src/screens/                 Screen implementations
src/services/                Data, logging, location, profile, user services
src/theme/                   Colors, spacing, map style, glass constants
src/utils/                   Image asset lookup helpers
```

Core screens:

- `MapScreen.js`
- `ListScreen.js`
- `EventDetailScreen.js`
- `ProfileScreen.js`
- `ShakeDiscoverScreen.js`
- `MessagesScreen.js`
- `SearchScreen.js`
- `CommunityScreen.js`
- `NotificationsScreen.js`

Core components:

- `AppShell.js`
- `TopNav.js`
- `DiscoverModePill.js`
- `EventCard.js`
- `EventPin.js`
- `MorphingEventPreview.js`
- `ExperiencePin.js`
- `ProfileExperienceCard.js`
- `ScreenStatusBar.js`
- `PlaceholderScreen.js`

## Feature Details

### Map

`MapScreen.js` uses `react-native-maps` with Google provider, the custom map style in `src/theme/mapStyle.js`, event markers, and a custom user-location marker.

Current marker behavior:

- Event pins are custom React marker children rendered with `EventPin`.
- Marker keys are stable by `event.id`.
- The selected marker is hidden with native `Marker` opacity while the morphing preview is open.
- `tracksViewChanges` is enabled during short refresh windows and while Discovery Mode is active.
- Event thumbnail image load can request a marker view refresh.
- The expanded preview is a React Native overlay rendered by `MorphingEventPreview`.

The map requests foreground location through `locationService.js`, recenters when possible, and logs permission/location outcomes.

### Morphing Preview

`MorphingEventPreview.js` animates from the tapped pin geometry to an expanded card. It handles:

- image-to-card morph animation;
- card tail geometry;
- save/bookmark toggle;
- open-detail CTA;
- close completion callback back to `MapScreen`.

The preview receives its geometry from `MapScreen`, including dynamic card height for longer title/address content.

### List

`ListScreen.js` loads events through `eventService.js`, renders `EventCard`, supports bookmark updates, and respects Discovery Mode filtering.

### Event Detail

`EventDetailScreen.js` loads by `/event/[id]`, renders event media and social context, supports save/bookmark, lets the user mark participation, logs detail interactions, and triggers haptic feedback.

### Profile

`ProfileScreen.js` builds a cultural-passport view from `profileService.js`. It has:

- profile header and stats;
- list view with experience cards and photo refs;
- map view with custom experience pins;
- event detail navigation from both views.

### Shake To Discover

`ShakeDiscoverScreen.js` and `useShakeToDiscover.js` use the accelerometer to detect shaking, show animated particle feedback, trigger vibration/haptics, activate Discovery Mode, and redirect to `/map/list`.

Discovery Mode stores a small ordered set of event IDs in `DiscoveryModeContext`, filters map/list data to that set, and can be dismissed from visible Discover Mode pills.

### Placeholder Tabs

Messages, Search, Community, and Notifications currently render `PlaceholderScreen` and log screen-open events.

## Data Layer

The prototype uses local mock data, not a backend.

Main files:

- `src/data/mockEvents.js`
- `src/data/mockUsers.js`
- `src/services/eventService.js`
- `src/services/userService.js`
- `src/services/profileService.js`

`eventService.js` exposes:

```js
getEvents();
getEventById(id);
getEventsByCategory(category);
joinEvent(id);
toggleSavedEvent(id);
getDiscoverEvents(options);
```

`userService.js` manages the current mock user in memory for save/join state. Interaction logs and logging context are stored in AsyncStorage.

Current event shape:

```js
{
  id: "event-001",
  title: "Art Gallery Inauguration",
  category: "Art",
  description: "Inauguracao de uma galeria independente em Lisboa.",
  locationName: "R. Generica, 5, 1234-123, Lisboa",
  thumbnailKey: "art-gallery",
  latitude: 38.7223,
  longitude: -9.1393,
  date: "2026-06-03",
  time: "19:00",
  price: "Free",
  popularity: 42,
  friendsGoing: ["Ana", "Miguel"],
  friendsWentBefore: ["Rita", "Joao", "Clara"],
  attendingFriends: [
    { id: "ana", name: "Ana", avatarKey: "ana" }
  ],
  isJoined: false,
  isSaved: false
}
```

`isSaved` is added by `eventService.js` based on current user state.

## Interaction Logging

Interaction logs live in `src/services/interactionLogService.js`.

The logger records:

- session metadata;
- route/screen/action;
- event, task, participant, source, reason, and result metadata;
- location metadata when available;
- action categories;
- elapsed time and sequence number.

Storage and export support:

- logs stored in AsyncStorage;
- interaction context stored in AsyncStorage;
- JSON export;
- CSV export;
- bundled analytics export;
- file writing through Expo FileSystem;
- sharing through Expo Sharing.

Useful exported functions:

```js
logInteraction(action, metadata);
getInteractionLogs();
clearInteractionLogs();
setInteractionContext(context);
startInteractionTask(taskId);
finishInteractionTask(result);
getInteractionSummary();
getInteractionAnalytics();
exportInteractionLogsAsJson();
exportInteractionLogsAsCsv();
exportInteractionLogsAsBundle();
writeInteractionExportFile(format);
shareInteractionExport(format);
```

There is currently no dedicated logs/debug screen in the route tree.

## Design And UX

The app uses a bright green primary color, magenta discovery accent, light surfaces, custom event imagery, avatar stacks, native tabs, and conditional Liquid Glass surfaces on supported iOS devices.

Design intent:

- map/list exploration first;
- event-centered social proof;
- compact mobile-first layouts;
- large touch targets;
- high-contrast active states;
- haptics for meaningful actions;
- Discover Mode as a visually distinct state.

## Development Guidelines

- Keep `app/` route files thin.
- Put screen implementations in `src/screens`.
- Put reusable UI in `src/components`.
- Put mock data access and mutations in `src/services`.
- Do not import `mockEvents` directly into screens.
- Use Expo Router APIs such as `useRouter`, `router.push`, `router.replace`, and `useLocalSearchParams`.
- Do not use React Navigation screen props in app screens.
- Keep interaction logging wired through `interactionLogService`.
- Keep the project Expo Go friendly where possible.
- Avoid adding new dependencies unless they solve a concrete prototype need.

## Validation

Run static/lint checks:

```bash
git diff --check
npm run lint
```

Manual smoke test:

1. Open `/map`.
2. Allow or deny location and confirm the app still works.
3. Tap an event pin and close the morphing preview.
4. Open event details from the preview.
5. Save/unsave an event.
6. Mark participation in event details.
7. Open `/map/list` and open an event card.
8. Use `/map/shake-discover` and shake the device.
9. Confirm Discover Mode filters the list/map and can be dismissed.
10. Open Profile list and map views.

## Academic Delivery Notes

The current implementation supports the prototype evidence needed for the course:

- functional app screens;
- interaction logs for quantitative analysis;
- location and accelerometer input;
- haptic/visual feedback;
- mock social event data;
- profile/cultural-passport flow.

Recommended usability tasks:

1. Find an event on the map.
2. Open an event preview.
3. Navigate to event details.
4. Save or unsave an event.
5. Mark participation in an event.
6. Find attended experiences in the profile.
7. Use Shake to Discover.

Useful metrics:

- task completion rate;
- time to find an event;
- number of event previews opened;
- number of event detail pages opened;
- number of save/join actions;
- number of shakes detected;
- number of location permission outcomes;
- number of navigation actions;
- error count observed during testing.

## Future Work

- Replace local mock data with a real backend.
- Add authentication and persistent user profiles.
- Add organizer accounts and event publishing.
- Add real messaging and notifications.
- Add real media uploads.
- Add a logs/debug export screen.
- Polish map marker stability and preview animation.
- Add stronger recommendation logic for Discover Mode.
