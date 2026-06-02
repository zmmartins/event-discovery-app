export function clonePhotoRefs(photoRefs = []) {
  return photoRefs.map((photoRef) => ({ ...photoRef }));
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
