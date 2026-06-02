export function decorateEventForUser(event, user) {
  if (!event) return event;

  const participatingEventIds = user?.participatingEventIds ?? [];
  const savedEventIds = user?.savedEventIds ?? [];

  return {
    ...event,
    isJoined: Boolean(event.isJoined) || participatingEventIds.includes(event.id),
    isSaved: savedEventIds.includes(event.id),
  };
}

export function decorateEventsForUser(events = [], user) {
  return events.map((event) => decorateEventForUser(event, user));
}
