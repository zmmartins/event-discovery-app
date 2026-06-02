import { mockUserExperiences } from "../mockUsers";

// Local mock implementation of the profile repository.
// This is the only layer that should import mockUserExperiences directly.

function cloneExperienceRecord(experience) {
  if (!experience) return null;

  return {
    ...experience,
    photoRefs: (experience.photoRefs ?? []).map((photoRef) => ({ ...photoRef })),
  };
}

export async function listUserExperienceRecords(userId) {
  return mockUserExperiences
    .filter((experience) => experience.userId === userId)
    .map(cloneExperienceRecord);
}
