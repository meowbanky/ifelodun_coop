import PropTypes from "prop-types";
import { createContext, useState, useContext, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Checking auth on mount...");
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    console.log("checkAuth: Token found:", token);

    if (token) {
      try {
        const response = await api.get("/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`, // Ensure token is sent
          },
        });
        console.log("checkAuth: User profile:", response.data.data);
        setUser(response.data.data);
      } catch (error) {
        console.error("checkAuth: Failed to fetch profile:", error);
        localStorage.removeItem("token");
        setUser(null);
      }
    } else {
      console.log("checkAuth: No token, user remains null");
    }
    setLoading(false);
    console.log("checkAuth: Loading set to false");
  };

  const login = async (username, password) => {
    try {
      console.log("login: Attempting login with:", { username });
      const response = await api.post("/auth/login", { username, password });
      const { token } = response.data.data;
      console.log("login: Login successful, token:", token);
      localStorage.setItem("token", token);
      await checkAuth(); // Refresh user data after login
    } catch (error) {
      console.error("login: Login failed:", error);
      throw error; // Propagate error to Login component
    }
  };

  const logout = () => {
    console.log("logout: Logging out user");
    localStorage.removeItem("token");
    setUser(null);
  };

  console.log("AuthProvider: Rendering with user:", user, "loading:", loading);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
