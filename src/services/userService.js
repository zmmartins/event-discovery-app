import { CURRENT_USER_ID, mockUsers } from "../data/mockUsers";

let users = mockUsers.map((user) => ({
  ...user,
  attendedExperienceIds: [...(user.attendedExperienceIds ?? [])],
  friendIds: [...(user.friendIds ?? [])],
  participatingEventIds: [...(user.participatingEventIds ?? [])],
  savedEventIds: [...(user.savedEventIds ?? [])],
}));

function cloneUser(user) {
  return {
    ...user,
    attendedExperienceIds: [...(user.attendedExperienceIds ?? [])],
    friendIds: [...(user.friendIds ?? [])],
    participatingEventIds: [...(user.participatingEventIds ?? [])],
    savedEventIds: [...(user.savedEventIds ?? [])],
  };
}

function getCurrentUserRecord() {
  return users.find((user) => user.id === CURRENT_USER_ID);
}

export async function getCurrentUser() {
  return cloneUser(getCurrentUserRecord());
}

export async function toggleSavedEvent(eventId) {
  const currentUser = getCurrentUserRecord();
  const savedEventIds = currentUser.savedEventIds ?? [];
  const isSaved = savedEventIds.includes(eventId);

  currentUser.savedEventIds = isSaved
    ? savedEventIds.filter((savedEventId) => savedEventId !== eventId)
    : [...savedEventIds, eventId];

  return {
    isSaved: !isSaved,
    user: cloneUser(currentUser),
  };
}

export async function addParticipatingEvent(eventId) {
  const currentUser = getCurrentUserRecord();
  const participatingEventIds = currentUser.participatingEventIds ?? [];

  if (!participatingEventIds.includes(eventId)) {
    currentUser.participatingEventIds = [...participatingEventIds, eventId];
  }

  return {
    isJoined: true,
    user: cloneUser(currentUser),
  };
}
