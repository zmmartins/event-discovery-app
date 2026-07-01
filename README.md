# Event Discovery App

Mobile-first event discovery prototype for the course **Interactive Multimedia
Applications 2025/2026**.

The app explores a social local-event discovery experience built around map
exploration, image-led browsing, friend context, a cultural-passport profile,
shake-to-discover, location awareness, haptic feedback, and interaction logging
for usability testing.

The current project is a native-focused Expo prototype. It uses local mock data,
original local event imagery, generated image variants, and backend-shaped
repository/service boundaries, but it does not currently connect to a real
backend.

## Current Snapshot

- Expo SDK 54, React Native 0.81, React 19, Expo Router 6.
- JavaScript for most app code, with TypeScript/TSX route files and layouts.
- Native-first validation target: iOS or Android. The route graph imports
  `react-native-maps`, so the web target is not considered ready.
- Local mock event calendar with 16 June 2026 events across Portuguese cities.
- Default map and Discovery Mode origin: Lisbon, Portugal.
- Single app icon asset at `assets/images/icon.png`, reused for native icons,
  Android adaptive icon foreground/monochrome image, web favicon, and splash.
- No authentication, backend API, payments, ticketing, chat, push notifications,
  event publishing flow, or image upload flow.

Implemented surfaces:

- Native tab shell with Explore, Messages, Search, Community, and Profile tabs.
- Explore stack with map, list, shake-discover, and notifications routes.
- Google-provider map with custom popularity-scaled event pins, custom
  user-location marker, priority-based overlap tap/long-press resolution,
  measured pin-to-poster morph previews, long-press pin action menu, and
  event-detail navigation.
- Discovery list with two-column image cards, attendee stacks, bookmark
  toggling, and Discovery Mode filtering.
- Event detail screen with generated detail media, social context, draggable
  sheet, save/join controls, haptics, and interaction logging.
- Profile screen with a cultural-passport style sheet, Attended/Going/Saved
  sections, section-specific list/map selectors, attended memories, and
  upcoming/saved event feeds.
- Shake to Discover with accelerometer detection, vibration, haptics, visual
  feedback, Discovery Mode activation, and redirect to the list.
- Placeholder screens for Messages, Search, Community, and Notifications.
- Interaction logging stored in AsyncStorage with JSON, CSV, bundle, file, and
  share helpers.

## Tech Stack

- Expo and Expo CLI
- Expo Router
- React Native
- React Native Maps
- React Native Reanimated
- React Native Gesture Handler
- AsyncStorage
- Expo Location
- Expo Sensors
- Expo Haptics
- Expo Blur
- Expo Glass Effect
- Expo FileSystem and Sharing
- Expo Splash Screen
- Expo Status Bar
- Expo System UI
- Expo Updates
- Sharp for local event-image variant generation
- Knip for unused-code/dependency audits

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

`npm run images:events` regenerates deterministic event image variants from the
source images in `src/assets/events`.

`npm run unused` runs Knip using `knip.json`. Treat it as an audit tool. Some
repository, service, domain, theme, and image-helper exports are intentional API
boundaries, so `knip.json` ignores unused-export reports for those boundary
files while still reporting other unused-code/dependency issues.

The `web` script exists because this is an Expo project, but the current app is
not web-ready. Use iOS or Android for validation.

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

This comes from Expo CLI port probing through `freeport-async`, not from app
code. If it appears, use a Node LTS version supported by the Expo SDK, for
example Node 20, then rerun `npm install` if needed and start Expo again.

## Configuration

Runtime/native configuration is split between `app.json` and `app.config.js`.

`app.json` currently:

- sets the app name, slug, portrait orientation, light UI style, scheme, and new
  architecture flag;
- sets the iOS bundle identifier;
- uses `assets/images/icon.png` as the top-level Expo icon;
- uses the same `assets/images/icon.png` for Android adaptive icon foreground
  and monochrome image;
- sets the Android adaptive icon background color to `#E6F4FE`;
- enables Android edge-to-edge rendering and disables Android predictive back
  gesture handling;
- uses the same icon as the web favicon;
- configures `expo-splash-screen` to use the same icon with `contain` resize,
  white light background, and black dark background;
- enables typed routes and the React compiler experiment.

`app.config.js` currently:

- keeps the native application identifier aligned as `com.eventdiscovery.app`;
- injects iOS and Android foreground-location permission configuration;
- reads native Google Maps keys from environment variables;
- ensures the `expo-font` plugin is present.

Google Maps API keys for native builds:

```bash
GOOGLE_MAPS_IOS_API_KEY=...
GOOGLE_MAPS_ANDROID_API_KEY=...
```

