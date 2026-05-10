import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const Badge = ({
  label,
  variant = 'default', // default, success, warning, danger, info
  size = 'md', // sm, md, lg
  style,
}) => {
  const badgeStyles = [
    styles.badge,
    styles[variant],
    styles[size],
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${size}`],
  ];

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  // Variantes
  default: {
    backgroundColor: COLORS.light,
  },
  success: {
    backgroundColor: COLORS.success,
  },
  warning: {
    backgroundColor: COLORS.warning,
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  info: {
    backgroundColor: COLORS.info,
  },
  // Tamaños
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  // Texto
  text: {
    color: COLORS.white,
    fontWeight: '600',
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: 12,
  },
  text_lg: {
    fontSize: 14,
  },
});

export default Badge;
