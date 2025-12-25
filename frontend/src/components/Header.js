import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Header component.
 *
 * Displays the application logo and navigation. If a user is
 * authenticated, a logout button is shown; otherwise a login button
 * appears. A “Home” link is positioned on the left.
 */
function Header({ onLoginClick, onLogout, user, theme, onToggleTheme }) {
  const showAdminLink = user?.admin_level >= 2;
  const showModerationLink = user?.admin_level >= 1;

  return (
    <header className="header">
      <div className="header-left">
        <Link className="play-button" to="/">
          Главная
        </Link>
      </div>
      <div className="header-right">
        {showModerationLink && (
          <Link className="auth-button" to="/moderation">
            Модерация
          </Link>
        )}
        {showAdminLink && (
          <Link className="auth-button" to="/admin">
            Администрирование
          </Link>
        )}
        <button className="auth-button theme-toggle" type="button" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
        </button>
        {user ? (
          <>
            <span className="welcome">{user.username}</span>
            <button className="auth-button" onClick={onLogout}>
              Выйти
            </button>
          </>
        ) : (
          <button className="auth-button" onClick={onLoginClick}>
            Войти
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
