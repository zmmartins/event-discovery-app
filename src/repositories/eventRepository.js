// Repository boundary for event data.
// Currently backed by local mock data; replace these exports with API-backed implementations later.

export {
  getEvent,
  listEvents,
  patchEvent,
} from "../data/local/localEventRepository";
