import {
  getCurrentUserRecord,
  listFriendshipRecords,
  listUserRecords,
} from "../repositories/userRepository";

export async function getCurrentUser() {
  return getCurrentUserRecord();
}

export async function getUsers() {
  return listUserRecords();
}

export async function getFriendships() {
  return listFriendshipRecords();
}
