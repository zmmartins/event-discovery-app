# Event Discovery App

Mobile-first event discovery prototype for the course **Interactive Multimedia
Applications 2025/2026**.

The app explores a social local-event discovery experience built around map
exploration, image-led browsing, friend context, a cultural-passport profile,
shake-to-discover, location awareness, haptic feedback, and interaction logging
for usability testing.

This is currently a native-focused Expo prototype. It uses local mock data,
bundled image assets, generated image variants, and repository/service
boundaries shaped like a future backend integration, but it does not connect to
a real backend yet.

## Current State

- Expo SDK 54, React Native 0.81, React 19, Expo Router 6.
- JavaScript for app implementation, with TS/TSX route and layout files.
- Primary validation target is iOS or Android. The app imports
  `react-native-maps`, so the Expo web target is not treated as ready.
- The tab shell uses Expo Router native tabs, with conditional Liquid Glass
  surfaces on supported iOS devices and fallback surfaces elsewhere.
- Explore routes are wrapped in `DiscoveryModeProvider` and `AppShell`, which
  adds the top explore navigation on map, list, and shake-discover surfaces.
- Data is local and in-memory. Saved and participation state can mutate during a
  session, but resets when the JavaScript runtime reloads.
- Seed data currently includes 16 published events dated from May 22, 2026 to
  August 9, 2026 across international mock venues, 6 event types, 7 mock users,
  friendships, active participations, an initially empty saved-events
  collection, and profile experience records.
- The current user's attended profile records use dedicated memory-photo assets
  from `src/assets/experiences`; friend history can reuse event image keys for
  social context.
- `getUpcomingEvents()` filters seed events by the current runtime date,
  lifecycle status, capacity, and participation state, so the visible Explore
  set changes as the mock event dates pass.
- The default map region and Discovery Mode origin are Lisbon, Portugal.
- There is no authentication, real API, payments, ticketing, push
  notifications, chat, event publishing flow, or image upload flow.

Implemented app surfaces:

- Native tab shell with Explore, Messages, Search, Community, and Profile tabs.
- Explore stack with map, list, shake-discover, and notifications routes.
- Map discovery with Google Maps, user-aware initial focus, custom event pins,
  user location, morphing event preview, Discovery Mode side borders, and
  long-press pin actions.
- List discovery with an upcoming-events masonry feed, card save controls, and
  long-press card actions.
- Event detail screen with generated detail media, a draggable sheet,
  interactive mini map, social context, save, join, and cancel-attendance
  controls, haptics, and logging.
- Profile screen with Attended, Going, and Saved sections, section-specific
  list/map selectors, attended memory-ticket cards, attended map pins, and
  upcoming/saved event feeds or empty states.
- Shake to Discover with accelerometer detection, vibration, haptics, a styled
  discovery circle, Discovery Mode activation, and redirect to the filtered
  list.
- Placeholder Messages, Search, Community, and Notifications screens.
- Interaction logging stored in AsyncStorage with JSON, CSV, bundle, file, and
  share helpers.

## Tech Stack

- Expo and Expo CLI
- Expo Router
- Expo Router native tabs
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
- Expo Linear Gradient
- Expo FileSystem and Sharing
- Expo Splash Screen
- Expo Status Bar
- Expo System UI
- Expo Updates
- React Native Masked View
- React Native SVG
- Sharp for local image variant generation
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
boundaries, so `knip.json` ignores unused-export reports for those files while
still reporting other unused-code/dependency issues.

The `web` script exists because this is an Expo project, but the current app is
native-first and should be validated on iOS or Android.

Clear the Expo cache:

```bash
npx expo start -c
```

Tunnel mode can help when a physical device cannot reach the local development
server:

```bash
npx expo start --tunnel
```

### Known Local Startup Issue

On this local setup, `npx expo start -c` has previously failed under Node
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

- sets the app name, slug, version, portrait orientation, scheme, light UI
  style, and new architecture flag;
- uses `assets/images/icon.png` for the Expo icon, Android adaptive icon
  foreground/monochrome image, web favicon, and splash image;
- sets the iOS bundle identifier to `com.eventdiscovery.app`;
- configures iOS location usage copy and non-exempt encryption metadata;
- enables Android edge-to-edge rendering and disables Android predictive back
  gesture handling;
