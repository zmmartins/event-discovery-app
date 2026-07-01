export const EVENT_STATUS = {
  draft: "draft",
  published: "published",
  canceled: "canceled",
};

export const EVENT_AVAILABILITY = {
  available: "available",
  soldOut: "sold_out",
  canceled: "canceled",
  alreadyHappened: "already_happened",
};

export const PARTICIPATION_STATUS = {
  registered: "registered",
  canceled: "canceled",
  userCanceled: "user_canceled",
  disabledEventCanceled: "disabled_event_canceled",
  attended: "attended",
  noShow: "no_show",
};

export function isActiveParticipation(participation) {
  return participation?.status === PARTICIPATION_STATUS.registered;
}

export function getActiveParticipationsForEvent(participations = [], eventId) {
  return participations.filter(
    (participation) =>
      participation.eventId === eventId && isActiveParticipation(participation)
  );
}

export function getActiveParticipationCount(participations = [], eventId) {
  return getActiveParticipationsForEvent(participations, eventId).length;
}

export function getUserActiveParticipation(participations = [], eventId, userId) {
  return participations.find(
    (participation) =>
      participation.eventId === eventId &&
      participation.userId === userId &&
      isActiveParticipation(participation)
  );
}

export function getEventAvailability(event, participations = [], now = new Date()) {
  if (!event) return EVENT_AVAILABILITY.canceled;

  if (event.status === EVENT_STATUS.canceled) {
    return EVENT_AVAILABILITY.canceled;
  }

  const endsAt = new Date(event.endsAt);

  if (!Number.isNaN(endsAt.getTime()) && endsAt < now) {
    return EVENT_AVAILABILITY.alreadyHappened;
  }

  const maximumCapacity = Number(event.maximumCapacity);

  if (
    Number.isFinite(maximumCapacity) &&
    maximumCapacity > 0 &&
    getActiveParticipationCount(participations, event.id) >= maximumCapacity
  ) {
    return EVENT_AVAILABILITY.soldOut;
  }

  return EVENT_AVAILABILITY.available;
}

export function canUserJoinEvent({
  event,
  now = new Date(),
  participations = [],
  userId,
} = {}) {
  if (!event || !userId) return false;

  const availability = getEventAvailability(event, participations, now);
  const existingParticipation = getUserActiveParticipation(
    participations,
    event.id,
    userId
  );

  return availability === EVENT_AVAILABILITY.available && !existingParticipation;
}

export function getEventDatePartsFromStartsAt(startsAt) {
  if (!startsAt || typeof startsAt !== "string") {
    return {
      date: "",
      time: "",
    };
  }

  return {
    date: startsAt.slice(0, 10),
    time: startsAt.slice(11, 16),
  };
}

export function formatPriceLabel(price) {
  if (!price) return "";
  if (price.label) return price.label;
  if (price.amountCents === 0) return "Free";

  const amount = Number(price.amountCents) / 100;
  const formattedAmount = Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2);

  return `${formattedAmount}€`;
}

function createMap(records = []) {
  return new Map(records.map((record) => [record.id, record]));
}

function getAcceptedFriendUserIds(currentUser, friendships = []) {
  if (!currentUser) return [];

  return friendships
    .filter((friendship) => friendship.status === "accepted")
    .map((friendship) => {
      if (friendship.userId === currentUser.id) return friendship.friendUserId;
      if (friendship.friendUserId === currentUser.id) return friendship.userId;

      return null;
    })
    .filter(Boolean);
}

function createAttendee(user) {
  if (!user) return null;

  return {
    avatarKey: user.avatarKey,
    id: user.id,
    name: user.name,
  };
}

function getEventImages(images = [], eventId) {
  return images
    .filter((image) => image.eventId === eventId)
    .sort((firstImage, secondImage) => {
      const firstSortOrder = Number(firstImage.sortOrder) || 0;
      const secondSortOrder = Number(secondImage.sortOrder) || 0;

      return firstSortOrder - secondSortOrder;
    });
}

function getLocationName(location) {
  const locationName = [location?.name, location?.city, location?.district]
    .filter(Boolean)
    .join(", ");

  return locationName || "Location TBA";
}

function getFriendNames(userIds = [], usersById) {
  return userIds
    .map((userId) => usersById.get(userId))
    .filter(Boolean)
    .map((user) => user.name);
}

function getFriendsGoing({ activeParticipations, friendUserIds, usersById }) {
  const activeParticipantIds = new Set(
    activeParticipations.map((participation) => participation.userId)
  );

  return getFriendNames(
    friendUserIds.filter((friendUserId) => activeParticipantIds.has(friendUserId)),
    usersById
  );
}

function getFriendsWentBefore({
  eventId,
  experiences,
  friendUserIds,
  participations,
  usersById,
}) {
  const attendedParticipantIds = new Set(
    participations
      .filter(
        (participation) =>
          participation.eventId === eventId &&
          participation.status === PARTICIPATION_STATUS.attended
      )
      .map((participation) => participation.userId)
  );
  const experienceUserIds = new Set(
    experiences
      .filter((experience) => experience.eventId === eventId)
      .map((experience) => experience.userId)
  );

  return getFriendNames(
    friendUserIds.filter(
      (friendUserId) =>
        attendedParticipantIds.has(friendUserId) ||
        experienceUserIds.has(friendUserId)
    ),
    usersById
  );
}

export function createEventViewModel({
  currentUser,
  event,
  eventType,
  experiences = [],
  friendships = [],
  images = [],
  location,
  now = new Date(),
  organizer,
  participations = [],
  savedEvents = [],
  users = [],
}) {
  if (!event) return null;

  const usersById = createMap(users);
  const eventImages = getEventImages(images, event.id);
  const coverImage =
    eventImages.find((image) => image.role === "cover") ?? eventImages[0];
  const activeParticipations = getActiveParticipationsForEvent(
    participations,
    event.id
  );
  const currentUserId = currentUser?.id;
  const friendUserIds = getAcceptedFriendUserIds(currentUser, friendships);
  const { date, time } = getEventDatePartsFromStartsAt(event.startsAt);
  const availability = getEventAvailability(event, participations, now);
  const isJoined = Boolean(
    currentUserId &&
      getUserActiveParticipation(participations, event.id, currentUserId)
  );
  const isSaved = Boolean(
    currentUserId &&
      savedEvents.some(
        (savedEvent) =>
          savedEvent.userId === currentUserId && savedEvent.eventId === event.id
      )
  );

  return {
    ...event,
    attendingFriends: activeParticipations
      .map((participation) => createAttendee(usersById.get(participation.userId)))
      .filter(Boolean),
    availability,
    canJoin: canUserJoinEvent({
      event,
      now,
      participations,
      userId: currentUserId,
    }),
    category: eventType?.name ?? "Event",
    date,
    endsAt: event.endsAt,
    friendsGoing: getFriendsGoing({
      activeParticipations,
      friendUserIds,
      usersById,
    }),
    friendsWentBefore: getFriendsWentBefore({
      eventId: event.id,
      experiences,
      friendUserIds,
      participations,
      usersById,
    }),
    images: eventImages.map((image) => ({ ...image })),
    isJoined,
    isSaved,
    latitude: location?.coordinates?.latitude,
    locationName: getLocationName(location),
    longitude: location?.coordinates?.longitude,
    organizerName: organizer?.name ?? "Unknown organizer",
    price: formatPriceLabel(event.price),
    startsAt: event.startsAt,
    thumbnailKey: coverImage?.imageKey ?? "art_gallery1",
    time,
  };
}

export function decorateEventForUser(event) {
  return event;
}

export function decorateEventsForUser(events = []) {
  return events;
}
