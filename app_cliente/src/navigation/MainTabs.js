import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS } from '../constants/colors';

// Importar screens
import HomeScreen from '../screens/HomeScreen';
import CotizacionesScreen from '../screens/cotizacion/CotizacionesScreen';
import ReservasScreen from '../screens/reserva/ReservasScreen';
import PerfilScreen from '../screens/PerfilScreen';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.dark,
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Cotizaciones"
        component={CotizacionesScreen}
        options={{
          title: 'Cotizaciones',
          tabBarLabel: 'Cotizar',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Reservas"
        component={ReservasScreen}
        options={{
          title: 'Mis Reservas',
          tabBarLabel: 'Reservas',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          title: 'Mi Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
