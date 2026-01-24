import { useState } from "react";
import { storage } from "../utils/localStorage";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = storage.getUser();
    const token = storage.getToken();
    return savedUser && token ? savedUser : null;
  });

  const [loading] = useState(false);
  
  const value = {
        user,
        setUser,
        isAuthenticated: !!user,
        loading,
      };

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};
