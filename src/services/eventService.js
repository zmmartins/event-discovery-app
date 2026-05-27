import { mockEvents } from "../data/mockEvents";
import {
  addParticipatingEvent,
  getCurrentUser,
  toggleSavedEvent as toggleUserSavedEvent,
} from "./userService";

let events = [...mockEvents];

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

export async function getDiscoverEvents() {
  const decoratedEvents = await getEvents();

  return [...decoratedEvents].sort(() => 0.5 - Math.random()).slice(0, 3);
}
