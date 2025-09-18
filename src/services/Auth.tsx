import { createContext, useContext, useState, useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsonDatabaseService, UserData, SessionData } from './JSONDatabaseService';

// Define user type - mantém compatibilidade com o frontend
interface User {
  $id: string;
  email: string;
  name: string;
  password: string;
  created_at: string;
}

// Define types
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, redirectPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  isAuthenticated: boolean;
  sessionCheckedAt: number;
}

// Create context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  checkSession: async () => {},
  isAuthenticated: false,
  sessionCheckedAt: 0,
});

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Auth provider component
export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionCheckedAt, setSessionCheckedAt] = useState<number>(0);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const navigate = useNavigate();

  // Check if user is logged in on mount
  useEffect(() => {
    checkSession();
    
    // Set up periodic session check
    const intervalId = setInterval(() => {
      // Only check if we have a session and last check was more than interval ago
      if (currentSession && Date.now() - sessionCheckedAt > SESSION_CHECK_INTERVAL) {
        checkSession();
      }
    }, SESSION_CHECK_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, []);

  // Login function using JSON database
  const login = async (email: string, password: string, redirectPath?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // First, query the JSON database to find the user with the provided email
      const userData = await jsonDatabaseService.getUserByEmail(email);
      
      if (!userData) {
        setError('Usuário não encontrado. Verifique suas credenciais.');
        return;
      }
      
      // Verify password hash using SHA256
      const hashedPassword = await hashPasswordWithWebCrypto(password);
      
      if (hashedPassword !== userData.password) {
        setError('Senha inválida. Tente novamente.');
        return;
      }
      
      // Create a new session for this user
      const session = await createSession(userData.id);
      
      if (!session) {
        setError('Falha ao criar sessão. Tente novamente.');
        return;
      }
      
      // Convert UserData to User for compatibility
      const user: User = {
        $id: userData.id,
        email: userData.email,
        name: userData.name,
        password: userData.password,
        created_at: userData.createdAt
      };
      
      // Store user data and session in state
      setUser(user);
      setIsAuthenticated(true);
      setCurrentSession(session);
      setSessionCheckedAt(Date.now());
      
      // Redirect after login if path is provided
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Create a new session for a user
  const createSession = async (userId: string): Promise<SessionData | null> => {
    try {
      // Generate a unique session token
      const token = generateSessionToken();
      
      // Create session expiration date (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Session data
      const sessionData: Omit<SessionData, 'id' | 'createdAt'> = {
        userId,
        token,
        userAgent: navigator.userAgent.substring(0, 255),
        expiresAt: expiresAt.toISOString(),
        isActive: true,
      };
      
      // Create session in JSON database
      const session = await jsonDatabaseService.createSession(sessionData);
      
      // Store session token in local storage
      localStorage.setItem('sessionToken', token);
      
      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      
      // If we have a session, deactivate it
      if (currentSession) {
        await deactivateSession(currentSession.id);
      } else {
        // If no session in state, try to get current session
        const session = await getCurrentSession();
        if (session) {
          await deactivateSession(session.id);
        }
      }
      
      // Clear user data
      setUser(null);
      setIsAuthenticated(false);
      setCurrentSession(null);
      setSessionCheckedAt(Date.now());
      
      // Redirect to login
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      // Force clear session if logout fails
      localStorage.removeItem('sessionToken');
      setUser(null);
      setIsAuthenticated(false);
      setCurrentSession(null);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // Deactivate a session
  const deactivateSession = async (sessionId: string): Promise<void> => {
    try {
      await jsonDatabaseService.updateSession(sessionId, { isActive: false });
      
      // Remove session token from local storage
      localStorage.removeItem('sessionToken');
    } catch (error) {
      console.error('Error deactivating session:', error);
    }
  };

  // Get current session
  const getCurrentSession = async (): Promise<SessionData | null> => {
    const token = localStorage.getItem('sessionToken');
    
    if (!token) {
      return null;
    }
    
    return await validateSession(token);
  };

  // Validate a session
  const validateSession = async (token: string): Promise<SessionData | null> => {
    try {
      console.log('Validating session with token:', token.substring(0, 10) + '...');
      
      // Get session from JSON database
      const session = await jsonDatabaseService.getSessionByToken(token);
      
      if (!session) {
        console.log('No session found with this token');
        return null;
      }
      
      console.log('Session found:', session.id, 'for user:', session.userId);
      
      // Check if session is active
      if (!session.isActive) {
        console.log('Session found, but is inactive');
        return null;
      }
      
      // Check if session has expired
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();
      console.log('Session expires at:', expiresAt, 'Now:', now);
      
      if (expiresAt < now) {
        // Session has expired, deactivate it
        console.log('Session expired, deactivating');
        await deactivateSession(session.id);
        return null;
      }
      
      console.log('Session valid and active');
      return session;
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  };

  // Check session function
  const checkSession = async () => {
    try {
      // If we checked recently, don't check again
      const now = Date.now();
      if (now - sessionCheckedAt < 10000) { // Don't check more than once every 10 seconds
        return;
      }
      
      setLoading(true);
      
      // Get current session
      const session = await getCurrentSession();
      setCurrentSession(session);
      setSessionCheckedAt(now);
      
      if (!session) {
        // No valid session found
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      
      // Fetch user data from JSON database using the session's userId
      try {
        const userData = await jsonDatabaseService.getUser(session.userId);
        
        if (!userData) {
          // User not found, deactivate session
          await deactivateSession(session.id);
          setUser(null);
          setIsAuthenticated(false);
          setCurrentSession(null);
          return;
        }
        
        // Convert UserData to User for compatibility
        const user: User = {
          $id: userData.id,
          email: userData.email,
          name: userData.name,
          password: userData.password,
          created_at: userData.createdAt
        };
        
        setUser(user);
        setIsAuthenticated(true);
      } catch (err) {
        // Error fetching user or user not found
        console.error('Error fetching user data:', err);
        setUser(null);
        setIsAuthenticated(false);
        
        // Deactivate invalid session
        await deactivateSession(session.id);
        setCurrentSession(null);
      }
    } catch (err) {
      // Error checking session
      console.error('Session check error:', err);
      setUser(null);
      setIsAuthenticated(false);
      setCurrentSession(null);
    } finally {
      setLoading(false);
    }
  };

  // Generate a random session token
  const generateSessionToken = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token;
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkSession,
    isAuthenticated,
    sessionCheckedAt,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hash password using Web Crypto API (browser)
async function hashPasswordWithWebCrypto(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

export default AuthProvider;