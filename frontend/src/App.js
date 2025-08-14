import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

// Base URL for the API. This value can be overridden by providing
// REACT_APP_API_URL in your environment (see .env.example).
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // On mount, check if there is a stored access token and fetch the current user
  useEffect(() => {
    const token = localStorage.getItem('access');
    if (token) {
      axios
        .get(`${API_BASE_URL}/api/users/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
          // Token might be expired; attempt refresh
          handleRefreshToken();
        });
    }
  }, []);

  const handleLoginClick = () => {
    setShowLogin(true);
    setShowRegister(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
  };

  const handleLoginSuccess = (data) => {
    setUser(data.user);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleRegisterClick = () => {
    setShowRegister(true);
    setShowLogin(false);
  };

  const handleRefreshToken = async () => {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
        refresh,
      });
      localStorage.setItem('access', response.data.access);
      // Optionally update refresh token if the backend rotates it
    } catch (error) {
      handleLogout();
    }
  };

  return (
    <div className="App">
      <Header
        onLoginClick={handleLoginClick}
        onLogout={handleLogout}
        user={user}
      />
      <main className="container">
        {!user && <h2>Добро пожаловать! Нажмите «Играть» для начала.</h2>}
        {user && <h2>Привет, {user.username}! Вы можете начать игру.</h2>}
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
  );
}

export default App;