- configures `expo-splash-screen`;
- enables typed routes and the React compiler experiment.

`app.config.js` currently:

- keeps the iOS bundle identifier and Android package aligned as
  `com.eventdiscovery.app`;
- injects iOS and Android foreground-location permission configuration;
- reads native Google Maps keys from environment variables;
- ensures the `expo-font` plugin is present.

Google Maps API keys for native builds:

```bash
GOOGLE_MAPS_IOS_API_KEY=...
GOOGLE_MAPS_ANDROID_API_KEY=...
```

Lisbon is the default discovery origin and generic fallback region. The Explore
map prefers the current user location when available; if location is unavailable
it falls back to visible event coordinates before using the Lisbon region.

## Routing

Expo Router is the navigation system. Route files stay thin and import screen
implementations from `src/screens`.

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

## Feature Notes

### Explore Map

`MapScreen.js` renders a full-screen Google-provider `MapView` using
`APP_MAP_STYLE`.

Current behavior:

- upcoming events load through `getUpcomingEvents()`;
- Discovery Mode filters the map to the selected event IDs when active;
- event pins render through `EventPin` as custom marker children;
- pin size, z-index, and marker order are based on event popularity;
- friend presence adds a secondary-accent ring around pins;
- `tracksViewChanges` remains enabled only until each pin image loads;
- overlapping taps and long presses are resolved with screen-space hit testing;
- pin taps center the map and open a `MorphingEventPreview` overlay;
- preview geometry is measured from native map projections with a viewport
  fallback;
- long-pressing a pin opens `EventPinActionMenu` with expand, share, and save
  actions;
- expand navigates to event detail, save toggles local saved state, and share is
  currently a logged placeholder action;
- local poster/detail images are warmed offscreen so the first preview opens
  with sharp assets;
- foreground location is requested through `locationService.js`;
- initial map focus recalculates on screen focus: regular mode centers on the
  user and zooms to include the nearest visible event, while Discovery Mode
  centers on the user and zooms to include all four recommendations;
- if user location is unavailable, initial focus uses a stable random visible
  event in regular mode or a stable random recommendation in Discovery Mode;
- the location status control shows Lisbon, locating, or near-you state and can
  recenter the map when location is available;
- Discovery Mode adds full-height green side borders and a dismissible pill.

### List

`ListScreen.js` renders the upcoming event feed through `EventCard`.

Current behavior:

- upcoming events load through `getUpcomingEvents()`;
- Discovery Mode filters and orders the list when active;
- the feed uses a `ScrollView` with two independently rendered columns;
- cards use generated preview images with ratio-based heights clamped by
  `EventCard`;
- tapping the image or title/date block opens event detail;
- tapping the bookmark toggles local saved state without opening detail;
- attendee stacks show friend avatars;
- long-pressing a card opens `EventCardActionMenu`;
- card actions support expand, save, and a logged share placeholder.

### Event Detail

`EventDetailScreen.js` loads by `/event/[id]`.

Current behavior:

- generated detail-size media from `src/assets/events/details`;
- a draggable detail sheet with collapsed and expanded states;
- date, time, category, description, location, friends, and prototype reviews;
- save/bookmark control with haptic feedback;
- participation actions through `joinEvent(id)` and
  `cancelEventParticipation(id)`;
- live Google-provider mini map styled with `APP_MAP_STYLE`;
- custom event-location pin, optional current-user location marker, and an
  icon-only recenter button;
- one-finger drags over the mini map move the detail sheet, while two-finger
  pan and pinch gestures control the mini map;
- interaction logging for detail opening, back, sheet movement, save, join, and
  cancel.

Some supporting content is intentionally prototype-grade, including the
review-card copy.

### Profile

`ProfileScreen.js` composes the current user's profile through
`profileService.js`.

Current behavior:

- full-screen avatar/hero background with a draggable blurred profile sheet;
- profile summary with display name, username, and derived stats;
- Attended, Going, and Saved sections with counts;
- per-section list/map selector;
- Attended list cards from explicit profile experience records;
- attended cards use `ProfileExperienceCard`, a single masked ticket body with
  SVG-clipped side notches and bottom perforations, an image-to-dark gradient,
  save/details controls, and haptic/logged interactions;
