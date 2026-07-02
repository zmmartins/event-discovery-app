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

const ACTIVE_PARTICIPATION_AVAILABILITIES = new Set([
  EVENT_AVAILABILITY.available,
  EVENT_AVAILABILITY.soldOut,
]);

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

function getValidTime(value) {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
}

export function isTimestampWithinEventWindow(value, event) {
  const time = getValidTime(value);
  const startsAtTime = getValidTime(event?.startsAt);
  const endsAtTime = getValidTime(event?.endsAt);

  if (time === null || startsAtTime === null || endsAtTime === null) {
    return false;
  }

  return time >= startsAtTime && time <= endsAtTime;
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

export function canUserSaveEvent({ event, now = new Date(), participations = [] } = {}) {
  if (!event || event.status !== EVENT_STATUS.published) return false;

  const availability = getEventAvailability(event, participations, now);

  return (
    availability === EVENT_AVAILABILITY.available ||
    availability === EVENT_AVAILABILITY.soldOut
  );
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

function getEventImageRecords(images = [], eventId) {
  return images
    .filter((image) => image.eventId === eventId)
    .sort((firstImage, secondImage) => {
      const sortDelta =
        (Number(firstImage.sortOrder) || 0) -
        (Number(secondImage.sortOrder) || 0);

      if (sortDelta !== 0) return sortDelta;

      return String(firstImage.id ?? "").localeCompare(String(secondImage.id ?? ""));
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
  event,
  experiences,
  friendUserIds,
  participations,
  usersById,
}) {
  const eventId = event?.id;
  const attendedParticipantIds = new Set(
    participations
      .filter(
        (participation) =>
          participation.eventId === eventId &&
          participation.status === PARTICIPATION_STATUS.attended &&
          isTimestampWithinEventWindow(participation.attendedAt, event)
      )
      .map((participation) => participation.userId)
  );
  const experienceUserIds = new Set(
    experiences
      .filter(
        (experience) =>
          experience.eventId === eventId &&
          isTimestampWithinEventWindow(experience.attendedAt, event)
      )
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
  const eventImages = getEventImageRecords(images, event.id);
  const coverImage =
    eventImages.find((image) => image.role === "cover") ?? eventImages[0];
  const fallbackThumbnailKey = coverImage?.imageKey ?? "art_gallery1";
  const eventImageKeys = eventImages.map((image) => image.imageKey).filter(Boolean);
  const thumbnailKey = eventImageKeys[0] ?? fallbackThumbnailKey;
  const imageKeys = eventImageKeys.length > 0 ? eventImageKeys : [thumbnailKey];
  const currentUserId = currentUser?.id;
  const friendUserIds = getAcceptedFriendUserIds(currentUser, friendships);
  const { date, time } = getEventDatePartsFromStartsAt(event.startsAt);
  const availability = getEventAvailability(event, participations, now);
  const activeParticipations = ACTIVE_PARTICIPATION_AVAILABILITIES.has(availability)
    ? getActiveParticipationsForEvent(participations, event.id)
    : [];
  const canSave = canUserSaveEvent({
    event,
    now,
    participations,
  });
  const isJoined = Boolean(
    currentUserId &&
      activeParticipations.some(
        (participation) => participation.userId === currentUserId
      )
  );
  const isSaved = Boolean(
    canSave &&
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
    canSave,
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
      event,
      experiences,
      friendUserIds,
      participations,
      usersById,
    }),
    images: eventImages.map((image) => ({ ...image })),
    imageKeys,
    isJoined,
    isSaved,
    latitude: location?.coordinates?.latitude,
    locationName: getLocationName(location),
    longitude: location?.coordinates?.longitude,
    organizerName: organizer?.name ?? "Unknown organizer",
    price: formatPriceLabel(event.price),
    startsAt: event.startsAt,
    thumbnailKey,
    time,
  };
}

export function decorateEventForUser(event) {
  return event;
}

export function decorateEventsForUser(events = []) {
  return events;
}
