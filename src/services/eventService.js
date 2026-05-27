import { mockEvents } from "../data/mockEvents";
import {
  addParticipatingEvent,
  getCurrentUser,
  toggleSavedEvent as toggleUserSavedEvent,
} from "./userService";

export const DEFAULT_DISCOVER_COORDINATE = {
  latitude: 38.7223,
  longitude: -9.1393,
};

let events = [...mockEvents];

function getDistanceInKm(firstCoordinate, secondCoordinate) {
  const earthRadiusKm = 6371;
  const latitudeDelta =
    ((secondCoordinate.latitude - firstCoordinate.latitude) * Math.PI) / 180;
  const longitudeDelta =
    ((secondCoordinate.longitude - firstCoordinate.longitude) * Math.PI) / 180;
  const firstLatitude = (firstCoordinate.latitude * Math.PI) / 180;
  const secondLatitude = (secondCoordinate.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function decorateEvent(event, user) {
  if (!event) return event;

  return {
    ...event,
    isJoined:
      Boolean(event.isJoined) || user.participatingEventIds.includes(event.id),
    isSaved: user.savedEventIds.includes(event.id),
  };
}

export async function getEvents() {
  const currentUser = await getCurrentUser();

  return events.map((event) => decorateEvent(event, currentUser));
}

export async function getEventById(id) {
  const currentUser = await getCurrentUser();
  const event = events.find((nextEvent) => nextEvent.id === id);

  return decorateEvent(event, currentUser);
}

export async function getEventsByCategory(category) {
  const decoratedEvents = await getEvents();

  if (!category || category === "All") {
    return decoratedEvents;
  }

  return decoratedEvents.filter((event) => event.category === category);
}

export async function joinEvent(id) {
  await addParticipatingEvent(id);

  events = events.map((event) =>
    event.id === id ? { ...event, isJoined: true } : event,
  );

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

  return [...decoratedEvents]
    .map((event) => ({
      event,
      ranking:
        getDistanceInKm(origin, {
          latitude: event.latitude,
          longitude: event.longitude,
        }) + Math.random() * 0.35,
    }))
    .sort((firstEvent, secondEvent) => firstEvent.ranking - secondEvent.ranking)
    .slice(0, limit)
    .map(({ event }) => event);
}
