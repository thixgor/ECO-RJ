import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ProfileType = 'student' | 'patient' | null;

interface UserProfileContextType {
  profileType: ProfileType;
  setProfileType: (type: ProfileType) => void;
  hasSelectedProfile: boolean;
  clearProfile: () => void;
}

const STORAGE_KEY = 'eco-rj-user-profile';

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profileType, setProfileTypeState] = useState<ProfileType>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'student' || stored === 'patient') {
      return stored;
    }
    return null;
  });

  useEffect(() => {
    if (profileType) {
      localStorage.setItem(STORAGE_KEY, profileType);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [profileType]);

  const setProfileType = (type: ProfileType) => {
    setProfileTypeState(type);
  };

  const clearProfile = () => {
    setProfileTypeState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <UserProfileContext.Provider
      value={{
        profileType,
        setProfileType,
        hasSelectedProfile: !!profileType,
        clearProfile
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = (): UserProfileContextType => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
