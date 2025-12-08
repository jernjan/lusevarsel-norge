import React, { createContext, useState, useContext, useEffect } from 'react';

export interface User {
  email: string;
  company: string;
  facilities: number[]; // lokalitetsnummer kunden eier
  vessels: string[]; // MMSI eller navn på kundens båter
}

interface AuthContextType {
  user: User | null;
  login: (email: string, company: string) => void;
  updateFacilities: (facilities: number[]) => void;
  updateVessels: (vessels: string[]) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isSetupComplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('lusevarsel_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to load user from localStorage:', error);
      }
    }
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('lusevarsel_user', JSON.stringify(user));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('lusevarsel_user');
      setIsAuthenticated(false);
    }
  }, [user]);

  const login = (email: string, company: string) => {
    setUser({ email, company, facilities: [], vessels: [] });
  };

  const updateFacilities = (facilities: number[]) => {
    setUser(prev => prev ? { ...prev, facilities } : null);
  };

  const updateVessels = (vessels: string[]) => {
    setUser(prev => prev ? { ...prev, vessels } : null);
  };

  const logout = () => {
    setUser(null);
  };

  const isSetupComplete = user ? (user.facilities.length > 0 || user.vessels.length > 0) : false;

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        updateFacilities, 
        updateVessels, 
        logout, 
        isAuthenticated,
        isSetupComplete
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
