import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole, BranchId, Branch } from '../types';
import { dbService, BRANCHES } from '../services/db';

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole | null;
  currentBranch: BranchId | 'all';
  setCurrentBranch: (branchId: BranchId | 'all') => void;
  branches: Branch[];
  currentBranchDetails: Branch | null;
  login: (identifier: string, passwordInput?: string) => boolean;
  loginAs: (userId: string) => void;
  logout: () => void;
  allUsers: UserProfile[];
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_ID_KEY = 'csk_current_user_id';
const ACTIVE_SESSION_KEY = 'csk_active_session_user';
const SELECTED_BRANCH_KEY = 'csk_selected_branch';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization from persisted storage so user NEVER gets logged out on restart
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedId = localStorage.getItem(CURRENT_USER_ID_KEY);
      if (savedId) {
        const users = dbService.getUsers();
        const found = users.find(u => u.id === savedId);
        if (found) return found;
      }
      const savedSession = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.warn('Could not restore auth session:', e);
    }
    return null;
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => dbService.getUsers());
  const [currentBranch, setCurrentBranchState] = useState<BranchId | 'all'>(() => {
    const saved = localStorage.getItem(SELECTED_BRANCH_KEY);
    return (saved as BranchId | 'all') || 'all';
  });

  const setCurrentBranch = (branchId: BranchId | 'all') => {
    setCurrentBranchState(branchId);
    localStorage.setItem(SELECTED_BRANCH_KEY, branchId);
  };

  const refreshUsers = () => {
    const list = dbService.getUsers();
    setAllUsers(list);
    const savedId = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (savedId) {
      const match = list.find(u => u.id === savedId);
      if (match) {
        setCurrentUser(match);
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(match));
      }
    }
  };

  useEffect(() => {
    const handleDbChange = () => {
      refreshUsers();
    };
    window.addEventListener('educenter-db-change', handleDbChange);

    const users = dbService.getUsers();
    setAllUsers(users);

    // Keep session permanently active until explicit logout
    const savedId = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (savedId) {
      const found = users.find(u => u.id === savedId);
      if (found) {
        setCurrentUser(found);
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(found));
        if ((found.role === 'staff' || found.role === 'manager') && found.branchId) {
          setCurrentBranch(found.branchId);
        }
      }
    } else {
      // Check full session backup
      const savedSession = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.id) {
            setCurrentUser(parsed);
            localStorage.setItem(CURRENT_USER_ID_KEY, parsed.id);
            if ((parsed.role === 'staff' || parsed.role === 'manager') && parsed.branchId) {
              setCurrentBranch(parsed.branchId);
            }
          }
        } catch {}
      }
    }

    return () => {
      window.removeEventListener('educenter-db-change', handleDbChange);
    };
  }, []);

  const login = (identifier: string, passwordInput: string = ''): boolean => {
    const users = dbService.getUsers();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanId) return false;

    // Search across email, username, id, phone, staffId, studentId, managerId, role alias
    const match = users.find(u => {
      const emailMatch = u.email && u.email.toLowerCase() === cleanId;
      const usernameMatch = u.username && u.username.toLowerCase() === cleanId;
      const idMatch = u.id && u.id.toLowerCase() === cleanId;
      const phoneMatch = u.phone && u.phone.trim() === cleanId;
      const staffIdMatch = u.staffId && u.staffId.toLowerCase() === cleanId;
      const studentIdMatch = u.studentId && u.studentId.toLowerCase() === cleanId;
      const managerIdMatch = u.managerId && u.managerId.toLowerCase() === cleanId;
      const roleAliasMatch = u.role === cleanId;

      return emailMatch || usernameMatch || idMatch || phoneMatch || staffIdMatch || studentIdMatch || managerIdMatch || roleAliasMatch;
    });

    if (!match) {
      return false;
    }

    // Verify password against user.password or standard fallback passwords
    const validPasswords = [
      match.password,
      'admin123',
      `${match.role}123`
    ].filter(Boolean) as string[];

    const passwordMatches = validPasswords.some(p => p.toLowerCase() === cleanPass.toLowerCase());

    if (!passwordMatches) {
      return false;
    }

    // Persist login session permanently until logout
    setCurrentUser(match);
    localStorage.setItem(CURRENT_USER_ID_KEY, match.id);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(match));

    if ((match.role === 'staff' || match.role === 'manager') && match.branchId) {
      setCurrentBranch(match.branchId);
    }
    return true;
  };

  const loginAs = (userId: string) => {
    const users = dbService.getUsers();
    const match = users.find(u => u.id === userId);
    if (match) {
      setCurrentUser(match);
      localStorage.setItem(CURRENT_USER_ID_KEY, match.id);
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(match));
      if ((match.role === 'staff' || match.role === 'manager') && match.branchId) {
        setCurrentBranch(match.branchId);
      }
    }
  };

  const logout = () => {
    // Explicit user logout: clear session and return to Login Screen
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_ID_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    window.dispatchEvent(new Event('educenter-db-change'));
  };

  const currentBranchDetails = currentBranch !== 'all' 
    ? (BRANCHES.find(b => b.id === currentBranch) || null)
    : null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        currentBranch,
        setCurrentBranch,
        branches: BRANCHES,
        currentBranchDetails,
        login,
        loginAs,
        logout,
        allUsers,
        refreshUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
