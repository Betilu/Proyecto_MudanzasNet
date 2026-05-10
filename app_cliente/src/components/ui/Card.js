import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';

const Card = ({
  children,
  onPress,
  style,
  variant = 'default', // default, outlined, elevated
  padding = 'md', // none, sm, md, lg
}) => {
  const cardStyles = [
    styles.card,
    styles[variant],
    styles[`padding_${padding}`],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  // Variantes
  default: {
    backgroundColor: COLORS.white,
  },
  outlined: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.light,
  },
  elevated: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Padding
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: 8,
  },
  padding_md: {
    padding: 16,
  },
  padding_lg: {
    padding: 24,
  },
});

export default Card;
