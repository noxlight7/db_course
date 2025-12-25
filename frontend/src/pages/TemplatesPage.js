import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function TemplatesPage({ user, apiBaseUrl, authRequest }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [runs, setRuns] = useState([]);
  const [published, setPublished] = useState([]);
  const [showCreateAdventure, setShowCreateAdventure] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '' });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!user) {
      setTemplates([]);
      setPublished([]);
      return;
    }
    const fetchTemplates = async () => {
      try {
        const response = await authRequest({
          method: 'get',
          url: `${apiBaseUrl}/api/adventures/templates/`,
        });
        setTemplates(response.data);
        const runsResponse = await authRequest({
          method: 'get',
          url: `${apiBaseUrl}/api/adventures/runs/`,
        });
        setRuns(runsResponse.data);
        const publishedResponse = await authRequest({
          method: 'get',
          url: `${apiBaseUrl}/api/adventures/moderation/published/`,
        });
        setPublished(publishedResponse.data);
      } catch (error) {
        setTemplates([]);
        setRuns([]);
        setPublished([]);
      }
    };
    fetchTemplates();
  }, [user, apiBaseUrl, authRequest]);

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAdventure = async (event) => {
    event.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError('Введите название приключения.');
      return;
    }
    setCreateError('');
    setIsCreating(true);
    try {
      const response = await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/adventures/templates/`,
        data: {
          title: createForm.title,
          description: createForm.description,
        },
      });
      setTemplates((prev) => [response.data, ...prev]);
      setShowCreateAdventure(false);
      setCreateForm({ title: '', description: '' });
    } catch (error) {
      setCreateError('Не удалось создать приключение. Попробуйте еще раз.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Удалить приключение? Это действие нельзя отменить.')) return;
    try {
      await authRequest({
        method: 'delete',
        url: `${apiBaseUrl}/api/adventures/templates/${templateId}/`,
      });
      setTemplates((prev) => prev.filter((item) => item.id !== templateId));
    } catch (error) {
      setImportError('Не удалось удалить приключение.');
    }
  };

  const handleDeleteRun = async (runId) => {
    if (!window.confirm('Удалить начатое приключение? Это действие нельзя отменить.')) return;
    try {
      await authRequest({
        method: 'delete',
        url: `${apiBaseUrl}/api/adventures/runs/${runId}/`,
      });
      setRuns((prev) => prev.filter((item) => item.id !== runId));
    } catch (error) {
      setImportError('Не удалось удалить приключение.');
    }
  };

  const handleStartAdventure = async (templateId) => {
    try {
      const response = await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/adventures/templates/${templateId}/start/`,
      });
      const run = response.data;
      setRuns((prev) => [run, ...prev]);
      if (run.primary_hero) {
        navigate(`/adventures/${run.id}/play`);
      } else {
        navigate(`/adventures/${run.id}/hero`);
      }
    } catch (error) {
      setImportError('Не удалось начать приключение.');
    }
  };

  const handleImportAdventure = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError('');
    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const response = await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/adventures/templates/import/`,
        data: payload,
      });
      setTemplates((prev) => [response.data, ...prev]);
    } catch (error) {
      setImportError('Не удалось импортировать приключение. Проверьте JSON.');
    } finally {
      event.target.value = '';
      setIsImporting(false);
    }
  };

  return (
    <div className="templates-page">
      {!user && <h2>Добро пожаловать! Нажмите «Играть» для начала.</h2>}
      {user && (
        <>
          <h2>Привет, {user.username}! Вы можете начать игру.</h2>
          <section className="templates-section">
            <div className="templates-header">
              <h3>Ваши шаблоны приключений</h3>
              <div className="templates-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setShowCreateAdventure(true)}
                >
                  Создать приключение
                </button>
                <label className="secondary-button file-button">
                  Импорт JSON
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImportAdventure}
                    disabled={isImporting}
                  />
                </label>
              </div>
            </div>
            {importError && <div className="error-message">{importError}</div>}
            {templates.length === 0 ? (
              <p className="templates-empty">Пока нет шаблонов. Создайте первое приключение.</p>
            ) : (
              <div className="templates-grid">
                {templates.map((template) => (
                  <article className="template-card" key={template.id}>
                    <h4>{template.title}</h4>
                    {template.description && <p>{template.description}</p>}
                    <div className="template-actions">
                      <Link className="secondary-button" to={`/adventures/${template.id}/edit`}>
                        Изменить
                      </Link>
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => handleStartAdventure(template.id)}
                      >
                        Начать
                      </button>
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="templates-section">
            <div className="templates-header">
              <h3>Начатые приключения</h3>
            </div>
            {runs.length === 0 ? (
              <p className="templates-empty">Пока нет начатых приключений.</p>
            ) : (
              <div className="templates-grid">
                {runs.map((run) => (
                  <article className="template-card" key={run.id}>
                    <h4>{run.title}</h4>
                    {run.description && <p>{run.description}</p>}
                    <div className="template-actions">
                      <Link className="secondary-button" to={`/adventures/runs/${run.id}/edit`}>
                        Изменить
                      </Link>
                      {run.primary_hero ? (
                        <Link className="secondary-button" to={`/adventures/${run.id}/play`}>
                          Открыть
                        </Link>
                      ) : (
                        <Link className="secondary-button" to={`/adventures/${run.id}/hero`}>
                          Открыть
                        </Link>
                      )}
                      {!run.primary_hero && (
                        <Link className="primary-button" to={`/adventures/${run.id}/hero`}>
                          Создать героя
                        </Link>
                      )}
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => handleDeleteRun(run.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="templates-section">
            <div className="templates-header">
              <h3>Опубликованные приключения</h3>
            </div>
            {published.length === 0 ? (
              <p className="templates-empty">Пока нет опубликованных приключений.</p>
            ) : (
              <div className="templates-grid">
                {published.map((entry) => {
                  const isOwner = entry.author_username === user.username;
                  return (
                    <article className="template-card" key={entry.adventure_id}>
                      <h4>{entry.title}</h4>
                      {entry.description && <p>{entry.description}</p>}
                      <div className="template-meta">Автор: {entry.author_username}</div>
                      <div className="template-actions">
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => handleStartAdventure(entry.adventure_id)}
                        >
                          Начать
                        </button>
                        {isOwner && (
                          <Link
                            className="secondary-button"
                            to={`/adventures/${entry.adventure_id}/edit`}
                          >
                            Открыть
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
      {showCreateAdventure && (
        <div className="modal-overlay">
          <div className="modal adventure-modal">
            <button
              className="modal-close"
              type="button"
              onClick={() => setShowCreateAdventure(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <div className="modal-content">
              <h3>Новое приключение</h3>
              {createError && <div className="error-message">{createError}</div>}
              <form onSubmit={handleCreateAdventure}>
                <label>
                  Название приключения
                  <input
                    name="title"
                    value={createForm.title}
                    onChange={handleCreateChange}
                    required
                  />
                </label>
                <label>
                  Описание
                  <textarea
                    name="description"
                    rows="3"
                    value={createForm.description}
                    onChange={handleCreateChange}
                  />
                </label>
                <div className="modal-actions">
                  <button className="submit-button" type="submit" disabled={isCreating}>
                    Создать
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setShowCreateAdventure(false)}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;
