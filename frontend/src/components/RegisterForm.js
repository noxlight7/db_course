import React, { useState } from 'react';
import axios from 'axios';

/**
 * Register form component.
 *
 * Presents inputs for username, email, password and password confirmation.
 * When the form is submitted it calls the backend to create a new user,
 * then immediately obtains a JWT and fetches the user's profile. Upon
 * success, it invokes `onRegisterSuccess` with the user data.
 */
function RegisterForm({ onClose, onSwitchToLogin, onRegisterSuccess, apiBaseUrl }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }
    try {
      // Create the user
      await axios.post(`${apiBaseUrl}/api/users/register/`, {
        username,
        email,
        password,
        password2: confirmPassword,
      });
      // Auto‑login after registration
      const tokenResponse = await axios.post(`${apiBaseUrl}/api/auth/token/`, {
        username,
        password,
      });
      const { access, refresh } = tokenResponse.data;
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      const userResponse = await axios.get(`${apiBaseUrl}/api/users/me/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      onRegisterSuccess({ user: userResponse.data });
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        // Show the first error message returned by the API
        const firstKey = Object.keys(data)[0];
        setError(Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]);
      } else {
        setError('Ошибка регистрации.');
      }
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Регистрация</h3>
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
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <label>
            Подтверждение пароля
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="submit-button">
            Зарегистрироваться
          </button>
        </form>
        <p className="switch-form">
          Уже есть аккаунт?{' '}
          <button type="button" className="link-button" onClick={onSwitchToLogin}>
            Войти
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;