"use client";

import { useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState } from "react";

interface UserInfo {
  id: string;
  email: string;
  name?: string;
  preferences?: {
    industry?: string;
    companySize?: string;
    role?: string;
    interests?: string[];
  };
  chatHistory?: {
    totalChats: number;
    lastActive: string;
  };
}

interface UserInfoContextType {
  userInfo: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const UserInfoContext = createContext<UserInfoContextType | undefined>(undefined);

export function UserInfoProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = async () => {
    if (!session?.user?.id) {
      setUserInfo(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/info?userId=${session.user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching user info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchUserInfo();
    } else if (status === 'unauthenticated') {
      setUserInfo(null);
    }
  }, [session?.user?.id, status]);

  return (
    <UserInfoContext.Provider 
      value={{ 
        userInfo, 
        isLoading, 
        error, 
        refetch: fetchUserInfo 
      }}
    >
      {children}
    </UserInfoContext.Provider>
  );
}

export function useUserInfo() {
  const context = useContext(UserInfoContext);
  if (context === undefined) {
    throw new Error('useUserInfo must be used within a UserInfoProvider');
  }
  return context;
}
