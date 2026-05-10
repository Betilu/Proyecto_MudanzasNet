import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useAuth } from '../../hooks';
import { Button, Input } from '../../components';
import { COLORS } from '../../constants/colors';

const RegisterScreen = () => {
  const { registro, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { width, height } = useWindowDimensions();

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const horizontalPad = Math.max(16, Math.min(28, width * 0.06));
  const bottomPad = Math.max(insets.bottom, 12) + 32;
  const compact = height < 640;
  const subtitleSize = Math.min(15, Math.max(13, width * 0.035));

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.nombre) newErrors.nombre = 'El nombre es requerido';
    if (!formData.apellido) newErrors.apellido = 'El apellido es requerido';

    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.telefono) {
      newErrors.telefono = 'El teléfono es requerido';
    } else if (formData.telefono.length < 8) {
      newErrors.telefono = 'Teléfono inválido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await registro({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        password: formData.password,
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'Error al crear la cuenta');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPad,
            paddingTop: compact ? 8 : 12,
            paddingBottom: bottomPad,
            maxWidth: 520,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
      >
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
            Completa tus datos para registrarte
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nombre"
            value={formData.nombre}
            onChangeText={(value) => handleChange('nombre', value)}
            placeholder="Tu nombre"
            error={errors.nombre}
            returnKeyType="next"
            textContentType="givenName"
            autoComplete="name-given"
          />

          <Input
            label="Apellido"
            value={formData.apellido}
            onChangeText={(value) => handleChange('apellido', value)}
            placeholder="Tu apellido"
            error={errors.apellido}
            returnKeyType="next"
            textContentType="familyName"
            autoComplete="name-family"
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            placeholder="tucorreo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            returnKeyType="next"
            textContentType="emailAddress"
            autoComplete="email"
          />

          <Input
            label="Teléfono"
            value={formData.telefono}
            onChangeText={(value) => handleChange('telefono', value)}
            placeholder="70123456"
            keyboardType="phone-pad"
            error={errors.telefono}
            textContentType="telephoneNumber"
            autoComplete="tel"
          />

          <Input
            label="Contraseña"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            error={errors.password}
            returnKeyType="next"
            textContentType="newPassword"
            autoComplete="password-new"
          />

          <Input
            label="Confirmar Contraseña"
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange('confirmPassword', value)}
            placeholder="Repite tu contraseña"
            secureTextEntry
            error={errors.confirmPassword}
            returnKeyType="done"
            textContentType="newPassword"
            autoComplete="password-new"
          />

          <Button
            title="Crear Cuenta"
            onPress={handleRegister}
            fullWidth
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
  },
  headerCompact: {
    marginBottom: 16,
  },
  subtitle: {
    color: COLORS.dark,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  submitButton: {
    marginTop: 8,
  },
});

export default RegisterScreen;
