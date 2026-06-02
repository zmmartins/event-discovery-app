import {
  clonePhotoRefs,
  createProfileMapPin,
  createProfileStats,
  orderUserExperienceRecords,
} from "../domain/profile/profileAggregates";
import { listUserExperienceRecords } from "../repositories/profileRepository";
import { getEventById } from "./eventService";
import { getCurrentUser, getFriendships } from "./userService";

export async function getProfileExperiences() {
  const currentUser = await getCurrentUser();
  const experienceRecords = orderUserExperienceRecords(
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
  const [currentUser, experiences, friendships] = await Promise.all([
    getCurrentUser(),
    getProfileExperiences(),
    getFriendships(),
  ]);
  const currentUserFriendships = friendships.filter(
    (friendship) =>
      friendship.userId === currentUser.id || friendship.friendUserId === currentUser.id
  );

  return {
    avatarKey: currentUser.avatarKey,
    id: currentUser.id,
    name: currentUser.name,
    stats: createProfileStats({
      experiences,
      friendships: currentUserFriendships,
    }),
    username: currentUser.username ?? currentUser.name,
    experiences,
    mapPins: experiences.map(createProfileMapPin),
  };
}
