import { rankEventsByDiscoveryDistance } from "../domain/discovery/discoveryRanking";
import { DEFAULT_DISCOVER_COORDINATE } from "../domain/events/geo";
import { filterEventsByCategory } from "../domain/events/eventSelectors";
import {
  EVENT_AVAILABILITY,
  EVENT_STATUS,
  PARTICIPATION_STATUS,
  createEventViewModel,
  getEventAvailability,
  getUserActiveParticipation,
} from "../domain/events/eventState";
import { listExperienceRecords } from "../repositories/profileRepository";
import {
  createEventParticipationRecord,
  createUserSavedEventRecord,
  deleteUserSavedEventRecord,
  disableActiveParticipationRecordsForEvent,
  getEventRecord,
  listEventImageRecords,
  listEventParticipationRecords,
  listEventRecords,
  listEventTypeRecords,
  listLocationRecords,
  listOrganizerRecords,
  listUserSavedEventRecords,
} from "../repositories/eventRepository";
import {
  getCurrentUserRecord,
  listFriendshipRecords,
  listUserRecords,
} from "../repositories/userRepository";

export { DEFAULT_DISCOVER_COORDINATE };

function createRecordMap(records = []) {
  return new Map(records.map((record) => [record.id, record]));
}

const UPCOMING_EVENT_AVAILABILITIES = new Set([
  EVENT_AVAILABILITY.available,
  EVENT_AVAILABILITY.soldOut,
]);

function getSortableEventTime(event) {
  const startsAtTime = new Date(event?.startsAt).getTime();

  return Number.isNaN(startsAtTime) ? Number.POSITIVE_INFINITY : startsAtTime;
}

function compareEventsByStartTime(firstEvent, secondEvent) {
  const timeDelta = getSortableEventTime(firstEvent) - getSortableEventTime(secondEvent);

  if (timeDelta !== 0) return timeDelta;

  return String(firstEvent?.id ?? "").localeCompare(String(secondEvent?.id ?? ""));
}

function isUpcomingEventRecord(event, participations = [], now = new Date()) {
  if (!event || event.status !== EVENT_STATUS.published) {
    return false;
  }

  const availability = getEventAvailability(event, participations, now);

  return UPCOMING_EVENT_AVAILABILITIES.has(availability);
}

function filterUpcomingEventRecords(events = [], participations = [], now = new Date()) {
  return events
    .filter((event) => isUpcomingEventRecord(event, participations, now))
    .sort(compareEventsByStartTime);
}

async function getEventCompositionData() {
  const currentUser = await getCurrentUserRecord();
  const [
    users,
    friendships,
    events,
    eventTypes,
    organizers,
    locations,
    images,
    participations,
    savedEvents,
    experiences,
  ] = await Promise.all([
    listUserRecords(),
    listFriendshipRecords(),
    listEventRecords(),
    listEventTypeRecords(),
    listOrganizerRecords(),
    listLocationRecords(),
    listEventImageRecords(),
    listEventParticipationRecords(),
    listUserSavedEventRecords(),
    listExperienceRecords(),
  ]);

  return {
    currentUser,
    events,
    eventTypes,
    eventTypesById: createRecordMap(eventTypes),
    experiences,
    friendships,
    images,
    locations,
    locationsById: createRecordMap(locations),
    organizers,
    organizersById: createRecordMap(organizers),
    participations,
    savedEvents,
    users,
  };
}

function createEventViewModelFromRecord(event, data, now = new Date()) {
  return createEventViewModel({
    currentUser: data.currentUser,
    event,
    eventType: data.eventTypesById.get(event.eventTypeId),
    experiences: data.experiences,
    friendships: data.friendships,
    images: data.images,
    location: data.locationsById.get(event.locationId),
    now,
    organizer: data.organizersById.get(event.organizerId),
    participations: data.participations,
    savedEvents: data.savedEvents,
    users: data.users,
  });
}

export async function getEvents() {
  const data = await getEventCompositionData();
  const now = new Date();

  return data.events.map((event) => createEventViewModelFromRecord(event, data, now));
}

export async function getUpcomingEvents() {
  const data = await getEventCompositionData();
  const now = new Date();
  const upcomingEvents = filterUpcomingEventRecords(
    data.events,
    data.participations,
    now
  );

  return upcomingEvents.map((event) =>
    createEventViewModelFromRecord(event, data, now)
  );
}

export async function getEventById(id) {
  const data = await getEventCompositionData();
  const event = data.events.find((nextEvent) => nextEvent.id === id);

  return event ? createEventViewModelFromRecord(event, data) : null;
}

export async function getEventsByCategory(category) {
  const events = await getUpcomingEvents();

  return filterEventsByCategory(events, category);
}

export async function joinEvent(id) {
  const currentUser = await getCurrentUserRecord();
  const data = await getEventCompositionData();
  const event = data.events.find((nextEvent) => nextEvent.id === id);

  if (!currentUser || !event) {
    return null;
  }

  const availability = getEventAvailability(event, data.participations);

  if (event.status === EVENT_STATUS.canceled) {
    await disableActiveParticipationRecordsForEvent(id, "event_canceled");
    return getEventById(id);
  }

  if (availability !== EVENT_AVAILABILITY.available) {
    return getEventById(id);
  }

  const existingParticipation = getUserActiveParticipation(
    data.participations,
    id,
    currentUser.id
  );

  if (!existingParticipation) {
    await createEventParticipationRecord({
      attendedAt: null,
      canceledAt: null,
      disabledAt: null,
      disabledReason: null,
      eventId: id,
      id: `participation-${currentUser.id}-${id}-${Date.now()}`,
      registeredAt: new Date().toISOString(),
      status: PARTICIPATION_STATUS.registered,
      userId: currentUser.id,
    });
  }

  return getEventById(id);
}

export async function toggleSavedEvent(id) {
  const [currentUser, eventRecord, savedEvents] = await Promise.all([
    getCurrentUserRecord(),
    getEventRecord(id),
    listUserSavedEventRecords(),
  ]);

  if (!currentUser || !eventRecord) {
    return null;
  }

  const existingSave = savedEvents.find(
    (record) => record.userId === currentUser.id && record.eventId === id
  );

  if (existingSave) {
    await deleteUserSavedEventRecord(currentUser.id, id);
  } else {
    await createUserSavedEventRecord({
      eventId: id,
      id: `saved-${currentUser.id}-${id}-${Date.now()}`,
      savedAt: new Date().toISOString(),
      userId: currentUser.id,
    });
  }

  return getEventById(id);
}

export async function getDiscoverEvents({
  latitude = DEFAULT_DISCOVER_COORDINATE.latitude,
  limit = 4,
  longitude = DEFAULT_DISCOVER_COORDINATE.longitude,
} = {}) {
  const events = await getUpcomingEvents();
  const origin = { latitude, longitude };

  return rankEventsByDiscoveryDistance(events, origin).slice(0, limit);
}
