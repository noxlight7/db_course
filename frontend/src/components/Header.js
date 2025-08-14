import React from 'react';

/**
 * Header component.
 *
 * Displays the application logo and navigation. If a user is
 * authenticated, a logout button is shown; otherwise a login button
 * appears. A placeholder “Play” button is positioned on the left.
 */
function Header({ onLoginClick, onLogout, user }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="play-button" disabled title="Скоро будет доступно">
          Играть
        </button>
      </div>
      <div className="header-right">
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