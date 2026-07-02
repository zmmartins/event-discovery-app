import {
  EVENT_AVAILABILITY,
  PARTICIPATION_STATUS,
  getEventAvailability,
  isTimestampWithinEventWindow,
} from "../events/eventState";

export function clonePhotoRefs(photoRefs = []) {
  return photoRefs.map((photoRef) => ({ ...photoRef }));
}

function createRecordMap(records = []) {
  return new Map(records.map((record) => [record.id, record]));
}

function getExperienceParticipation(experience, participations = []) {
  if (experience?.participationId) {
    return participations.find(
      (participation) => participation.id === experience.participationId
    );
  }

  return participations.find(
    (participation) =>
      participation.eventId === experience?.eventId &&
      participation.userId === experience?.userId &&
      participation.status === PARTICIPATION_STATUS.attended &&
      isTimestampWithinEventWindow(participation.attendedAt, {
        startsAt: experience.attendedAt,
        endsAt: experience.attendedAt,
      })
  );
}

export function isValidExperienceRecord({
  event,
  experience,
  now = new Date(),
  participations = [],
} = {}) {
  if (!event || !experience || experience.eventId !== event.id) {
    return false;
  }

  if (
    getEventAvailability(event, participations, now) !==
    EVENT_AVAILABILITY.alreadyHappened
  ) {
    return false;
  }

  if (!isTimestampWithinEventWindow(experience.attendedAt, event)) {
    return false;
  }

  const participation = getExperienceParticipation(experience, participations);

  if (!participation) {
    return false;
  }

  return (
    participation.eventId === experience.eventId &&
    participation.userId === experience.userId &&
    participation.status === PARTICIPATION_STATUS.attended &&
    isTimestampWithinEventWindow(participation.attendedAt, event)
  );
}

export function filterValidExperienceRecords(
  experienceRecords = [],
  { events = [], now = new Date(), participations = [] } = {}
) {
  const eventsById = createRecordMap(events);

  return experienceRecords.filter((experience) =>
    isValidExperienceRecord({
      event: eventsById.get(experience.eventId),
      experience,
      now,
      participations,
    })
  );
}

export function orderUserExperienceRecords(experienceRecords = []) {
  return [...experienceRecords].sort((firstExperience, secondExperience) => {
    const firstTime = new Date(firstExperience.attendedAt).getTime();
    const secondTime = new Date(secondExperience.attendedAt).getTime();

    return secondTime - firstTime;
  });
}

export function createProfileStats({ experiences = [], friendships = [] } = {}) {
  return {
    attendedEvents: experiences.length,
    friends: friendships.filter((friendship) => friendship.status === "accepted")
      .length,
    uniqueExperiences: new Set(
      experiences.map((experience) => experience.eventId)
    ).size,
  };
}

export function getRandomPhotoRef(photoRefs = []) {
  if (photoRefs.length === 0) return null;

  return photoRefs[Math.floor(Math.random() * photoRefs.length)];
}

export function createProfileMapPin(experience) {
  return {
    event: experience.event,
    eventId: experience.event.id,
    experienceId: experience.id,
    id: `pin-${experience.id}`,
    latitude: experience.event.latitude,
    longitude: experience.event.longitude,
    photoRef: getRandomPhotoRef(experience.photoRefs),
    title: experience.event.title,
  };
}

export function createEventMapPin(event, source = "event") {
  return {
    event,
    eventId: event.id,
    id: `pin-${source}-${event.id}`,
    latitude: event.latitude,
    longitude: event.longitude,
    title: event.title,
  };
}
