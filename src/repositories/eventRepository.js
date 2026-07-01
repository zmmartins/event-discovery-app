// Repository boundary for event data.
// Currently backed by local mock data; replace these exports with API-backed implementations later.

export {
  createEventParticipationRecord,
  createUserSavedEventRecord,
  deleteUserSavedEventRecord,
  disableActiveParticipationRecordsForEvent,
  getEvent,
  getEventParticipationRecord,
  getEventRecord,
  listEventImageRecords,
  listEventParticipationRecords,
  listEventRecords,
  listEvents,
  listEventTypeRecords,
  listLocationRecords,
  listOrganizerRecords,
  listUserSavedEventRecords,
  patchEvent,
  patchEventParticipationRecord,
  patchEventRecord
} from "../data/local/localEventRepository";

