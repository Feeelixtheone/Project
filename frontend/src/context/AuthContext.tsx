import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  phone?: string;
  address?: string;
  is_company?: boolean;
  company_id?: string;
  role?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, accountType: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('session_token');
      if (storedToken) {
        setSessionToken(storedToken);
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          await AsyncStorage.removeItem('session_token');
          setSessionToken(null);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Eroare la autentificare' }));
        throw new Error(typeof error.detail === 'string' ? error.detail : 'Email sau parolă greșită');
      }

      const data = await response.json();
      setUser(data.user);
      setSessionToken(data.session_token);
      await AsyncStorage.setItem('session_token', data.session_token);
      
      if (Platform.OS === 'web') {
        window.location.href = '/';
      } else {
        router.replace('/(tabs)/acasa');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, accountType: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, account_type: accountType }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Eroare la înregistrare' }));
        throw new Error(typeof error.detail === 'string' ? error.detail : 'Nu s-a putut crea contul');
      }

      const data = await response.json();
      setUser(data.user);
      setSessionToken(data.session_token);
      await AsyncStorage.setItem('session_token', data.session_token);
      
      if (Platform.OS === 'web') {
        window.location.href = '/';
      } else {
        router.replace('/(tabs)/acasa');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      if (sessionToken) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
      }
      
      await AsyncStorage.removeItem('session_token');
      setUser(null);
      setSessionToken(null);
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (sessionToken) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error refreshing user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
