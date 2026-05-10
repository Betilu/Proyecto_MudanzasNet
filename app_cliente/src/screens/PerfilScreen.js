import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../hooks';
import { Card, Button } from '../components';
import { COLORS } from '../constants/colors';

const PerfilScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
          </Text>
        </View>
        <Text style={styles.nombre}>
          {user?.nombre} {user?.apellido}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        <Card variant="outlined">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono</Text>
            <Text style={styles.infoValue}>{user?.telefono || 'No registrado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo de Cliente</Text>
            <Text style={styles.infoValue}>
              {user?.tipo_cliente || 'Residencial'}
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <Card variant="outlined">
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.cantidad_mudanzas || 0}</Text>
              <Text style={styles.statLabel}>Mudanzas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                Bs {user?.monto_total_gastado || 0}
              </Text>
              <Text style={styles.statLabel}>Total Gastado</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Button
          title="Cerrar Sesión"
          variant="danger"
          onPress={handleLogout}
          fullWidth
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  nombre: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.dark,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.dark,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.black,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.dark,
  },
});

export default PerfilScreen;
