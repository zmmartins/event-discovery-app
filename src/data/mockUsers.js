export const CURRENT_USER_ID = "user-001";

export const mockUsers = [
  {
    id: CURRENT_USER_ID,
    username: "jose_lisboa",
    name: "Jose Pereira",
    email: "jose@example.com",
    description:
      "Collecting small cultural moments, design-heavy spaces, and weekends worth remembering.",
    avatarKey: "joao",
    passwordHash: "mock-only",
  },
  {
    id: "ana",
    username: "ana",
    name: "Ana",
    email: "ana@example.com",
    avatarKey: "ana",
    passwordHash: "mock-only",
  },
  {
    id: "miguel",
    username: "miguel",
    name: "Miguel",
    email: "miguel@example.com",
    avatarKey: "miguel",
    passwordHash: "mock-only",
  },
  {
    id: "rita",
    username: "rita",
    name: "Rita",
    email: "rita@example.com",
    avatarKey: "rita",
    passwordHash: "mock-only",
  },
  {
    id: "clara",
    username: "clara",
    name: "Clara",
    email: "clara@example.com",
    avatarKey: "clara",
    passwordHash: "mock-only",
  },
  {
    id: "ines",
    username: "ines",
    name: "Inês",
    email: "ines@example.com",
    avatarKey: "ines",
    passwordHash: "mock-only",
  },
  {
    id: "joao",
    username: "joao",
    name: "João",
    email: "joao@example.com",
    avatarKey: "joao",
    passwordHash: "mock-only",
  },
];

export const mockFriendships = [
  {
    id: "friendship-user-001-ana",
    userId: CURRENT_USER_ID,
    friendUserId: "ana",
    status: "accepted",
  },
  {
    id: "friendship-user-001-miguel",
    userId: CURRENT_USER_ID,
    friendUserId: "miguel",
    status: "accepted",
  },
  {
    id: "friendship-user-001-rita",
    userId: CURRENT_USER_ID,
    friendUserId: "rita",
    status: "accepted",
  },
  {
    id: "friendship-user-001-clara",
    userId: CURRENT_USER_ID,
    friendUserId: "clara",
    status: "accepted",
  },
  {
    id: "friendship-user-001-ines",
    userId: CURRENT_USER_ID,
    friendUserId: "ines",
    status: "accepted",
  },
  {
    id: "friendship-user-001-joao",
    userId: CURRENT_USER_ID,
    friendUserId: "joao",
    status: "accepted",
  },
];

export const mockUserEventExperiences = [
  {
    id: "experience-001",
    userId: CURRENT_USER_ID,
    eventId: "event-001",
    participationId: "participation-user-001-event-001-attended",
    attendedAt: "2026-05-22T19:00:00+01:00",
    photoRefs: [
      {
        id: "photo-cascais-print-salon-1",
        imageKey: "cascais_print_salon_experience_1",
      },
      {
        id: "photo-cascais-print-salon-2",
        imageKey: "cascais_print_salon_experience_2",
      },
      {
        id: "photo-cascais-print-salon-3",
        imageKey: "cascais_print_salon_experience_3",
      },
      {
        id: "photo-cascais-print-salon-4",
        imageKey: "cascais_print_salon_experience_4",
      },
    ],
  },
  {
    id: "experience-002",
    userId: CURRENT_USER_ID,
    eventId: "event-002",
    participationId: "participation-user-001-event-002-attended",
    attendedAt: "2026-06-10T18:30:00-04:00",
    photoRefs: [
      {
        id: "photo-new-york-tile-room-1",
        imageKey: "new_york_tile_room_experience_1",
      },
      {
        id: "photo-new-york-tile-room-2",
        imageKey: "new_york_tile_room_experience_2",
      },
      {
        id: "photo-new-york-tile-room-3",
        imageKey: "new_york_tile_room_experience_3",
      },
      {
        id: "photo-new-york-tile-room-4",
        imageKey: "new_york_tile_room_experience_4",
      },
    ],
  },
  {
    id: "experience-003",
    userId: CURRENT_USER_ID,
    eventId: "event-003",
    participationId: "participation-user-001-event-003-attended",
    attendedAt: "2026-06-27T20:00:00+02:00",
    photoRefs: [
      {
        id: "photo-berlin-illustration-1",
        imageKey: "berlin_illustration_experience_1",
      },
      {
        id: "photo-berlin-illustration-2",
        imageKey: "berlin_illustration_experience_2",
      },
      {
        id: "photo-berlin-illustration-3",
        imageKey: "berlin_illustration_experience_3",
      },
    ],
  },
];
