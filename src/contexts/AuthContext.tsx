import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
<<<<<<< HEAD
import { authStorage, initializeDefaultUsers, initializeDefaultData } from '../lib/storage';
import { supabase } from '../lib/supabase';

const API_URL = 'https://adaptacoescurriculares-api.onrender.com';
=======
import { apiFetch } from '../lib/api';
>>>>>>> b97e84a78e3e4e15db920414c230afd5d561b2f3

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Using local storage for authentication

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize defaults and sample data, keep auth strictly local
    initializeDefaultUsers();
    initializeDefaultData();
    checkSession();
  }, []);

  function checkSession() {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error checking session:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
<<<<<<< HEAD
    // Ensure default users exist in localStorage
    initializeDefaultUsers();

    // Try Supabase authentication first (remote API)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.session?.access_token) {
        const accessToken = data.session.access_token;

        // Fetch user profile from server
        const res = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const body = await res.json();
          const profile = body.user || body;
          localStorage.setItem('token', accessToken);
          localStorage.setItem('user', JSON.stringify(profile));
          setUser(profile);
          return;
        }
      }
    } catch (err) {
      // ignore and fallback to local auth
      console.warn('Supabase sign-in failed, falling back to local auth', err);
    }

    // If Supabase auth failed, try to find the user on the remote API and allow login by email
    try {
      const res = await fetch(`${API_URL}/users?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        // API may return an array or object; try to extract a user
        const list = Array.isArray(data) ? data : data?.value || data?.users || [];
        const found = Array.isArray(list)
          ? list.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase())
          : null;
        if (found) {
          // Allow login by email for users that exist in the remote API
          const token = `mock-api-${found.email}`;
          localStorage.setItem('token', token);
          // Normalize shape to our User type (id, email, name, role)
          const profile = {
            id: String(found.id || found.userId || found.email),
            email: found.email,
            name: found.name || found.fullName || '',
            role: found.role || 'professor',
          };
          localStorage.setItem('user', JSON.stringify(profile));
          setUser(profile as User);
          return;
        }
      }
    } catch (err) {
      console.warn('Remote API lookup failed', err);
    }
=======
    // Busca o usuário na rota /users filtrando pelo email
    let data: any;
    try {
      data = await apiFetch(`${API_URL}/users?email=${email}`);
    } catch (err: any) {
      throw new Error(err?.message || 'Erro ao conectar com a API');
    }
    const user = Array.isArray(data) && data.length > 0 ? data[0] : null;
>>>>>>> b97e84a78e3e4e15db920414c230afd5d561b2f3

    // Final fallback: local hardcoded credentials
    const user = authStorage.signIn(email, password);
    if (!user) {
      throw new Error('Usuário não encontrado. Verifique o e-mail ou senha.');
    }

    const token = `mock-token-${user.id}`;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }

  async function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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
