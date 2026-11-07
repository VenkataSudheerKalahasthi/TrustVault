import React, { createContext, useContext, useEffect } from 'react';
import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, setTokenGetter } from '../services/api';
import { ApplicationUser } from '../types';

interface AuthContextType {
  user: ApplicationUser | null;
  role: 'ADMIN' | 'DOCUMENT_OWNER' | 'VIEWER';
  isAdmin: boolean;
  isOwner: boolean;
  isViewer: boolean;
  isLoading: boolean;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'VIEWER',
  isAdmin: false,
  isOwner: false,
  isViewer: true,
  isLoading: true,
  refetchUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken, isSignedIn, isLoaded: isClerkLoaded } = useAuth();
  const { user: clerkUser } = useClerkUser();

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  const {
    data: profileResponse,
    isLoading: isProfileLoading,
    refetch,
  } = useQuery({
    queryKey: ['authMe', clerkUser?.id],
    queryFn: () => apiRequest<{ success: boolean; data: ApplicationUser }>('/auth/me'),
    enabled: Boolean(isClerkLoaded && isSignedIn),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const user = profileResponse?.data || null;
  const role = user?.role || 'VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin: role === 'ADMIN',
        isOwner: role === 'DOCUMENT_OWNER' || role === 'ADMIN',
        isViewer: true,
        isLoading: isClerkLoaded ? (isSignedIn ? isProfileLoading : false) : true,
        refetchUser: refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAppAuth = () => useContext(AuthContext);

