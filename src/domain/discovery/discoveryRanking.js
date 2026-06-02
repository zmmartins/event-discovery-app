import { getCoordinateDistanceKm } from "../events/geo";

export function rankEventsByDiscoveryDistance(events = [], origin) {
  return [...events]
    .map((event) => ({
      event,
      ranking:
        getCoordinateDistanceKm(origin, {
          latitude: event.latitude,
          longitude: event.longitude,
        }) +
        Math.random() * 0.35,
    }))
    .sort((firstEvent, secondEvent) => firstEvent.ranking - secondEvent.ranking)
    .map(({ event }) => event);
}
