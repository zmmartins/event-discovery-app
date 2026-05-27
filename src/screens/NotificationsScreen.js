import PlaceholderScreen from "../components/PlaceholderScreen";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { LOG_ACTIONS } from "../services/interactionLogService";

export default function NotificationsScreen() {
  useInteractionLogger(LOG_ACTIONS.notificationsOpened, {
    screen: "NotificationsScreen",
  });

  return <PlaceholderScreen title="Notifications" />;
}