- attended memory media supports mosaic grid mode, full-image mode, vertical
  dash rail selection, and an expanded image modal;
- Attended map using `ExperiencePin` and random memory photos from each
  experience;
- Going and Saved list views render two-column `EventCard` feeds when records
  exist and empty states otherwise;
- Going and Saved map views are placeholder states for now.

### Shake To Discover

`ShakeDiscoverScreen.js` and `useShakeToDiscover.js` use the accelerometer to
detect shaking.

Current behavior:

- accelerometer updates run at 80ms intervals;
- shake detection triggers vibration, a light haptic on completion, and
  interaction logging;
- the screen shows a centered secondary-accent circle with inset and external
  shadows, plus the "SHAKE YOUR PHONE" copy;
- while processing, the screen shows `DISCOVERING`;
- completion activates Discovery Mode and redirects to `/map/list`.

Discovery Mode selects four upcoming events ranked by distance from the default
Lisbon discovery coordinate, with a small random tie-breaker. Map and list
screens filter to that ordered set until the Discover Mode pill is dismissed.

### Placeholder Screens

Messages, Search, Community, and Notifications currently render
`PlaceholderScreen` and log screen-open events.

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
src/assets/experiences/       Dedicated profile memory photo assets
src/components/               Reusable UI components
src/context/                  Discovery Mode context
src/data/                     Mock source records and local data adapters
src/data/local/               Local in-memory repository implementations
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
- `EventCardActionMenu.js`
- `EventPin.js`
- `EventPinActionMenu.js`
- `ExperiencePin.js`
- `MorphingEventPreview.js`
- `MorphingPreviewBackdrop.js`
- `ProfileExperienceCard.js`
- `ScreenStatusBar.js`
- `PlaceholderScreen.js`

Repository-structure helpers:

- `.structignore` configures the local `project-tree` command so tree output
  stays focused on source files as generated assets, native folders, caches,
  and tooling files grow.
- `list_project_structure.py` is a standalone legacy tree printer with
  hardcoded ignores. It does not read `.structignore`.

## Event And Experience Image Assets

Source event images live directly under `src/assets/events`. Generated variants
live in:

- `src/assets/events/pins`: 160x160 JPG square crops for map marker snapshots.
- `src/assets/events/posters`: 1200x1200 JPG square crops used as morph-poster
  fallbacks.
- `src/assets/events/previews`: JPG images resized to fit within 900px on the
  longest side for cards, lists, and profile memories.
- `src/assets/events/details`: JPG images resized to fit within 1600px on the
  longest side for event detail media.

Dedicated profile memory photos live under `src/assets/experiences` and are
referenced by `mockUserEventExperiences`. They are not regenerated by
`npm run images:events`.

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

- `getEventPinImage(key)` for map pins and profile experience pins, with
  dedicated experience photos preferred when the key is a memory photo ref.
- `getEventPosterImage(key)` for the map pin-to-poster morph thumbnail,
  preferring source/detail assets before square poster fallbacks.
- `getEventPreviewImage(key)` for cards, list images, and profile memory tiles,
  with dedicated experience photos preferred when available.
- `getEventDetailImage(key)` for event detail media.
- `getEventImage(key)` as a backward-compatible alias to preview images.
- `getAvatarImage(key)` for bundled mock avatars.

`imageAssets.js` also keeps legacy keys such as `art-gallery`, `film-night`,
and `rooftop-jazz` so older profile photo refs still resolve.

Do not manually edit generated event variants. Update the source event image,
then rerun `npm run images:events`. Experience PNGs are separate profile assets.

## Data Layer

The prototype uses local mock data, not a backend.

The mock database is normalized into event types, organizers, locations, events,
event images, users, friendships, saved events, event participations, and user
event experiences. Services compose these source records into UI-ready view
models so screens stay close to a future API shape.

Data flow:

- `src/data/mockEvents.js` contains event-domain source records:
  `mockEventTypes`, `mockOrganizers`, `mockLocations`, `mockEvents`,
  `mockEventImages`, `mockEventParticipations`, and `mockUserSavedEvents`.
