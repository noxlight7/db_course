import React, { useState } from 'react';
import axios from 'axios';

/**
 * Login form component.
 *
 * Presents inputs for username and password. On submit, obtains JWT
 * tokens from the backend and then fetches the user's profile. On
 * success, invokes `onLoginSuccess` with the user data; on failure,
 * displays an error message.
 */
function LoginForm({ onClose, onSwitchToRegister, onLoginSuccess, apiBaseUrl }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Obtain access and refresh tokens
      const tokenResponse = await axios.post(`${apiBaseUrl}/api/auth/token/`, {
        username,
        password,
      });
      const { access, refresh } = tokenResponse.data;
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      // Fetch current user profile
      const userResponse = await axios.get(`${apiBaseUrl}/api/users/me/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      onLoginSuccess({ user: userResponse.data });
    } catch (err) {
      setError('Неправильный логин или пароль.');
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Вход</h3>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>
            Логин
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="submit-button">
            Войти
          </button>
        </form>
        <p className="switch-form">
          Нет аккаунта?{' '}
          <button type="button" className="link-button" onClick={onSwitchToRegister}>
            Зарегистрироваться
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;