import { mockEvents } from "../data/mockEvents";

let events = [...mockEvents];

export async function getEvents() {
  return events;
}

export async function getEventById(id) {
  return events.find((event) => event.id === id);
}

export async function getEventsByCategory(category) {
  if (!category || category === "All") {
    return events;
  }

  return events.filter((event) => event.category === category);
}

export async function joinEvent(id) {
  events = events.map((event) =>
    event.id === id ? { ...event, isJoined: true } : event,
  );

  return getEventById(id);
}

export async function getDiscoverEvents() {
  return [...events].sort(() => 0.5 - Math.random()).slice(0, 3);
}
