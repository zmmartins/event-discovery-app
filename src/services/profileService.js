import {
  clonePhotoRefs,
  createProfileMapPin,
  createProfileStats,
  orderUserExperienceRecords,
} from "../domain/profile/profileAggregates";
import { listUserExperienceRecords } from "../repositories/profileRepository";
import { getEventById } from "./eventService";
import { getCurrentUser } from "./userService";

export async function getProfileExperiences() {
  const currentUser = await getCurrentUser();
  const experienceRecords = orderUserExperienceRecords(
    currentUser,
    await listUserExperienceRecords(currentUser.id)
  );
  const experiences = await Promise.all(
    experienceRecords.map(async (experience) => {
      const event = await getEventById(experience.eventId);

      if (!event) return null;

      return {
        ...experience,
        event,
        photoRefs: clonePhotoRefs(experience.photoRefs),
      };
    })
  );

  return experiences.filter(Boolean);
}

export async function getProfileMapPins() {
  const experiences = await getProfileExperiences();

  return experiences.map(createProfileMapPin);
}

export async function getCurrentUserProfile() {
  const currentUser = await getCurrentUser();
  const experiences = await getProfileExperiences();

  return {
    avatarKey: currentUser.avatarKey,
    id: currentUser.id,
    name: currentUser.name,
    stats: createProfileStats(currentUser, experiences),
    username: currentUser.username ?? currentUser.name,
    experiences,
    mapPins: experiences.map(createProfileMapPin),
  };
}
