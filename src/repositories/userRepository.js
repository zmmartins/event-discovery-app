// Repository boundary for user data.
// Currently backed by local mock data; replace these exports with API-backed implementations later.

export {
  addCurrentUserParticipatingEvent,
  getCurrentUserRecord,
  getUserById,
  toggleCurrentUserSavedEvent,
  updateCurrentUser,
} from "../data/local/localUserRepository";
