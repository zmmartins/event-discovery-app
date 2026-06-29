# Event Discovery App

Mobile-first event discovery prototype for the course **Interactive Multimedia
Applications 2025/2026**.

The app explores a social, local-event discovery experience built around map
exploration, image-led browsing, friend context, a cultural-passport profile,
shake-to-discover, location awareness, haptic feedback, and interaction logging
for usability testing.

The current data set is local mock data. Events are spread across Portugal, the
committed event calendar is dated June 2026, and the default map/discovery origin
is Lisbon. The mock data layer is normalized into backend-like entities and
relationship records, and services compose those records into the UI-friendly
objects consumed by screens.

## Current State

The project currently uses:

- Expo 54
- React Native 0.81
- React 19
- Expo Router 6
- JavaScript for most app code
- TypeScript/TSX for route files and Expo Router layouts

The app is native-focused. It is intended to be validated on iOS or Android
because the current route graph imports `react-native-maps`.

Implemented areas:

- Native bottom tab shell with Explore, Messages, Search, Community, and Profile.
- Explore stack with map, list, shake-discover, and notifications routes.
- Explore top navigation for filter, map, list, shake-discover, and
  notifications. The filter button currently logs an interaction only.
- Map discovery with Google-provider `react-native-maps`, custom map styling,
  custom event pins, user-location recentering, location-status UI, editorial
  event previews, and event-detail navigation.
- Stable map marker rendering: custom marker children use generated pin images
  and stop tracking view changes after their images load.
- List discovery with a two-column masonry feed, generated preview images,
  attendee stacks, bookmark toggling, and Discovery Mode filtering.
- Event detail screen with generated detail media, social context, draggable
  sheet behavior, bookmark toggling, participation action, haptics, and
  interaction logging.
- Profile screen with a draggable cultural-passport sheet, Attended/Going/Saved
  sections, per-section list/map selectors, attended-experience memories,
  upcoming joined/saved event lists, and an attended-experience map.
- Shake to Discover with accelerometer detection, vibration, haptic feedback,
  animated visual feedback, Discovery Mode activation, and redirect to the list.
- Interaction logging stored in AsyncStorage, with JSON/CSV/bundle export helper
  functions.
- Normalized local mock data for event types, organizers, locations, events,
  event images, users, friendships, saved events, event participations, and
  profile experiences.
- Event image variant generation for map pins, previews/cards, and detail media.
- Conditional Liquid Glass/native-tab styling helpers for supported iOS surfaces.
- Placeholder screens for Messages, Search, Community, and Notifications.
- Placeholder map states for the Profile Going and Saved sections.

Out of scope for the current academic prototype:

- Authentication
- Real backend/API integration
- Real event publishing
- Payments or ticketing
- Chat/messaging implementation
- Push notifications
- Image upload flows
- Dedicated in-app interaction-log/debug screen

## Tech Stack

- Expo / Expo CLI
- Expo Router
- React Native
- React Native Maps
- Expo Location
- Expo Sensors
- Expo Haptics
- Expo Blur
- Expo Glass Effect
- Expo FileSystem and Sharing
- Expo System UI
- Expo Updates
- AsyncStorage
- React Native Reanimated
- React Native Gesture Handler
- Sharp for deterministic local event-image variants
- Knip for unused-code/dependency audits
- Local mock repositories and mock records

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
npm run images:events
npm run lint
npm run unused
```

`npm run images:events` regenerates event image variants from source images in
`src/assets/events`.

`npm run unused` runs Knip using `knip.json`. Treat it as an audit tool; the app
keeps service, repository, domain, theme, and image-helper exports as intentional
API boundaries, so `knip.json` ignores unused-export reports for those boundary
files while still reporting other unused-code/dependency issues.

Repository-structure helpers:

- `.structignore` configures the local `project-tree` command so tree output
  stays focused on source files as generated assets, native folders, caches, and
  tooling files grow.
- `list_project_structure.py` is a standalone legacy tree printer with hardcoded
  ignores. It does not read `.structignore`; use `project-tree` for the
  configurable project-structure output.

The `web` script exists because this is an Expo project, but the current app is
not web-ready. The route graph imports `react-native-maps`, so use iOS or
Android for validation.

Clear Expo cache:

```bash
npx expo start -c
```

Tunnel mode can help when a physical device cannot reach the local development
server:

```bash
npx expo start --tunnel
```

### Known Local Startup Issue

On the current local setup, `npx expo start -c` has previously failed under Node
`v22.21.0` with:

```text
RangeError [ERR_SOCKET_BAD_PORT]: options.port should be >= 0 and < 65536. Received type number (65536).
```

This comes from Expo CLI's port probing through `freeport-async`, not from app
code. If it appears, use a Node LTS version supported by the Expo SDK, for
example Node 20, then rerun `npm install` if needed and start Expo again.

## Configuration

Runtime/native configuration is split between `app.json` and `app.config.js`.

`app.config.js` currently:

- sets the iOS bundle identifier and Android package to
  `com.eventdiscovery.app`;
- injects iOS and Android location permission configuration;
- reads native Google Maps keys from environment variables;
- ensures the `expo-font` plugin is present.

Google Maps API keys for native builds:

```bash
GOOGLE_MAPS_IOS_API_KEY=...
GOOGLE_MAPS_ANDROID_API_KEY=...
```

The app falls back to a default Lisbon region when user location is unavailable
or permission is denied.

`app.json` sets Expo's `userInterfaceStyle` to `light` and references the
committed app icon, Android adaptive icon, splash icon, and favicon assets under
`assets/images`.

## Routing

Expo Router is the only navigation system used by screens. Route files stay thin
and import screen implementations from `src/screens`.

Current route structure:

```text
app/
  _layout.tsx
  event/
    [id].tsx
  (tabs)/
    _layout.tsx
    index.tsx
    list.tsx
    notifications.tsx
    shake-discover.tsx
    messages.tsx
    search.tsx
    community.tsx
    profile.tsx
    map/
      _layout.tsx
      index.tsx
      list.tsx
      notifications.tsx
      shake-discover.tsx
