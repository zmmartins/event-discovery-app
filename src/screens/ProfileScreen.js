import PlaceholderScreen from "../components/PlaceholderScreen";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { LOG_ACTIONS } from "../services/interactionLogService";

export default function ProfileScreen() {
  useInteractionLogger(LOG_ACTIONS.profileOpened, {
    screen: "ProfileScreen",
  });

  return <PlaceholderScreen title="Profile" />;
}
