import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_DISCOVER_COORDINATE,
  getDiscoverEvents,
} from "../services/eventService";
import {
  LOG_ACTIONS,
  logInteraction,
} from "../services/interactionLogService";

const DiscoveryModeContext = createContext(null);

function orderByDiscoveryIds(events, eventIds) {
  const eventMap = new Map(events.map((event) => [event.id, event]));

  return eventIds.map((eventId) => eventMap.get(eventId)).filter(Boolean);
}

export function DiscoveryModeProvider({ children }) {
  const [isDiscoveryActive, setIsDiscoveryActive] = useState(false);
  const [discoverEventIds, setDiscoverEventIds] = useState([]);

  const activateDiscoveryMode = useCallback(async (metadata = {}) => {
    const discoverEvents = await getDiscoverEvents({
      latitude: DEFAULT_DISCOVER_COORDINATE.latitude,
      limit: 4,
      longitude: DEFAULT_DISCOVER_COORDINATE.longitude,
    });
    const nextEventIds = discoverEvents.map((event) => event.id);

    setDiscoverEventIds(nextEventIds);
    setIsDiscoveryActive(true);

    logInteraction(LOG_ACTIONS.discoverModeActivated, {
      ...metadata,
      result: "activated",
      screen: metadata.screen ?? "DiscoveryMode",
    }).catch(() => null);
    logInteraction(LOG_ACTIONS.discoverResultsShown, {
      ...metadata,
      eventIds: nextEventIds,
      result: "shown",
      screen: metadata.screen ?? "DiscoveryMode",
    }).catch(() => null);

    return discoverEvents;
  }, []);

  const deactivateDiscoveryMode = useCallback(
    (metadata = {}) => {
      if (isDiscoveryActive) {
        logInteraction(LOG_ACTIONS.discoverModeDisabled, {
          ...metadata,
          eventIds: discoverEventIds,
          result: "disabled",
          screen: metadata.screen ?? "DiscoveryMode",
        }).catch(() => null);
      }

      setDiscoverEventIds([]);
      setIsDiscoveryActive(false);
    },
    [discoverEventIds, isDiscoveryActive],
  );

  const filterDiscoveryEvents = useCallback(
    (events) => {
      if (!isDiscoveryActive) return events;

      return orderByDiscoveryIds(events, discoverEventIds);
    },
    [discoverEventIds, isDiscoveryActive],
  );

  const value = useMemo(
    () => ({
      activateDiscoveryMode,
      deactivateDiscoveryMode,
      discoverEventIds,
      filterDiscoveryEvents,
      isDiscoveryActive,
    }),
    [
      activateDiscoveryMode,
      deactivateDiscoveryMode,
      discoverEventIds,
      filterDiscoveryEvents,
      isDiscoveryActive,
    ],
  );

  return (
    <DiscoveryModeContext.Provider value={value}>
      {children}
    </DiscoveryModeContext.Provider>
  );
}

export function useDiscoveryMode() {
  const context = useContext(DiscoveryModeContext);

  if (!context) {
    return {
      activateDiscoveryMode: async () => [],
      deactivateDiscoveryMode: () => {},
      discoverEventIds: [],
      filterDiscoveryEvents: (events) => events,
      isDiscoveryActive: false,
    };
  }

  return context;
}
