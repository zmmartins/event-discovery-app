import {
  CURRENT_USER_ID,
  mockFriendships,
  mockUsers,
} from "../mockUsers";

// Local mock implementation of the user repository.
// This is the only user-data layer that should import mockUsers directly.

function cloneRecord(record) {
  if (!record) return null;

  return JSON.parse(JSON.stringify(record));
}

let users = mockUsers.map(cloneRecord);
let friendships = mockFriendships.map(cloneRecord);

function findCurrentUserRecord() {
  return users.find((user) => user.id === CURRENT_USER_ID);
}

export async function listUserRecords() {
  return users.map(cloneRecord);
}

export async function getCurrentUserRecord() {
  return cloneRecord(findCurrentUserRecord());
}

export async function getUserById(id) {
  const user = users.find((nextUser) => nextUser.id === id);

  return cloneRecord(user);
}

export async function updateCurrentUser(updater) {
  let updatedUser = null;

  users = users.map((user) => {
    if (user.id !== CURRENT_USER_ID) return user;

    const nextUser = updater(cloneRecord(user));
    updatedUser = cloneRecord(nextUser);

    return updatedUser;
  });

  return cloneRecord(updatedUser);
}

export async function listFriendshipRecords() {
  return friendships.map(cloneRecord);
}
