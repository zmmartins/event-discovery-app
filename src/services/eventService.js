import { rankEventsByDiscoveryDistance } from "../domain/discovery/discoveryRanking";
import { DEFAULT_DISCOVER_COORDINATE } from "../domain/events/geo";
import { filterEventsByCategory } from "../domain/events/eventSelectors";
import {
  decorateEventForUser,
  decorateEventsForUser,
} from "../domain/events/eventState";
import {
  getEvent,
  listEvents,
  patchEvent,
} from "../repositories/eventRepository";
import {
  addParticipatingEvent,
  getCurrentUser,
  toggleSavedEvent as toggleUserSavedEvent,
} from "./userService";

export { DEFAULT_DISCOVER_COORDINATE };

export async function getEvents() {
  const [currentUser, events] = await Promise.all([
    getCurrentUser(),
    listEvents(),
  ]);

  return decorateEventsForUser(events, currentUser);
}

export async function getEventById(id) {
  const [currentUser, event] = await Promise.all([
    getCurrentUser(),
    getEvent(id),
  ]);

  return decorateEventForUser(event, currentUser);
}

export async function getEventsByCategory(category) {
  const decoratedEvents = await getEvents();

  return filterEventsByCategory(decoratedEvents, category);
}

export async function joinEvent(id) {
  await addParticipatingEvent(id);
  await patchEvent(id, { isJoined: true });

  return getEventById(id);
}

export async function toggleSavedEvent(id) {
  await toggleUserSavedEvent(id);

  return getEventById(id);
}

export async function getDiscoverEvents({
  latitude = DEFAULT_DISCOVER_COORDINATE.latitude,
  limit = 4,
  longitude = DEFAULT_DISCOVER_COORDINATE.longitude,
} = {}) {
  const decoratedEvents = await getEvents();
  const origin = { latitude, longitude };

  return rankEventsByDiscoveryDistance(decoratedEvents, origin).slice(0, limit);
}
