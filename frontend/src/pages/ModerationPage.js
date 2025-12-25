import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function ModerationPage({ user, apiBaseUrl, authRequest }) {
  const [queue, setQueue] = useState([]);
  const [published, setPublished] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [error, setError] = useState('');

  const isModerator = user?.admin_level >= 1;

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const response = await authRequest({
        method: 'get',
        url: `${apiBaseUrl}/api/adventures/moderation/queue/`,
      });
      setQueue(response.data);
    } catch (err) {
      setError('Не удалось загрузить очередь модерации.');
    } finally {
      setLoadingQueue(false);
    }
  }, [apiBaseUrl, authRequest]);

  const fetchPublished = useCallback(async () => {
    setLoadingPublished(true);
    try {
      const response = await authRequest({
        method: 'get',
        url: `${apiBaseUrl}/api/adventures/moderation/published/`,
      });
      setPublished(response.data);
    } catch (err) {
      setError('Не удалось загрузить опубликованные приключения.');
    } finally {
      setLoadingPublished(false);
    }
  }, [apiBaseUrl, authRequest]);

  useEffect(() => {
    if (!isModerator) return;
    fetchQueue();
    fetchPublished();
  }, [isModerator, fetchQueue, fetchPublished]);

  const handleDecision = async (adventureId, decision) => {
    setError('');
    try {
      await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/adventures/moderation/${adventureId}/${decision}/`,
      });
      setQueue((prev) => prev.filter((item) => item.adventure_id !== adventureId));
      if (decision === 'publish') {
        fetchPublished();
      }
    } catch (err) {
      setError('Не удалось выполнить действие модерации.');
    }
  };

  if (!isModerator) {
    return (
      <section className="moderation-page">
        <h2>Модерация</h2>
        <p className="admin-note">Раздел доступен только модераторам.</p>
      </section>
    );
  }

  return (
    <section className="moderation-page">
      <div className="moderation-header">
        <div>
          <h2>Очередь модерации</h2>
          <p className="admin-note">Проверяйте приключения и принимайте решение.</p>
        </div>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="moderation-list">
        {loadingQueue && <p>Загрузка...</p>}
        {!loadingQueue && queue.length === 0 && (
          <p className="admin-note">Очередь модерации пуста.</p>
        )}
        {!loadingQueue && queue.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Приключение</th>
                <th>Автор</th>
                <th>Отправлено</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((entry) => (
                <tr key={entry.adventure_id}>
                  <td>{entry.title}</td>
                  <td>{entry.author_username}</td>
                  <td>{new Date(entry.submitted_at).toLocaleString()}</td>
                  <td className="moderation-actions">
                    <Link className="secondary-button" to={`/adventures/${entry.adventure_id}/edit`}>
                      Открыть
                    </Link>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => handleDecision(entry.adventure_id, 'publish')}
                    >
                      Опубликовать
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleDecision(entry.adventure_id, 'reject')}
                    >
                      Отклонить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="moderation-header">
        <div>
          <h2>Опубликованные приключения</h2>
          <p className="admin-note">Можно просматривать опубликованные приключения.</p>
        </div>
      </div>
      <div className="moderation-list">
        {loadingPublished && <p>Загрузка...</p>}
        {!loadingPublished && published.length === 0 && (
          <p className="admin-note">Опубликованных приключений пока нет.</p>
        )}
        {!loadingPublished && published.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Приключение</th>
                <th>Автор</th>
                <th>Опубликовано</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {published.map((entry) => (
                <tr key={entry.adventure_id}>
                  <td>{entry.title}</td>
                  <td>{entry.author_username}</td>
                  <td>{new Date(entry.published_at).toLocaleString()}</td>
                  <td className="moderation-actions">
                    <Link className="secondary-button" to={`/adventures/${entry.adventure_id}/edit`}>
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default ModerationPage;
