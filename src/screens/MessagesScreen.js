import PlaceholderScreen from "../components/PlaceholderScreen";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { LOG_ACTIONS } from "../services/interactionLogService";

export default function MessagesScreen() {
  useInteractionLogger(LOG_ACTIONS.messagesOpened, {
    screen: "MessagesScreen",
  });

  return <PlaceholderScreen title="Messages" />;
}
