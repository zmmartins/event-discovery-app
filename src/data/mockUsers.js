export const CURRENT_USER_ID = "user-001";

export const mockUsers = [
  {
    id: CURRENT_USER_ID,
    username: "jose_lisboa",
    name: "Jose Pereira",
    avatarKey: "joao",
    friendIds: ["ana", "miguel", "rita", "clara", "ines", "joao"],
    attendedExperienceIds: [
      "experience-001",
      "experience-002",
      "experience-003",
      "experience-004",
    ],
    savedEventIds: [],
    participatingEventIds: [],
  },
];

export const mockUserExperiences = [
  {
    id: "experience-001",
    userId: CURRENT_USER_ID,
    eventId: "event-001",
    attendedAt: "2026-04-24",
    photoRefs: [
      { id: "photo-001-1", imageKey: "art-gallery" },
      { id: "photo-001-2", imageKey: "film-night" },
      { id: "photo-001-3", imageKey: "rooftop-jazz" },
      { id: "photo-001-4", imageKey: "art-gallery" },
      { id: "photo-001-5", imageKey: "film-night" },
      { id: "photo-001-6", imageKey: "art-gallery" },
    ],
  },
  {
    id: "experience-002",
    userId: CURRENT_USER_ID,
    eventId: "event-002",
    attendedAt: "2026-04-12",
    photoRefs: [
      { id: "photo-002-1", imageKey: "rooftop-jazz" },
      { id: "photo-002-2", imageKey: "art-gallery" },
      { id: "photo-002-3", imageKey: "film-night" },
      { id: "photo-002-4", imageKey: "rooftop-jazz" },
    ],
  },
  {
    id: "experience-003",
    userId: CURRENT_USER_ID,
    eventId: "event-003",
    attendedAt: "2026-03-29",
    photoRefs: [
      { id: "photo-003-1", imageKey: "film-night" },
      { id: "photo-003-2", imageKey: "art-gallery" },
      { id: "photo-003-3", imageKey: "rooftop-jazz" },
    ],
  },
  {
    id: "experience-004",
    userId: CURRENT_USER_ID,
    eventId: "event-005",
    attendedAt: "2026-03-08",
    photoRefs: [
      { id: "photo-004-1", imageKey: "rooftop-jazz" },
      { id: "photo-004-2", imageKey: "film-night" },
      { id: "photo-004-3", imageKey: "art-gallery" },
      { id: "photo-004-4", imageKey: "rooftop-jazz" },
      { id: "photo-004-5", imageKey: "art-gallery" },
    ],
  },
];
