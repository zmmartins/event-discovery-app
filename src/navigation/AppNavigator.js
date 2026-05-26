import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import EventDetailScreen from "../screens/EventDetailScreen";
import ListScreen from "../screens/ListScreen";
import MapScreen from "../screens/MapScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{ title: "Explore" }}
        />
        <Stack.Screen
          name="List"
          component={ListScreen}
          options={{ title: "Events" }}
        />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{ title: "Event Details" }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "Cultural Passport" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
