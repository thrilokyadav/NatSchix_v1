import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../supabaseClient';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isRegistered?: boolean;
  role?: string;
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
  const sessionRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Try to get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session from Supabase:', error);
        }

        console.log('Session data:', session);
        const currentUser = session?.user;
        if (currentUser) {
          console.log('User found in session:', currentUser.email);
          const { isRegistered, role } = await checkRegistrationStatus(currentUser.email!);
          const userData = {
            id: currentUser.id,
            email: currentUser.email!,
            name: currentUser.user_metadata.full_name || currentUser.email!.split('@')[0],
            picture: currentUser.user_metadata.avatar_url,
            isRegistered: isRegistered,
            role: role,
          };
          
          // Store user data in localStorage as backup
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        } else {
          console.log('No user in session');
          
          // Fallback: Try to get user from localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            console.log('Restoring user from localStorage');
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } catch (parseError) {
              console.error('Error parsing stored user:', parseError);
              localStorage.removeItem('user'); // Remove corrupted data
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        
        // Fallback: Try to get user from localStorage
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            console.log('Restoring user from localStorage after error');
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } catch (parseError) {
              console.error('Error parsing stored user:', parseError);
              localStorage.removeItem('user'); // Remove corrupted data
              setUser(null);
            }
          }
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          setUser(null);
        }
      } finally {
        console.log('Auth initialization complete');
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      try {
        const currentUser = session?.user;
        if (currentUser) {
          console.log('User logged in:', currentUser.email);
          const { isRegistered, role } = await checkRegistrationStatus(currentUser.email!);
          const userData = {
            id: currentUser.id,
            email: currentUser.email!,
            name: currentUser.user_metadata.full_name || currentUser.email!.split('@')[0],
            picture: currentUser.user_metadata.avatar_url,
            isRegistered: isRegistered,
            role: role,
          };
          
          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        } else {
          console.log('User logged out or session expired');
          // Clean up localStorage on logout
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        const currentUser = session?.user;
        if (currentUser) {
          console.log('Setting user with default values due to error');
          const userData = {
            id: currentUser.id,
            email: currentUser.email!,
            name: currentUser.user_metadata.full_name || currentUser.email!.split('@')[0],
            picture: currentUser.user_metadata.avatar_url,
            isRegistered: false,
            role: 'user',
          };
          
          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        } else {
          // Clean up localStorage on logout
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    });

    // Set up periodic session refresh
    sessionRefreshInterval.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Update localStorage with current user data
          const { isRegistered, role } = await checkRegistrationStatus(session.user.email!);
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.full_name || session.user.email!.split('@')[0],
            picture: session.user.user_metadata.avatar_url,
            isRegistered: isRegistered,
            role: role,
          };
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          // If no session, clear localStorage
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error during session refresh:', error);
        // On error, try to restore from localStorage as fallback
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          setUser(null);
        }
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => {
      authListener.subscription.unsubscribe();
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current);
      }
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
    // Clean up localStorage on logout
    localStorage.removeItem('user');
  };

  const setUserRegistered = () => {
    if (user) {
      setUser({ ...user, isRegistered: true });
    }
  };

  const checkRegistrationStatus = async (email: string): Promise<{ isRegistered: boolean; role: string }> => {
    if (!email) {
      console.log('checkRegistrationStatus: No email provided');
      return { isRegistered: false, role: 'user' };
    }

    console.log('checkRegistrationStatus: Checking for email:', email);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Registration check timeout')), 5000);
      });

      const queryPromise = supabase
        .from('registrations')
        .select('email, role')
        .eq('email', email)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      console.log('checkRegistrationStatus: Query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking registration status:', error);
        return { isRegistered: false, role: 'user' };
      }

      const isRegistered = !!data;
      const role = data?.role || 'user';
      console.log('checkRegistrationStatus: Final result:', { isRegistered, role });
      return { isRegistered, role };
    } catch (error) {
      console.error('Error in checkRegistrationStatus:', error);
      return { isRegistered: false, role: 'user' };
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