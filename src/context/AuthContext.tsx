import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types/invoice';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCurrentUser: (userData: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('zoolyum_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('zoolyum_auth_token') || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Sync with Supabase Auth Session
  useEffect(() => {
    // 1. Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Supabase session fetch error:', error);
      }
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: 'admin',
          createdAt: session.user.created_at,
        };
        setUser(authUser);
        setToken(session.access_token);
        localStorage.setItem('zoolyum_auth_user', JSON.stringify(authUser));
        localStorage.setItem('zoolyum_auth_token', session.access_token);
      } else {
        // Fallback: check if we had existing local session
        const storedUser = localStorage.getItem('zoolyum_auth_user');
        const storedToken = localStorage.getItem('zoolyum_auth_token');
        if (storedUser && storedToken) {
          try {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
          } catch {
            setUser(null);
            setToken(null);
          }
        }
      }
      setIsLoading(false);
    });

    // 2. Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: 'admin',
          createdAt: session.user.created_at,
        };
        setUser(authUser);
        setToken(session.access_token);
        localStorage.setItem('zoolyum_auth_user', JSON.stringify(authUser));
        localStorage.setItem('zoolyum_auth_token', session.access_token);
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('zoolyum_auth_user');
        localStorage.removeItem('zoolyum_auth_token');
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        return { success: false, error: error.message || 'Invalid email or password' };
      }

      if (data.user && data.session) {
        const authUser: AuthUser = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          email: data.user.email || cleanEmail,
          role: 'admin',
          createdAt: data.user.created_at,
        };

        setUser(authUser);
        setToken(data.session.access_token);
        localStorage.setItem('zoolyum_auth_user', JSON.stringify(authUser));
        localStorage.setItem('zoolyum_auth_token', data.session.access_token);
        setIsAuthModalOpen(false);
        return { success: true };
      }

      return { success: false, error: 'Login failed. Please check your credentials.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error. Please try again.' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      // 1. Sign up directly with Supabase Auth (this writes to Supabase Auth -> Users table)
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            name: cleanName,
            full_name: cleanName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message || 'Registration failed' };
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          name: cleanName,
          email: data.user.email || cleanEmail,
          role: 'admin',
          createdAt: data.user.created_at,
        };

        setUser(authUser);
        if (data.session?.access_token) {
          setToken(data.session.access_token);
          localStorage.setItem('zoolyum_auth_token', data.session.access_token);
        }
        localStorage.setItem('zoolyum_auth_user', JSON.stringify(authUser));
        setIsAuthModalOpen(false);
        return { success: true };
      }

      return { success: false, error: 'Registration failed. Please try again.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signout error:', err);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('zoolyum_auth_token');
    localStorage.removeItem('zoolyum_auth_user');
  };

  const updateCurrentUser = (userData: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem('zoolyum_auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
