import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import AdventureEditPage from './pages/AdventureEditPage';
import GamePage from './pages/GamePage';
import HeroSetupPage from './pages/HeroSetupPage';
import TemplatesPage from './pages/TemplatesPage';

// Base URL for the API. This value can be overridden by providing
// REACT_APP_API_URL in your environment (see .env.example).
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleLoginClick = () => {
    setShowLogin(true);
    setShowRegister(false);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
  }, []);

  const handleLoginSuccess = (data) => {
    setUser(data.user);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleRegisterClick = () => {
    setShowRegister(true);
    setShowLogin(false);
  };

  const handleRefreshToken = useCallback(async () => {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) return false;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
        refresh,
      });
      localStorage.setItem('access', response.data.access);
      // Optionally update refresh token if the backend rotates it
      return true;
    } catch (error) {
      handleLogout();
      return false;
    }
  }, [handleLogout]);

  const authRequest = useCallback(
    async (config) => {
      const token = localStorage.getItem('access');
      if (!token) {
        throw new Error('No access token');
      }
      try {
        return await axios({
          ...config,
          headers: {
            ...(config.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        if (error.response?.status === 401) {
          const refreshed = await handleRefreshToken();
          if (refreshed) {
            const retryToken = localStorage.getItem('access');
            return await axios({
              ...config,
              headers: {
                ...(config.headers || {}),
                Authorization: `Bearer ${retryToken}`,
              },
            });
          }
        }
        throw error;
      }
    },
    [handleRefreshToken]
  );

  // On mount, check if there is a stored access token and fetch the current user
  useEffect(() => {
    const token = localStorage.getItem('access');
    if (!token) return;
    const fetchUser = async () => {
      try {
        const response = await authRequest({
          method: 'get',
          url: `${API_BASE_URL}/api/users/me/`,
        });
        setUser(response.data);
      } catch (error) {
        setUser(null);
      }
    };
    fetchUser();
  }, [authRequest]);

  return (
    <BrowserRouter>
      <div className="App">
        <Header onLoginClick={handleLoginClick} onLogout={handleLogout} user={user} />
        <main className="container">
          <Routes>
            <Route
              path="/"
              element={
                <TemplatesPage
                  user={user}
                  apiBaseUrl={API_BASE_URL}
                  authRequest={authRequest}
                />
              }
            />
            <Route
              path="/adventures/:id/edit"
              element={
                <AdventureEditPage
                  user={user}
                  apiBaseUrl={API_BASE_URL}
                  authRequest={authRequest}
                />
              }
            />
            <Route
              path="/adventures/runs/:id/edit"
              element={
                <AdventureEditPage
                  user={user}
                  apiBaseUrl={API_BASE_URL}
                  authRequest={authRequest}
                  entityScope="runs"
                />
              }
            />
            <Route
              path="/adventures/:id/hero"
              element={<HeroSetupPage apiBaseUrl={API_BASE_URL} authRequest={authRequest} />}
            />
            <Route
              path="/adventures/:id/play"
              element={<GamePage apiBaseUrl={API_BASE_URL} authRequest={authRequest} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {showLogin && (
          <div className="modal-overlay">
            <LoginForm
              onClose={() => setShowLogin(false)}
              onSwitchToRegister={handleRegisterClick}
              onLoginSuccess={handleLoginSuccess}
              apiBaseUrl={API_BASE_URL}
            />
          </div>
        )}
        {showRegister && (
          <div className="modal-overlay">
            <RegisterForm
              onClose={() => setShowRegister(false)}
              onSwitchToLogin={handleLoginClick}
              onRegisterSuccess={handleLoginSuccess}
              apiBaseUrl={API_BASE_URL}
            />
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