The app falls back to a default Lisbon region when user location is unavailable
or permission is denied.

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
app/                          File-based Expo Router routes
app.config.js                 Dynamic Expo config for permissions/maps/plugins
app.json                      Static Expo app config, icon, splash, experiments
assets/images/                Shared Expo icon asset
knip.json                     Unused-code/dependency audit configuration
list_project_structure.py     Standalone legacy project tree printer
scripts/                      Local maintenance scripts
src/assets/avatars/           Mock avatar images
src/assets/events/            Source mock event images
src/assets/events/pins/       Generated 160x160 pin images
src/assets/events/posters/    Generated 1200x1200 morph-poster fallbacks
src/assets/events/previews/   Generated max-900px preview/card images
src/assets/events/details/    Generated max-1600px detail images
src/components/               Reusable UI components
src/context/                  Discovery Mode context
src/data/                     Mock source records and local data adapters
src/data/local/               Local repository implementations
src/domain/                   Pure event, discovery, geo, and profile helpers
src/hooks/                    Interaction and sensor hooks
src/repositories/             Replaceable data-access facades
src/screens/                  Screen implementations
src/services/                 Data, logging, location, profile, and user services
src/theme/                    Colors, map style, and Liquid Glass helpers
src/utils/                    Image asset lookup helpers
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
- `MorphingPreviewBackdrop.js`
- `ExperiencePin.js`
- `ProfileExperienceCard.js`
- `ScreenStatusBar.js`
- `PlaceholderScreen.js`

Repository-structure helpers:

- `.structignore` configures the local `project-tree` command so tree output
  stays focused on source files as generated assets, native folders, caches, and
  tooling files grow.
- `list_project_structure.py` is a standalone legacy tree printer with hardcoded
  ignores. It does not read `.structignore`; use `project-tree` for configurable
  project-structure output.

## Feature Notes

### Explore Map

`MapScreen.js` uses `react-native-maps` with the Google provider, the custom map
style in `src/theme/mapStyle.js`, event markers, and a custom user-location
marker.

Current behavior:

- Events render as custom React marker children through `EventPin`.
- Pin size is based on event popularity.
- Pin `zIndex` and marker render order also follow event popularity, so more
  popular pins naturally sit above lower-popularity pins.
- Friend presence adds the secondary-color ring around pins.
- Marker keys are stable by `event.id`.
- `tracksViewChanges` stays enabled only until each pin image finishes loading.
- Pins are not clustered, hidden, or replaced with count badges. Naturally
  overlapping pins stay rendered as normal map markers.
- Tapping a pin or an overlapping stack resolves the intended top pin with
  screen-space hit testing, centers the map on that event, and opens the
  expanded preview.
- When React Native Maps reports an overlapped tap as a map-level press instead
  of a marker press, the map consumes the pending top-pin target and follows the
  same event-centering flow. A short suppression window prevents a duplicate
  native marker press from overriding that choice.
- Long-pressing a pin opens `EventPinActionMenu` with expand, share, and save
  actions.
- Long-pressing an overlapping stack also resolves to the highest-priority
  visible pin under the finger.
- Expand and save are functional from the pin action menu. Share currently logs
  a placeholder action.
- Panning from a pin remains map-first: movement before long-press activation
  cancels pending pin selection.
- The pin action menu chooses a fan direction from available screen space and
  avoids top/bottom chrome.
- The expanded preview is a React Native overlay rendered by
  `MorphingEventPreview`, not a map marker.
- Preview open/close geometry is based on the selected event's current
  `map.pointForCoordinate(...)` screen projection, with viewport center used
  only as a fallback. This keeps the morph origin aligned with the real native
  marker even after ambiguous stacked taps or slightly imperfect map animation.
- The map keeps a hidden offscreen image warm-up layer mounted so local bundled
  poster/detail assets decode before the first preview animation needs them.
- Opening or closing a preview does not intentionally remount or hide the marker
  layer.
- The user-location marker is separate from event pins, remains above event
  markers, and is not included in event hit testing.
- The map requests foreground location through `locationService.js`, recenters
  when possible, and logs permission/location outcomes.
- The location-status control shows Lisbon, locating, or near-you state and can
  recenter the map when location is available.

`MorphingEventPreview.js` uses a simple solid poster treatment with functional
animation and careful image loading:

- the real map marker can keep using its low-resolution pin image, but the
  overlay thumbnail uses `getEventPosterImage(event.thumbnailKey)`;
- the poster image is mounted immediately inside the morphing thumbnail clip;
- at progress `0`, that clip is a small circle at the measured map-projected
  pin position supplied by `MapScreen`, and at progress `1`, it becomes the
  square expanded poster thumbnail;
- once the poster image has loaded, it fades in and scales with the overlay
  during both open and close;
- an animated skeleton/shimmer is visible only while the poster image has not
  loaded yet;
- no low-resolution pin image is rendered inside the expanded poster thumbnail.

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

`EventDetailScreen.js` loads by `/event/[id]`.

Current behavior:

- generated detail-size media from `src/assets/events/details`;
- social context from attending friends and previous visitors;
- draggable detail sheet;
- save/bookmark control;
- participation action through `joinEvent(id)`;
- haptics for meaningful interactions;
- static map preview;
- interaction logging for detail screen actions.

Some supporting content is intentionally prototype-grade, including the static
map preview and review-card copy.

