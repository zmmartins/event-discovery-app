export function filterEventsByCategory(events = [], category) {
  if (!category || category === "All") {
    return events;
  }

  return events.filter((event) => event.category === category);
}
