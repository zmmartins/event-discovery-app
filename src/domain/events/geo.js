export const DEFAULT_DISCOVER_COORDINATE = {
  latitude: 38.7223,
  longitude: -9.1393,
};

export function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getCoordinateDistance(firstCoordinate, secondCoordinate, earthRadius) {
  if (!firstCoordinate || !secondCoordinate) {
    return Number.POSITIVE_INFINITY;
  }

  const latitudeDelta = toRadians(
    secondCoordinate.latitude - firstCoordinate.latitude
  );
  const longitudeDelta = toRadians(
    secondCoordinate.longitude - firstCoordinate.longitude
  );
  const firstLatitude = toRadians(firstCoordinate.latitude);
  const secondLatitude = toRadians(secondCoordinate.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function getCoordinateDistanceKm(firstCoordinate, secondCoordinate) {
  return getCoordinateDistance(firstCoordinate, secondCoordinate, 6371);
}

export function getCoordinateDistanceMeters(firstCoordinate, secondCoordinate) {
  return getCoordinateDistance(firstCoordinate, secondCoordinate, 6371000);
}
