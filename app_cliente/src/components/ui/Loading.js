import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const Loading = ({ message = 'Cargando...', fullScreen = false }) => {
  const containerStyles = [
    styles.container,
    fullScreen && styles.fullScreen,
  ];

  return (
    <View style={containerStyles}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.dark,
  },
});

export default Loading;
