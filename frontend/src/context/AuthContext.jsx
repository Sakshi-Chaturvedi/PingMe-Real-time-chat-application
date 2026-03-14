import { createContext, useContext, useState, useEffect } from "react";
import { getProfile, signIn, signUp, signOut, verifyUser } from "../api";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await getProfile();
        if (data.success) {
          setUser(data.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await signIn({ email, password });
    if (data.success) {
      setUser(data.user);
    }
    return data;
  };

  const register = async (formData) => {
    const { data } = await signUp(formData);
    return data;
  };

  const verify = async (formData) => {
    const { data } = await verifyUser(formData);
    if (data.success) {
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, verify, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
