import {
  addCurrentUserParticipatingEvent,
  getCurrentUserRecord,
  toggleCurrentUserSavedEvent,
} from "../repositories/userRepository";

export async function getCurrentUser() {
  return getCurrentUserRecord();
}

export async function toggleSavedEvent(eventId) {
  return toggleCurrentUserSavedEvent(eventId);
}

export async function addParticipatingEvent(eventId) {
  return addCurrentUserParticipatingEvent(eventId);
}
