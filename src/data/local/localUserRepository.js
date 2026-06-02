import { CURRENT_USER_ID, mockUsers } from "../mockUsers";

// Local mock implementation of the user repository.
// This is the only layer that should import mockUsers directly.

function cloneUser(user) {
  if (!user) return null;

  return {
    ...user,
    attendedExperienceIds: [...(user.attendedExperienceIds ?? [])],
    friendIds: [...(user.friendIds ?? [])],
    participatingEventIds: [...(user.participatingEventIds ?? [])],
    savedEventIds: [...(user.savedEventIds ?? [])],
  };
}

let users = mockUsers.map(cloneUser);

function findCurrentUserRecord() {
  return users.find((user) => user.id === CURRENT_USER_ID);
}

export async function getCurrentUserRecord() {
  return cloneUser(findCurrentUserRecord());
}

export async function getUserById(id) {
  const user = users.find((nextUser) => nextUser.id === id);

  return cloneUser(user);
}

export async function updateCurrentUser(updater) {
  let updatedUser = null;

  users = users.map((user) => {
    if (user.id !== CURRENT_USER_ID) return user;

    const nextUser = updater(cloneUser(user));
    updatedUser = cloneUser(nextUser);

    return updatedUser;
  });

  return cloneUser(updatedUser);
}

export async function toggleCurrentUserSavedEvent(eventId) {
  const updatedUser = await updateCurrentUser((currentUser) => {
    const savedEventIds = currentUser.savedEventIds ?? [];
    const isSaved = savedEventIds.includes(eventId);

    return {
      ...currentUser,
      savedEventIds: isSaved
        ? savedEventIds.filter((savedEventId) => savedEventId !== eventId)
        : [...savedEventIds, eventId],
    };
  });

  return {
    isSaved: Boolean(updatedUser?.savedEventIds?.includes(eventId)),
    user: updatedUser,
  };
}

export async function addCurrentUserParticipatingEvent(eventId) {
  const updatedUser = await updateCurrentUser((currentUser) => {
    const participatingEventIds = currentUser.participatingEventIds ?? [];

    if (participatingEventIds.includes(eventId)) {
      return currentUser;
    }

    return {
      ...currentUser,
      participatingEventIds: [...participatingEventIds, eventId],
    };
  });

  return {
    isJoined: true,
    user: updatedUser,
  };
}