- `src/data/mockUsers.js` contains user-domain source records:
  `mockUsers`, `mockFriendships`, and `mockUserEventExperiences`, including
  profile memory photo refs.
- `src/data/local/*Repository.js` contains local in-memory repository
  implementations and is the only app layer that should import mock records
  directly.
- `src/repositories/*Repository.js` is the replaceable data-access facade.
- `src/services/*Service.js` contains application/use-case functions consumed
  by screens and components.
- `src/domain/` contains pure helpers for event state, event formatting,
  discovery ranking, geo distance, and profile aggregation.

Screens and components should call services or receive props. They should not
import mock records directly.

Source event records store backend-like fields such as `eventTypeId`,
`organizerId`, `locationId`, `startsAt`, `endsAt`, structured `price`,
`maximumCapacity`, lifecycle `status`, and `popularity`. Rendering conveniences
such as category names, organizer names, location labels, coordinates, image
keys, friend context, saved state, joined state, and availability are composed
by `eventService.js` and domain helpers.

`eventService.js` exposes:

```js
getEvents();
getUpcomingEvents();
getEventById(id);
getEventsByCategory(category);
joinEvent(id);
cancelEventParticipation(id);
toggleSavedEvent(id);
getDiscoverEvents(options);
```

Events store lifecycle status as `draft`, `published`, or `canceled`.
Availability is computed as `available`, `sold_out`, `canceled`, or
`already_happened` from lifecycle status, current time, active participation
count, and `maximumCapacity`.

Saved state is represented by `mockUserSavedEvents`, which is currently seeded
empty and grows or shrinks in memory when the current user toggles saves. Join
state is represented by `mockEventParticipations`; active participation means
`status === "registered"`. `joinEvent(id)` creates a participation relationship
when the event is joinable and is idempotent if the current user is already
registered. `cancelEventParticipation(id)` patches the current user's active
participation to `canceled`.

`profileService.js` composes profile experiences from normalized user event
experience records, event view models, friendship records, and the full event
list. Profile sections are derived as:

- `attended`: explicit user event experience records with memory photo refs,
  including dedicated experience photos for the current user's profile.
- `going`: future visible events where the current user is registered.
- `saved`: future visible events saved by the current user.

Only attended events currently produce profile map pins.

## Interaction Logging

Interaction logs live in `src/services/interactionLogService.js`.

The logger records session metadata, route/screen/action data,
event/task/source metadata, location metadata when available, action
categories, elapsed time, and sequence number.

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
- image-led two-column browsing in list views;
- event-centered social proof;
- real map context on both Explore and Event Detail surfaces;
- compact mobile-first layouts;
- large touch targets;
- high-contrast active states;
- haptics for meaningful interactions;
- Discovery Mode as a visually distinct state.

## Current Limitations

- Messages, Search, Community, and Notifications are placeholders.
- Filter and share actions are logged placeholders.
- There is no real backend; save, join, and cancel mutations reset on reload.
- Going and Saved profile map views are placeholders.
- Event detail review copy is placeholder text, and the mini map does not yet
  expose external directions or deep-link map actions.
- Web is not a supported validation target for the current map-heavy route
  graph.
- There is no dedicated in-app screen for viewing or exporting interaction
  logs, even though the service supports exports.

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
- Do not store computed `availability`, `isSaved`, or `isJoined` on source
  event records.
- Use Expo Router APIs such as `useRouter`, `router.push`, `router.replace`,
  and `useLocalSearchParams`.
- Do not use React Navigation screen props in app screens.
- Keep interaction logging wired through `interactionLogService`.
- Regenerate event image variants with `npm run images:events` after adding or
  changing source event images.
- Prefer Expo-compatible dependencies. Add new dependencies only when they
  solve a concrete prototype requirement.

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

- open `/map`, confirm pins render and selecting a pin opens the poster preview;
- long-press a map pin and confirm expand/share/save actions appear in a usable
  position;
- open `/map/list`, confirm the two-column feed renders and saved state toggles;
- long-press a list card and confirm the card action menu appears;
- use Shake to Discover, confirm it redirects to the filtered list and the
  Discover Mode pill can dismiss the filter;
- open an event detail page, confirm the image, sheet, save, and join controls
  work;
- open `/profile`, check Attended/Going/Saved sections and list/map selectors.
