import { mockUserEventExperiences } from "../mockUsers";

// Local mock implementation of the profile repository.
// This is the only profile-data layer that should import mock user experiences directly.

function cloneExperienceRecord(experience) {
  if (!experience) return null;

  return {
    ...experience,
    photoRefs: (experience.photoRefs ?? []).map((photoRef) => ({ ...photoRef })),
  };
}

export async function listExperienceRecords() {
  return mockUserEventExperiences.map(cloneExperienceRecord);
}

export async function listUserExperienceRecords(userId) {
  return mockUserEventExperiences
    .filter((experience) => experience.userId === userId)
    .map(cloneExperienceRecord);
}
