# Event Discovery App

Functional mobile prototype for the course **Interactive Multimedia Applications 2025/2026**.

The app is a social local event discovery prototype for exploring nearby cultural experiences in Lisbon. It focuses on map/list discovery, stable custom map pins, editorial event previews, social attendance context, a cultural-passport style profile, shake-to-discover interaction, location awareness, haptic/visual feedback, and interaction logging for usability testing.

## Current State

The project is implemented with **Expo 54**, **React Native 0.81**, **React 19**, and **Expo Router 6**. The routing layer lives in `app/`; the actual screens, services, components, data, and theme files live in `src/`.

Implemented core areas:

- Native tab shell with Explore, Messages, Search, Community, and Profile tabs.
- Nested Explore stack with map, list, shake-discover, and notifications routes.
- Map exploration with static event pins, user-location recentering, a transient location-status control, centered editorial poster previews, and event-detail navigation.
- List exploration with a two-column masonry-style event feed, image-led cards, save/bookmark support, and Discover Mode filtering.
- Event detail screen with a draggable sheet, event media, social context, save/bookmark, participate action, and haptic feedback.
- Profile screen with list and map views for attended mock experiences.
- Shake to Discover using the accelerometer, vibration/haptics, animated feedback, and Discover Mode activation.
- Interaction logging with AsyncStorage persistence and JSON/CSV/bundle export helpers.
- Placeholder tabs for Messages, Search, Community, and Notifications.

Out of scope for the current academic prototype:

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
- Expo Blur
- React Native Reanimated
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
- Event marker keys remain stable by `event.id`.
- Event markers use `tracksViewChanges={false}` during normal operation.
- The marker layer is intentionally static and independent from preview state.
- Opening or closing a preview must not hide, unmount, rekey, remount, refresh, or opacity-toggle event markers.
- The selected marker remains mounted and visible underneath the overlay.
- Event pin layout/size is derived from event data but frozen per JS session through the session layout helper in `EventPin.js`.
- The expanded preview is a React Native overlay rendered by `MorphingEventPreview`, not a map marker.
- The map recenters on the selected event before the preview opens.
- A blur/dismiss overlay appears behind the expanded preview and blocks map interaction while the preview is open.
- The location-status/recenter control disappears while an event preview is open and returns after the poster collapses back to the map.
- The location-status control is translucent when inactive and becomes a solid primary-green control with dark text/icon when the map is centered on the user.

Important marker stability rule:

Do not make preview state mutate the marker layer. Preview interactions must not change marker visibility, keys, mount state, `tracksViewChanges`, or marker image-load refresh behavior. This rule exists because custom React children inside `react-native-maps` markers can become unstable if repeatedly refreshed or remounted.

The map requests foreground location through `locationService.js`, recenters when possible, and logs permission/location outcomes.

### Morphing Preview

`MorphingEventPreview.js` animates from the tapped pin geometry into a centered editorial poster-style overlay.

Current behavior:

- The map centers on the selected event before the preview opens.
- The preview morph starts from the tapped pin's screen geometry.
- The expanded preview is centered on the screen and no longer uses a tail.
- A blur/dismiss overlay is rendered behind the preview.
- Tapping outside the preview or dragging on the overlay dismisses the preview.
- The poster layout presents the event title, date/time, social attendance context, organizer/venue label, square event artwork, and price/address metadata.
- Poster titles are sized by a custom layout solver that chooses word-boundary line breaks, font size, and line height together.
- Title hyphenation is used only as a fallback for titles that cannot fit at normal word boundaries.
- Poster title lines render as one native `Text` element per solved line and do not use native auto-shrinking, which keeps 3-line titles stable during the morph animation.
- The date/time stack is rotated and aligned with the title row.
- The footer uses compact editorial/monospace support text, removes postal-code-like address fragments, and allows the address to wrap to two lines.
- The circular arrow action button opens `/event/[id]`.
- Close completion is reported back to `MapScreen` so preview state can be cleared after the morph-out animation.

The preview receives its poster geometry from `MapScreen`, including centered card dimensions, header/footer section heights, square artwork size, and the tapped pin's morph start geometry.

### List