### Profile

`ProfileScreen.js` builds a cultural-passport style view from
`profileService.js`.

Current behavior:

- full-screen avatar/hero background with a draggable blurred profile sheet;
- profile summary with display name, username, and derived stats;
- Attended, Going, and Saved section tabs with counts;
- per-section list/map selector;
- attended list cards with looping memory photo carousels, attendee stacks,
  bookmark toggling, and event-detail navigation;
- attended map using custom experience pins and random memory photos from each
  profile experience;
- Going and Saved list views rendered as two-column event feeds using the same
  event cards as discovery;
- Going and Saved map views are placeholder states for now.

### Shake To Discover

`ShakeDiscoverScreen.js` and `useShakeToDiscover.js` use the accelerometer to
detect shaking, show animated feedback, trigger vibration/haptics, activate
Discovery Mode, and redirect to `/map/list`.

Discovery Mode stores an ordered set of four event IDs selected by distance from
the default Lisbon discovery coordinate with a small random tie-breaker. Map and
list screens filter to that set until the Discover Mode pill is dismissed.

### Placeholder Screens

Messages, Search, Community, and Notifications currently render
`PlaceholderScreen` and log screen-open events.

## Event Image Assets

Source event images live directly under `src/assets/events`. Generated variants
live in:

- `src/assets/events/pins`: 160x160 JPG square crops for map marker snapshots.
- `src/assets/events/posters`: 1200x1200 JPG square crops used as morphing
  poster fallbacks.
- `src/assets/events/previews`: JPG images resized to fit within 900px on the
  longest side for cards, lists, and profile memories.
- `src/assets/events/details`: JPG images resized to fit within 1600px on the
  longest side for event detail media.

Regenerate variants with:

```bash
npm run images:events
```

The generator is `scripts/generate-event-image-variants.js`. It uses Sharp,
accepts `.jpg`, `.jpeg`, `.png`, and `.webp` source files, writes deterministic
names such as `art_gallery1_pin.jpg`, and ignores the generated `pins`,
`posters`, `previews`, and `details` folders so variants are not processed
again.

Image lookup is centralized in `src/utils/imageAssets.js`:

- `getEventPinImage(key)` for map pins and profile experience pins.
- `getEventPosterImage(key)` for the map pin to poster morph thumbnail. It
  prefers original source images first, then detail images, generated poster
  fallbacks, previews, and finally pin images.
- `getEventPreviewImage(key)` for cards, list images, and profile memory tiles.
- `getEventDetailImage(key)` for event detail media.
- `getEventImage(key)` remains as a backward-compatible alias to preview images.

`imageAssets.js` also keeps legacy keys such as `art-gallery`, `film-night`, and
`rooftop-jazz` so existing profile photo refs resolve to current generated event
images.

`MapScreen.js` uses `Image.prefetch()` as a remote-image optimization and also
mounts invisible offscreen poster/detail images to force local bundled asset
decode. This avoids the map poster preview looking soft until after the user has
visited an event detail page once.

Do not manually edit generated variants. Update the source image, then rerun
`npm run images:events`.

## Data Layer

The prototype uses local mock data, not a backend.

The mock database is normalized into event types, organizers, locations, events,
event images, users, friendships, saved events, event participations, and user
event experiences. Services compose these source records into UI-ready view
models. This keeps UI code stable while matching the shape of a future backend.

Data flow:

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
the current UI contract stable. Screens receive fields such as:

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

Saved state is represented by `mockUserSavedEvents`. Join state is represented
by `mockEventParticipations`; active participation means
`status === "registered"`. `joinEvent(id)` creates a participation relationship
when the event is joinable and is idempotent if the current user is already
registered.

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
light surfaces, custom event imagery, avatar stacks, native tabs, and
conditional Liquid Glass surfaces on supported iOS devices.

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
- Keep the poster preview visually simple unless intentionally reintroducing a
  new effect. Current desired state is a solid poster surface, a high-resolution
  poster image mounted from the start of the morphing overlay, and skeleton
  fallback only while that image is not ready.
- Regenerate event image variants with `npm run images:events` after adding or
  changing source event images.
- Prefer Expo-compatible dependencies. Add new dependencies only when they solve
  a concrete prototype requirement.

## Validation

For documentation-only changes:

```bash
git diff --check -- README.md
```

For code changes:

```bash
git diff --check
npm run lint
```

After changing event artwork:

```bash
npm run images:events
```

Manual smoke checks for meaningful app changes:

- open `/map`, confirm pins render and selecting a pin opens a sharp poster
  preview on the first attempt without visiting detail first;
- long-press a map pin and confirm expand/share/save actions appear in a usable
  position;
- open `/map/list`, confirm the two-column feed renders and saved state toggles;
- use Shake to Discover, confirm it redirects to the filtered list and the
  Discover Mode pill can dismiss the filter;
- open an event detail page, confirm the image, sheet, save, and join controls
  work;
- open `/profile`, check Attended/Going/Saved sections and list/map selectors.
