import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isRegistered?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  setUserRegistered: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user;
      if (currentUser) {
        const isRegistered = await checkRegistrationStatus(currentUser.email!);
        setUser({
          id: currentUser.id,
          email: currentUser.email!,
          name: currentUser.user_metadata.full_name,
          picture: currentUser.user_metadata.avatar_url,
          isRegistered: isRegistered,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const setUserRegistered = () => {
    if (user) {
      setUser({ ...user, isRegistered: true });
    }
  };

  const checkRegistrationStatus = async (email: string): Promise<boolean> => {
    if (!email) return false;
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('email')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116: 'exact-one' violation (no rows) - this is ok
        console.error('Error checking registration status:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error in checkRegistrationStatus:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    setUserRegistered,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};