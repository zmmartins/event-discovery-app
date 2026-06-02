export function clonePhotoRefs(photoRefs = []) {
  return photoRefs.map((photoRef) => ({ ...photoRef }));
}

export function orderUserExperienceRecords(user, experienceRecords = []) {
  const experienceIds = user?.attendedExperienceIds ?? [];
  const experienceMap = new Map(
    experienceRecords.map((experience) => [experience.id, experience])
  );

  return experienceIds.map((experienceId) => experienceMap.get(experienceId)).filter(Boolean);
}

export function createProfileStats(user, experiences = []) {
  return {
    attendedEvents: experiences.length,
    friends: (user?.friendIds ?? []).length,
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
