import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticación al iniciar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const authenticated = await authService.isAuthenticated();

      if (authenticated) {
        let userData = await authService.getUsuarioAlmacenado();
        if (!userData) {
          userData = await authService.getPerfil();
        }
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Registro
  const registro = async (datos) => {
    try {
      setLoading(true);
      const response = await authService.registro(datos);
      const perfil = response.user || (await authService.getPerfil());
      setUser(perfil);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password);
      const perfil = response.user || (await authService.getPerfil());
      setUser(perfil);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar perfil
  const actualizarPerfil = async (datos) => {
    try {
      setLoading(true);
      const response = await authService.actualizarPerfil(datos);
      setUser(response);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Recargar perfil desde el servidor
  const recargarPerfil = async () => {
    try {
      const response = await authService.getPerfil();
      setUser(response);
      return response;
    } catch (error) {
      console.error('Error recargando perfil:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    registro,
    login,
    logout,
    actualizarPerfil,
    recargarPerfil,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
