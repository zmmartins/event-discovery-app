import {
  clonePhotoRefs,
  createEventMapPin,
  createProfileMapPin,
  createProfileStats,
  filterValidExperienceRecords,
  orderUserExperienceRecords,
} from "../domain/profile/profileAggregates";
import { listEventParticipationRecords } from "../repositories/eventRepository";
import { listUserExperienceRecords } from "../repositories/profileRepository";
import { getEvents } from "./eventService";
import { getCurrentUser, getFriendships } from "./userService";

function isFutureVisibleEvent(event) {
  return event?.availability !== "canceled" && event?.availability !== "already_happened";
}

function isGoingEvent(event) {
  return Boolean(event?.isJoined) && isFutureVisibleEvent(event);
}

function isSavedProfileEvent(event) {
  return Boolean(event?.isSaved) && event?.canSave === true;
}

export async function getProfileExperiences() {
  const currentUser = await getCurrentUser();
  const [events, participations, rawExperienceRecords] = await Promise.all([
    getEvents(),
    listEventParticipationRecords(),
    listUserExperienceRecords(currentUser.id),
  ]);
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const validExperienceRecords = filterValidExperienceRecords(rawExperienceRecords, {
    events,
    participations,
  });
  const experiences = validExperienceRecords
    .map((experience) => {
      const event = eventsById.get(experience.eventId);

      if (!event) return null;

      return {
        ...experience,
        event,
        photoRefs: clonePhotoRefs(experience.photoRefs),
      };
    })
    .filter(Boolean);

  return orderUserExperienceRecords(experiences);
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
  const goingMapPins = goingEvents.map((event) => createEventMapPin(event, "going"));
  const savedMapPins = savedEvents.map((event) => createEventMapPin(event, "saved"));

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
        mapPins: goingMapPins,
      },
      saved: {
        count: savedEvents.length,
        events: savedEvents,
        id: "saved",
        label: "Saved",
        mapPins: savedMapPins,
      },
    },
  };
}
