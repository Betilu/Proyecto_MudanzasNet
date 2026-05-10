import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks';
import { Loading } from '../components';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

// Importar screens adicionales
import NuevaCotizacionScreen from '../screens/cotizacion/NuevaCotizacionScreen';
import InventarioScreen from '../screens/cotizacion/InventarioScreen';
import CotizacionDetalleScreen from '../screens/cotizacion/CotizacionDetalleScreen';
import ReservaDetalleScreen from '../screens/reserva/ReservaDetalleScreen';
import SeguimientoScreen from '../screens/reserva/SeguimientoScreen';
import PagoScreen from '../screens/pago/PagoScreen';
import ConfirmacionEntregaScreen from '../screens/reserva/ConfirmacionEntregaScreen';
import CalificacionScreen from '../screens/reserva/CalificacionScreen';
import ReportarIncidenciaScreen from '../screens/reserva/ReportarIncidenciaScreen';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen message="Verificando sesión..." />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.primary,
            },
            headerTintColor: COLORS.white,
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="NuevaCotizacion"
            component={NuevaCotizacionScreen}
            options={{ title: 'Nueva Cotización' }}
          />
          <Stack.Screen
            name="Inventario"
            component={InventarioScreen}
            options={{ title: 'Registrar Objetos' }}
          />
          <Stack.Screen
            name="CotizacionDetalle"
            component={CotizacionDetalleScreen}
            options={{ title: 'Detalle de Cotización' }}
          />
          <Stack.Screen
            name="ReservaDetalle"
            component={ReservaDetalleScreen}
            options={{ title: 'Detalle de Reserva' }}
          />
          <Stack.Screen
            name="Seguimiento"
            component={SeguimientoScreen}
            options={{ title: 'Seguimiento en Tiempo Real' }}
          />
          <Stack.Screen
            name="Pago"
            component={PagoScreen}
            options={{ title: 'Registrar Pago' }}
          />
          <Stack.Screen
            name="ConfirmacionEntrega"
            component={ConfirmacionEntregaScreen}
            options={{ title: 'Confirmar Entrega' }}
          />
          <Stack.Screen
            name="Calificacion"
            component={CalificacionScreen}
            options={{ title: 'Calificar Servicio' }}
          />
          <Stack.Screen
            name="ReportarIncidencia"
            component={ReportarIncidenciaScreen}
            options={{ title: 'Reportar Incidencia' }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
