import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';
import { RootStackParamList } from './src/lib/navigation';
import LibraryScreen from './src/screens/LibraryScreen';
import ScanScreen from './src/screens/ScanScreen';
import ReviewScreen from './src/screens/ReviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const scheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Library" component={LibraryScreen} />
          <Stack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
