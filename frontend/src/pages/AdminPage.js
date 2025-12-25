import React, { useEffect, useState, useCallback } from 'react';

function AdminPage({ user, apiBaseUrl, authRequest }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [levelDrafts, setLevelDrafts] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [rowSaving, setRowSaving] = useState({});

  const currentLevel = user?.admin_level ?? null;
  const canCreate = currentLevel !== null && currentLevel >= 2;
  const maxLevel = canCreate ? currentLevel - 1 : 0;

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authRequest({
        method: 'get',
        url: `${apiBaseUrl}/api/users/admins/`,
      });
      setAdmins(response.data);
      const drafts = {};
      response.data.forEach((admin) => {
        drafts[admin.id] = admin.level;
      });
      setLevelDrafts(drafts);
    } catch (err) {
      setError('Не удалось загрузить список администраторов.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authRequest]);

  useEffect(() => {
    if (!currentLevel) {
      setLoading(false);
      return;
    }
    fetchAdmins();
  }, [currentLevel, fetchAdmins]);

  const handleAddAdmin = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!canCreate) {
      setFormError('Недостаточно прав для добавления администраторов.');
      return;
    }
    const parsedLevel = Number(level);
    if (!username.trim()) {
      setFormError('Введите имя пользователя.');
      return;
    }
    if (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > maxLevel) {
      setFormError(`Уровень должен быть от 1 до ${maxLevel}.`);
      return;
    }
    try {
      await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/users/admins/`,
        data: { username: username.trim(), level: parsedLevel },
      });
      setUsername('');
      setLevel('');
      setFormSuccess('Администратор добавлен.');
      fetchAdmins();
    } catch (err) {
      const message = err.response?.data?.username || err.response?.data?.level || 'Не удалось добавить администратора.';
      setFormError(message);
    }
  };

  const handleRemove = async (adminId) => {
    setError('');
    try {
      await authRequest({
        method: 'delete',
        url: `${apiBaseUrl}/api/users/admins/${adminId}/`,
      });
      setAdmins((prev) => prev.filter((item) => item.id !== adminId));
    } catch (err) {
      setError('Не удалось удалить администратора.');
    }
  };

  const handleLevelChange = (adminId, value) => {
    setLevelDrafts((prev) => ({
      ...prev,
      [adminId]: value,
    }));
  };

  const handleSaveLevel = async (adminId) => {
    const draft = levelDrafts[adminId];
    const parsedLevel = Number(draft);
    if (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > maxLevel) {
      setRowErrors((prev) => ({
        ...prev,
        [adminId]: `Уровень должен быть от 1 до ${maxLevel}.`,
      }));
      return;
    }
    setRowSaving((prev) => ({ ...prev, [adminId]: true }));
    setRowErrors((prev) => ({ ...prev, [adminId]: '' }));
    try {
      const response = await authRequest({
        method: 'patch',
        url: `${apiBaseUrl}/api/users/admins/${adminId}/`,
        data: { level: parsedLevel },
      });
      setAdmins((prev) =>
        prev.map((admin) => (admin.id === adminId ? response.data : admin))
      );
      setLevelDrafts((prev) => ({ ...prev, [adminId]: parsedLevel }));
    } catch (err) {
      const message = err.response?.data?.level || 'Не удалось изменить уровень.';
      setRowErrors((prev) => ({ ...prev, [adminId]: message }));
    } finally {
      setRowSaving((prev) => ({ ...prev, [adminId]: false }));
    }
  };

  if (!currentLevel) {
    return (
      <section className="admin-page">
        <h2>Администрирование</h2>
        <p className="admin-note">Раздел доступен только администраторам.</p>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Администраторы</h2>
          <p className="admin-note">Ваш уровень: {currentLevel}</p>
        </div>
      </div>
      {canCreate && (
        <form className="admin-form" onSubmit={handleAddAdmin}>
          <div className="admin-form-row">
            <label>
              Имя пользователя
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
              />
            </label>
            <label>
              Уровень
              <input
                type="number"
                min="1"
                max={maxLevel}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                placeholder={`1 - ${maxLevel}`}
              />
            </label>
            <button type="submit" className="primary-button">
              Добавить
            </button>
          </div>
          {formError && <p className="error-message">{formError}</p>}
          {formSuccess && <p className="success-message">{formSuccess}</p>}
        </form>
      )}
      {!canCreate && (
        <p className="admin-note admin-restricted">
          Добавление администраторов доступно только с уровня 2.
        </p>
      )}
      <div className="admin-list">
        {loading && <p>Загрузка...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && !error && admins.length === 0 && (
          <p className="admin-note">Администраторы не найдены.</p>
        )}
        {!loading && admins.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Email</th>
                <th>Уровень</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const canRemove = currentLevel > admin.level;
                const canEditLevel = currentLevel >= 2 && currentLevel > admin.level;
                const draftValue = levelDrafts[admin.id] ?? admin.level;
                const parsedDraft = Number(draftValue);
                const levelValid =
                  Number.isInteger(parsedDraft) && parsedDraft >= 1 && parsedDraft <= maxLevel;
                const unchanged = parsedDraft === admin.level;
                return (
                  <tr key={admin.id}>
                    <td>{admin.user.username}</td>
                    <td>{admin.user.email}</td>
                    <td>
                      <div className="admin-level-cell">
                        <input
                          type="number"
                          min="1"
                          max={maxLevel}
                          step="1"
                          value={draftValue}
                          onChange={(event) => handleLevelChange(admin.id, event.target.value)}
                          disabled={!canEditLevel}
                        />
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={!canEditLevel || !levelValid || unchanged || rowSaving[admin.id]}
                          onClick={() => handleSaveLevel(admin.id)}
                        >
                          {rowSaving[admin.id] ? '...' : 'Сохранить'}
                        </button>
                      </div>
                      {rowErrors[admin.id] && (
                        <div className="error-message">{rowErrors[admin.id]}</div>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={!canRemove}
                        onClick={() => handleRemove(admin.id)}
                        title={
                          canRemove
                            ? 'Удалить администратора'
                            : 'Можно удалить только администратора с уровнем ниже вашего'
                        }
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default AdminPage;