```

Important routes:

- `/` redirects to `/map`.
- `/list` redirects to `/map/list`.
- `/notifications` redirects to `/map/notifications`.
- `/shake-discover` redirects to `/map/shake-discover`.
- `/map` renders `MapScreen`.
- `/map/list` renders `ListScreen`.
- `/map/shake-discover` renders `ShakeDiscoverScreen`.
- `/map/notifications` renders `NotificationsScreen`.
- `/event/[id]` renders `EventDetailScreen`.
- `/profile` renders `ProfileScreen`.
- `/messages`, `/search`, and `/community` render placeholder tab screens.

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
.structignore                 Ignore rules for the local project-tree command
app/                         File-based Expo Router routes
assets/images/               Static Expo icon, splash, adaptive icon, and favicon assets
list_project_structure.py     Standalone hardcoded project tree printer
scripts/                     Local maintenance scripts
src/assets/avatars/          Mock avatar images
src/assets/events/           Source mock event images
src/assets/events/pins/      Generated 160x160 pin images
src/assets/events/previews/  Generated max-900px preview/card images
src/assets/events/details/   Generated max-1600px detail images
src/components/              Reusable UI components
src/context/                 Discovery Mode context
src/data/                    Mock source records and local data adapters
src/data/local/              Local repository implementations backed by mock data
src/domain/                  Pure event, discovery, and profile helpers
src/hooks/                   Interaction and sensor hooks
src/repositories/            Replaceable data-access facades
src/screens/                 Screen implementations
src/services/                Data, logging, location, profile, and user services
src/theme/                   Colors, map style, and Liquid Glass helpers
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
- `EventPinActionMenu.js`
- `MorphingEventPreview.js`
- `ExperiencePin.js`
- `ProfileExperienceCard.js`
- `ScreenStatusBar.js`
- `PlaceholderScreen.js`

## Feature Notes

### Event Image Assets

Source event images live directly under `src/assets/events`. Generated variants
live in:

- `src/assets/events/pins`: 160x160 JPG square crops for map marker snapshots.
- `src/assets/events/previews`: JPG images resized to fit within 900px on the
  longest side for cards, posters, lists, and profile memories.
- `src/assets/events/details`: JPG images resized to fit within 1600px on the
  longest side for event detail media.

Regenerate variants with:

```bash
npm run images:events
```

The generator is `scripts/generate-event-image-variants.js`. It uses Sharp,
accepts `.jpg`, `.jpeg`, `.png`, and `.webp` source files, writes deterministic
names such as `art_gallery1_pin.jpg`, and ignores the generated `pins`,
`previews`, and `details` folders so variants are not processed again.

Image lookup is centralized in `src/utils/imageAssets.js`:

- `getEventPinImage(key)` for map pins and profile experience pins.
- `getEventPreviewImage(key)` for cards, poster previews, list images, and
  profile memory tiles.
- `getEventDetailImage(key)` for event detail media.
- `getEventImage(key)` remains as a backward-compatible alias to preview images.

`imageAssets.js` also keeps legacy keys such as `art-gallery`, `film-night`, and
`rooftop-jazz` so existing profile photo refs resolve to current generated event
images.

Do not manually edit generated variants. Update the source image, then rerun
`npm run images:events`.

### Map

`MapScreen.js` uses `react-native-maps` with Google provider, the custom style in
`src/theme/mapStyle.js`, event markers, and a custom user-location marker.

Current behavior:

- Events render as custom React marker children through `EventPin`.
- Pin size is based on event popularity.
- Friend presence adds the secondary-color ring around pins.
- Event marker keys are stable by `event.id`.
- `tracksViewChanges` stays enabled only until each pin image finishes loading.
- The expanded event preview is a React Native overlay rendered by
  `MorphingEventPreview`, not a map marker.
- Opening or closing a preview does not intentionally remount or hide the marker
  layer.
- The map requests foreground location through `locationService.js`, recenters
  when possible, and logs permission/location outcomes.
- The location-status control shows Lisbon, locating, or near-you state and can
  recenter the map when location is available.

### List

`ListScreen.js` loads events through `eventService.js`, supports bookmark
updates, and respects Discovery Mode filtering.

Current behavior:

- The feed uses a `ScrollView` with two independently rendered columns.
- Events are split between columns by alternating index.
- Cards use generated preview images with ratio-based heights clamped by
  `EventCard`.
- Tapping the image or title/date block opens event details.
- Tapping the bookmark toggles saved state without opening event details.
- Attendee stacks show at most two friend avatars plus a `+` avatar when there
  are more than two friends attending.

### Event Detail

`EventDetailScreen.js` loads by `/event/[id]`. It renders generated detail-size
media, social context, a draggable sheet, bookmark controls, a participation
action, haptics, and detail interaction logs.

Some supporting content is intentionally prototype-grade, including the static
map preview and review card copy.

### Profile

`ProfileScreen.js` builds a cultural-passport style view from
`profileService.js`.

Current behavior:

- Full-screen avatar/hero background with a draggable blurred profile sheet.
- Profile summary with display name, username, and derived stats.
- Attended, Going, and Saved section tabs with counts.
- Per-section list/map selector.
- Attended list cards with looping memory photo carousels, attendee stacks,
  bookmark toggling, and event-detail navigation.
- Attended map using custom experience pins and random memory photos from each
  profile experience.
- Going and Saved list views rendered as two-column event feeds using the same
  event cards as discovery.
- Going and Saved map views are intentionally placeholder states for now.

### Shake To Discover

`ShakeDiscoverScreen.js` and `useShakeToDiscover.js` use the accelerometer to
detect shaking, show animated particle feedback, trigger vibration/haptics,
activate Discovery Mode, and redirect to `/map/list`.

Discovery Mode stores an ordered set of four event IDs selected by distance from
the default Lisbon discovery coordinate with a small random tie-breaker. Map and
list screens filter to that set until the Discover Mode pill is dismissed.

### Placeholder Screens

Messages, Search, Community, and Notifications currently render
`PlaceholderScreen` and log screen-open events.

## Data Layer

The prototype uses local mock data, not a backend.

The mock database is normalized into event types, organizers, locations, events,
event images, users, friendships, saved events, event participations, and user
event experiences. Services compose these source records into UI-ready view
models. This keeps UI code stable while matching the shape of a future backend.

Data flow is intentionally backend-ready:

- `src/data/mockEvents.js` contains event-domain source records:
  `mockEventTypes`, `mockOrganizers`, `mockLocations`, `mockEvents`,
  `mockEventImages`, `mockEventParticipations`, and `mockUserSavedEvents`.
- `src/data/mockUsers.js` contains user-domain source records:
  `mockUsers`, `mockFriendships`, and `mockUserEventExperiences`.
- `src/data/local/*Repository.js` contains the local in-memory repository
  implementations and is the only app layer that should import mock records
  directly.
- `src/repositories/*Repository.js` is the replaceable data-access facade.
- `src/services/*Service.js` contains application/use-case functions consumed by
  screens and components.
- `src/domain/` contains pure helpers for event state, event formatting,
  discovery ranking, geo distance, and profile aggregation.

Screens and components should call services or receive props. They should not
import mock records directly.

Source event records store backend-like fields such as `eventTypeId`,
`organizerId`, `locationId`, `startsAt`, `endsAt`, structured `price`,
`maximumCapacity`, lifecycle `status`, and `popularity`. They do not store
rendering conveniences such as category names, organizer names, location labels,
coordinates, image keys, friend context, saved state, or joined state.

`eventService.js` composes event view models from normalized records and keeps
the current UI contract stable. Screens still receive fields such as:

```js
{
  id,
  title,
  category,
  description,
  longDescription,
  locationName,
  latitude,
  longitude,
  thumbnailKey,
  organizerName,
  date,
  time,
  startsAt,
  endsAt,
  price,
  maximumCapacity,
  status,
  availability,
  popularity,
  attendingFriends,
  friendsGoing,
  friendsWentBefore,
  isSaved,
  isJoined,
  canJoin,
}
```

Events store lifecycle status as `draft`, `published`, or `canceled`.
Availability is computed as `available`, `sold_out`, `canceled`, or
`already_happened` from lifecycle status, `endsAt`, active participation count,
and `maximumCapacity`.

Saved state is represented by `mockUserSavedEvents`. Join state is represented by
`mockEventParticipations`; active participation means `status === "registered"`.
`joinEvent(id)` creates a participation relationship when the event is joinable
and is idempotent if the current user is already registered.

`eventService.js` exposes:

```js
getEvents();
getEventById(id);
getEventsByCategory(category);
joinEvent(id);
toggleSavedEvent(id);
getDiscoverEvents(options);
```

`profileService.js` composes profile experiences from normalized user event
experience records, event view models, friendship records, and the full event
list. Profile stats are derived from accepted friendships and the current user's
explicit experience records. Profile sections are derived as:

- `attended`: explicit user event experience records with memory photo refs.
- `going`: future visible events where the current user is registered.
- `saved`: future visible events saved by the current user.

Only attended events currently produce profile map pins.

Interaction logs and logging context are stored in AsyncStorage.

## Interaction Logging

Interaction logs live in `src/services/interactionLogService.js`.

The logger records session metadata, route/screen/action data, event/task/source
metadata, location metadata when available, action categories, elapsed time, and
sequence number.

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
getInteractionContext();
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

The visual system uses a bright green primary color, magenta discovery accent,
light surfaces, custom event imagery, avatar stacks, native tabs, and conditional
Liquid Glass surfaces on supported iOS devices.

Design intent:

- map/list exploration first;
- editorial poster previews for map discovery;
- image-led two-column browsing in the list view;
- event-centered social proof;
- compact mobile-first layouts;
- large touch targets;
- high-contrast active states;
- haptics for meaningful actions;
- Discovery Mode as a visually distinct state.

## Development Guidelines

- Keep `app/` route files thin.
- Put screen implementations in `src/screens`.
- Put reusable UI in `src/components`.
- Put mock data access and local in-memory mutations in `src/data/local`.
- Keep `src/repositories` as the replaceable data-access boundary.
- Keep `src/services` as application/use-case facades consumed by
  screens/components.
- Keep reusable business rules in `src/domain`.
- Do not import mock records directly outside `src/data/local`.
- Do not make screens/components consume normalized records directly; compose
  UI-ready models in services/domain helpers.
- Do not store computed `availability`, `isSaved`, or `isJoined` on source event
  records.
- Use Expo Router APIs such as `useRouter`, `router.push`, `router.replace`, and
  `useLocalSearchParams`.
- Do not use React Navigation screen props in app screens.
- Keep interaction logging wired through `interactionLogService`.
- Keep the map marker layer stable. Preview open/close state should not drive
  marker remounting, marker opacity, or marker image refreshes.
- Regenerate event image variants with `npm run images:events` after adding or
  changing source event images.
- Prefer Expo-compatible dependencies. Add new dependencies only when they solve
  a concrete prototype requirement.

## Validation

For documentation-only changes:

```bash
git diff --check
```

For code changes:

```bash
git diff --check
./node_modules/.bin/tsc --noEmit
npm run lint
```

After changing event artwork:

```bash
npm run images:events
```

Optional architecture/dependency audit:

```bash
npm run unused
```

Recommended manual smoke test:

1. Open `/map`, allow or deny location, and confirm the map still renders.
2. Tap several event pins and confirm previews open, dismiss, and navigate to
   detail screens.
3. Open `/map/list`, save/unsave an event, and open an event detail screen.
4. Use `/map/shake-discover`, shake the device, and confirm Discovery Mode
   filters the list/map until dismissed.
5. Open Profile, switch Attended/Going/Saved sections, toggle list/map views,
   and confirm attended pins/cards plus going/saved cards navigate to details.

For course evaluation, the current prototype supports evidence around task
completion, event preview/detail opens, save/join actions, shake detection,
location permission outcomes, navigation actions, and exported interaction-log
data.
