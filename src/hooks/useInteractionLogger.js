import { useFocusEffect, usePathname } from "expo-router";
import { useCallback, useMemo } from "react";

import { logInteraction } from "../services/interactionLogService";

export default function useInteractionLogger(action, metadata = {}) {
  const pathname = usePathname();
  const metadataKey = JSON.stringify(metadata);
  const stableMetadata = useMemo(() => JSON.parse(metadataKey), [metadataKey]);

  useFocusEffect(
    useCallback(() => {
      logInteraction(action, {
        route: pathname,
        ...stableMetadata,
      }).catch(() => null);
    }, [action, pathname, stableMetadata]),
  );
}
