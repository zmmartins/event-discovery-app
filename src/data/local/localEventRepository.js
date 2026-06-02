import { PARTICIPATION_STATUS } from "../../domain/events/eventState";
import {
  mockEventImages,
  mockEventParticipations,
  mockEventTypes,
  mockEvents,
  mockLocations,
  mockOrganizers,
  mockUserSavedEvents,
} from "../mockEvents";

// Local mock implementation of the event repository.
// This is the only event-data layer that should import mockEvents directly.

function cloneRecord(record) {
  if (!record) return null;

  return JSON.parse(JSON.stringify(record));
}

let events = mockEvents.map(cloneRecord);
let eventTypes = mockEventTypes.map(cloneRecord);
let organizers = mockOrganizers.map(cloneRecord);
let locations = mockLocations.map(cloneRecord);
let eventImages = mockEventImages.map(cloneRecord);
let participations = mockEventParticipations.map(cloneRecord);
let savedEvents = mockUserSavedEvents.map(cloneRecord);

export async function listEventRecords() {
  return events.map(cloneRecord);
}

export async function getEventRecord(id) {
  const event = events.find((nextEvent) => nextEvent.id === id);

  return cloneRecord(event);
}

export async function patchEventRecord(id, patch) {
  let updatedEvent = null;

  events = events.map((event) => {
    if (event.id !== id) return event;

    updatedEvent = cloneRecord({ ...event, ...patch });
    return updatedEvent;
  });

  return cloneRecord(updatedEvent);
}

export async function listEventTypeRecords() {
  return eventTypes.map(cloneRecord);
}

export async function listOrganizerRecords() {
  return organizers.map(cloneRecord);
}

export async function listLocationRecords() {
  return locations.map(cloneRecord);
}

export async function listEventImageRecords() {
  return eventImages.map(cloneRecord);
}

export async function listEventParticipationRecords() {
  return participations.map(cloneRecord);
}

export async function getEventParticipationRecord(id) {
  const participation = participations.find(
    (nextParticipation) => nextParticipation.id === id
  );

  return cloneRecord(participation);
}

export async function createEventParticipationRecord(data) {
  const participation = cloneRecord(data);

  participations = [...participations, participation];

  return cloneRecord(participation);
}

export async function patchEventParticipationRecord(id, patch) {
  let updatedParticipation = null;

  participations = participations.map((participation) => {
    if (participation.id !== id) return participation;

    updatedParticipation = cloneRecord({ ...participation, ...patch });
    return updatedParticipation;
  });

  return cloneRecord(updatedParticipation);
}

export async function disableActiveParticipationRecordsForEvent(eventId, reason) {
  const disabledAt = new Date().toISOString();
  const updatedParticipations = [];

  participations = participations.map((participation) => {
    if (
      participation.eventId !== eventId ||
      participation.status !== PARTICIPATION_STATUS.registered
    ) {
      return participation;
    }

    const updatedParticipation = {
      ...participation,
      disabledAt,
      disabledReason: reason,
      status: PARTICIPATION_STATUS.disabledEventCanceled,
    };

    updatedParticipations.push(cloneRecord(updatedParticipation));
    return updatedParticipation;
  });

  return updatedParticipations;
}

export async function listUserSavedEventRecords() {
  return savedEvents.map(cloneRecord);
}

export async function createUserSavedEventRecord(data) {
  const savedEvent = cloneRecord(data);

  savedEvents = [...savedEvents, savedEvent];

  return cloneRecord(savedEvent);
}

export async function deleteUserSavedEventRecord(userId, eventId) {
  const existingSave = savedEvents.find(
    (savedEvent) => savedEvent.userId === userId && savedEvent.eventId === eventId
  );

  savedEvents = savedEvents.filter(
    (savedEvent) => savedEvent.userId !== userId || savedEvent.eventId !== eventId
  );

  return cloneRecord(existingSave);
}

export async function listEvents() {
  return listEventRecords();
}

export async function getEvent(id) {
  return getEventRecord(id);
}

export async function patchEvent(id, patch) {
  return patchEventRecord(id, patch);
}
