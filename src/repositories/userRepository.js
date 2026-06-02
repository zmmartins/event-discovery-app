// Repository boundary for user data.
// Currently backed by local mock data; replace these exports with API-backed implementations later.

export {
  getCurrentUserRecord,
  getUserById,
  listFriendshipRecords,
  listUserRecords,
  updateCurrentUser,
} from "../data/local/localUserRepository";
