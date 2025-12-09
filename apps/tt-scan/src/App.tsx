import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './screens/Login';
import Scan from './screens/Scan';
import Review from './screens/Review';
import UploadStatus from './screens/UploadStatus';
import SmartInbox from './screens/SmartInbox';
import EmailDetail from './screens/EmailDetail';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
        initialRouteName="Login"
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Scan" component={Scan} />
        <Stack.Screen name="Review" component={Review} />
        <Stack.Screen name="UploadStatus" component={UploadStatus} />
        <Stack.Screen name="SmartInbox" component={SmartInbox} />
        <Stack.Screen name="EmailDetail" component={EmailDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}



