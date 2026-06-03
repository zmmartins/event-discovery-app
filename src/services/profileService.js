import {
  clonePhotoRefs,
  createProfileMapPin,
  createProfileStats,
  orderUserExperienceRecords,
} from "../domain/profile/profileAggregates";
import { listUserExperienceRecords } from "../repositories/profileRepository";
import { getEventById, getEvents } from "./eventService";
import { getCurrentUser, getFriendships } from "./userService";

function isFutureVisibleEvent(event) {
  return event?.availability !== "canceled" && event?.availability !== "already_happened";
}

function isGoingEvent(event) {
  return Boolean(event?.isJoined) && isFutureVisibleEvent(event);
}

function isSavedProfileEvent(event) {
  return Boolean(event?.isSaved) && isFutureVisibleEvent(event);
}

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
  const [currentUser, experiences, friendships, events] = await Promise.all([
    getCurrentUser(),
    getProfileExperiences(),
    getFriendships(),
    getEvents(),
  ]);
  const currentUserFriendships = friendships.filter(
    (friendship) =>
      friendship.userId === currentUser.id || friendship.friendUserId === currentUser.id
  );
  const goingEvents = events.filter(isGoingEvent);
  const savedEvents = events.filter(isSavedProfileEvent);
  const attendedMapPins = experiences.map(createProfileMapPin);

  return {
    avatarKey: currentUser.avatarKey,
    heroImageKey: currentUser.heroImageKey ?? currentUser.avatarKey,
    id: currentUser.id,
    name: currentUser.name,
    stats: createProfileStats({
      experiences,
      friendships: currentUserFriendships,
    }),
    username: currentUser.username ?? currentUser.name,
    experiences,
    goingEvents,
    mapPins: attendedMapPins,
    savedEvents,
    sections: {
      attended: {
        count: experiences.length,
        experiences,
        id: "attended",
        label: "Attended",
        mapPins: attendedMapPins,
      },
      going: {
        count: goingEvents.length,
        events: goingEvents,
        id: "going",
        label: "Going",
        mapPins: [],
      },
      saved: {
        count: savedEvents.length,
        events: savedEvents,
        id: "saved",
        label: "Saved",
        mapPins: [],
      },
    },
  };
}
