import { mockEvents } from "../mockEvents";

// Local mock implementation of the event repository.
// This is the only layer that should import mockEvents directly.

function cloneEvent(event) {
  if (!event) return null;

  return {
    ...event,
    attendingFriends: (event.attendingFriends ?? []).map((friend) => ({ ...friend })),
    friendsGoing: [...(event.friendsGoing ?? [])],
    friendsWentBefore: [...(event.friendsWentBefore ?? [])],
  };
}

let events = mockEvents.map(cloneEvent);

export async function listEvents() {
  return events.map(cloneEvent);
}

export async function getEvent(id) {
  const event = events.find((nextEvent) => nextEvent.id === id);

  return cloneEvent(event);
}

export async function patchEvent(id, patch) {
  events = events.map((event) =>
    event.id === id ? cloneEvent({ ...event, ...patch }) : event
  );

  return getEvent(id);
}
