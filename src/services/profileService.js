import { mockUserExperiences } from "../data/mockUsers";
import { getEventById } from "./eventService";
import { getCurrentUser } from "./userService";

function clonePhotoRefs(photoRefs = []) {
  return photoRefs.map((photoRef) => ({ ...photoRef }));
}

function getPreferredExperienceRecords(user) {
  const experienceIds = user.attendedExperienceIds ?? [];

  return experienceIds
    .map((experienceId) =>
      mockUserExperiences.find(
        (experience) =>
          experience.id === experienceId && experience.userId === user.id,
      ),
    )
    .filter(Boolean);
}

function getRandomPhotoRef(photoRefs = []) {
  if (photoRefs.length === 0) return null;

  return photoRefs[Math.floor(Math.random() * photoRefs.length)];
}

function createStats(user, experiences) {
  return {
    attendedEvents: experiences.length,
    friends: (user.friendIds ?? []).length,
    uniqueExperiences: new Set(
      experiences.map((experience) => experience.eventId),
    ).size,
  };
}

function createMapPin(experience) {
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

export async function getProfileExperiences() {
  const currentUser = await getCurrentUser();
  const experienceRecords = getPreferredExperienceRecords(currentUser);
  const experiences = await Promise.all(
    experienceRecords.map(async (experience) => {
      const event = await getEventById(experience.eventId);

      if (!event) return null;

      return {
        ...experience,
        event,
        photoRefs: clonePhotoRefs(experience.photoRefs),
      };
    }),
  );

  return experiences.filter(Boolean);
}

export async function getProfileMapPins() {
  const experiences = await getProfileExperiences();

  return experiences.map(createMapPin);
}

export async function getCurrentUserProfile() {
  const currentUser = await getCurrentUser();
  const experiences = await getProfileExperiences();

  return {
    avatarKey: currentUser.avatarKey,
    id: currentUser.id,
    name: currentUser.name,
    stats: createStats(currentUser, experiences),
    username: currentUser.username ?? currentUser.name,
    experiences,
    mapPins: experiences.map(createMapPin),
  };
}