`ListScreen.js` loads events through `eventService.js`, supports bookmark updates, and respects Discovery Mode filtering.

Current list behavior:

- The list uses a `ScrollView` with exactly two independently rendered columns.
- Events are split between columns by alternating index.
- Each `EventCard` receives the calculated column width, so all thumbnails share the same column width.
- `EventCard` is a vertical masonry tile: image first, then an uppercase date/title block with a compact vertical attendee stack.
- Thumbnail height is calculated from the local image aspect ratio with a min/max clamp.
- Tapping the image opens event details.
- Tapping the date/title area opens event details.
- Tapping the bookmark only toggles saved state and keeps the existing haptic/logging behavior.
- The bookmark has no circular background; inactive state is a translucent outline over the image and active state is a primary-green bookmark.
- List-card attendee stacks show at most three circles: one or two friend avatars, then a `+` avatar whenever more than two friends are attending.
- The old horizontal card layout, address/price text, and `CHECK US OUT` button have been removed from the list feed.

Current asset note: the card code supports ratio-based masonry image heights, but the bundled event thumbnails currently share the same `180x240` portrait dimensions. More visibly varied image heights will appear when varied-ratio event artwork is added.

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

Discovery Mode stores a small ordered set of event IDs in `DiscoveryModeContext`, filters map/list data to that set, and can be dismissed from visible Discover Mode pills. Discovery Mode must not change marker mount behavior; it only changes which events are provided to the map/list screens.

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

`userService.js` manages the current mock user in memory for save/join state. `eventService.js` returns event objects enriched with user-specific state such as `isSaved` and `isJoined`. Interaction logs and logging context are stored in AsyncStorage.

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
- editorial poster previews for event discovery from the map;
- image-led two-column masonry browsing in the list view;
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
- Keep the map marker layer static. Do not connect marker rendering to preview open/close state.
- Keep the list screen's masonry structure in `ListScreen.js`; tile-specific visual behavior belongs in `EventCard.js`.
- Keep the project Expo Go friendly where possible, but do not let that block concrete prototype requirements when an Expo-compatible module or dev build would be justified.
- Prefer Expo-compatible dependencies. Add new dependencies only when they solve a concrete UX, testing, or implementation need, and document why they were added.

## Validation

Run static/lint checks:

```bash
git diff --check
npm run lint
```

Manual smoke test:

1. Open `/map`.
2. Allow or deny location and confirm the app still works.
3. Tap multiple event pins repeatedly.
4. Confirm the map centers on the tapped event before the preview opens.
5. Confirm the editorial poster preview opens centered on screen.
6. Confirm the location-status/recenter control disappears while the poster is open and returns after it collapses.
7. Confirm event pins do not disappear after opening/closing previews.
8. Confirm the user-location marker does not disappear after opening/closing previews.
9. Confirm tapping outside the poster dismisses the preview and removes the blur.
10. Confirm dragging on the blur/dismiss overlay dismisses the preview.
11. Confirm the circular poster action button opens event details.
12. Confirm long poster titles wrap cleanly at word boundaries or manual hyphen breaks, without native-looking one-letter splits or opening-animation flicker.
13. Confirm long poster addresses can wrap in the footer and do not show postal-code-like fragments.
14. Open `/map/list` and confirm the event feed renders as two masonry columns.
15. Confirm list-card image taps open event details.
16. Confirm list-card date/title taps open event details.
17. Confirm list-card bookmark taps save/unsave without opening event details.
18. Confirm list-card attendee stacks never show more than three circles.
19. Save/unsave from event details.
20. Mark participation in event details.
21. Use `/map/shake-discover` and shake the device.
22. Confirm Discover Mode filters the list/map and can be dismissed.
23. Confirm Discover Mode does not destabilize map markers.
24. Open Profile list and map views.

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
- Continue refining the editorial map preview poster motion and layout.
- Add varied-ratio event artwork to make the masonry feed's ratio-aware image heights more visible.
- Add robust regression testing/checklists around custom map markers and preview interactions.
- Consider a dev-build/native-marker strategy only if Expo Go limitations become blocking.
- Add stronger recommendation logic for Discover Mode.
