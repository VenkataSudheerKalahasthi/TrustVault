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

  // Ensure token getter is available immediately synchronously and on update
  if (getToken) {
    setTokenGetter(() => getToken());
  }

  useEffect(() => {
    if (getToken) {
      setTokenGetter(() => getToken());
    }
  }, [getToken]);

  const {
    data: profileResponse,
    isLoading: isProfileLoading,
    refetch,
  } = useQuery({
    queryKey: ['authMe', clerkUser?.id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication session token is still initializing');
      }
      return apiRequest<{ success: boolean; data: ApplicationUser }>('/auth/me');
    },
    enabled: Boolean(isClerkLoaded && isSignedIn && clerkUser?.id),
    staleTime: 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
  });

  const email = (clerkUser?.primaryEmailAddress?.emailAddress || '').toLowerCase();
  const allowlistedAdmins = ['siriboddapati10@gmail.com', 'sudheercse510@gmail.com', 'admin@trustvault.security'];
  const isAllowlisted = allowlistedAdmins.includes(email);
  const clerkRole = (clerkUser?.publicMetadata?.role as any) || (clerkUser?.unsafeMetadata?.requestedRole as any);

  const user = profileResponse?.data || (clerkUser ? {
    id: clerkUser.id,
    clerkId: clerkUser.id,
    email: email,
    firstName: clerkUser.firstName || '',
    lastName: clerkUser.lastName || '',
    imageUrl: clerkUser.imageUrl || null,
    role: (isAllowlisted ? 'ADMIN' : (clerkRole || 'VIEWER')),
    isActive: true,
    createdAt: new Date().toISOString(),
  } as ApplicationUser : null);

  const role = user?.role || (isAllowlisted ? 'ADMIN' : (clerkRole || 'VIEWER'));
  const isAdmin = role === 'ADMIN' || isAllowlisted || clerkRole === 'ADMIN';
  const isOwner = role === 'DOCUMENT_OWNER' || isAdmin || clerkRole === 'DOCUMENT_OWNER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isOwner,
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

