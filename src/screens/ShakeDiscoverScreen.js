import PlaceholderScreen from "../components/PlaceholderScreen";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { LOG_ACTIONS } from "../services/interactionLogService";

export default function ShakeDiscoverScreen() {
  useInteractionLogger(LOG_ACTIONS.shakeDiscoverOpened, {
    screen: "ShakeDiscoverScreen",
  });

  return <PlaceholderScreen title="Shake to Discover" />;
}
