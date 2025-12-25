import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function GamePage({ apiBaseUrl, authRequest }) {
  const { id } = useParams();
  const runId = Number(id);
  const [characters, setCharacters] = useState([]);
  const [history, setHistory] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [asHero, setAsHero] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [runInfo, setRunInfo] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const [charsResponse, historyResponse, runResponse] = await Promise.all([
          authRequest({
            method: 'get',
            url: `${apiBaseUrl}/api/adventures/runs/${runId}/characters/party/`,
          }),
          authRequest({
            method: 'get',
            url: `${apiBaseUrl}/api/adventures/runs/${runId}/history/`,
          }),
          authRequest({
            method: 'get',
            url: `${apiBaseUrl}/api/adventures/runs/${runId}/`,
          }),
        ]);
        setCharacters(charsResponse.data);
        setHistory(historyResponse.data);
        setRunInfo(runResponse.data);
      } catch (err) {
        setError('Не удалось загрузить приключение.');
      }
    };
    fetchState();
  }, [apiBaseUrl, authRequest, runId]);

  const handleSubmitPrompt = async (event) => {
    event.preventDefault();
    if (!prompt.trim() || submitting || generating || historyBusy) return;
    setError('');
    setSubmitting(true);
    try {
      if (asHero) {
        const response = await authRequest({
          method: 'post',
          url: `${apiBaseUrl}/api/adventures/runs/${runId}/history/hero/`,
          data: { content: prompt.trim() },
        });
        const userEntry = response.data.user_entry;
        const aiEntry = response.data.ai_entry;
        setHistory((prev) => [...prev, userEntry, aiEntry].filter(Boolean));
      } else {
        const response = await authRequest({
          method: 'post',
          url: `${apiBaseUrl}/api/adventures/runs/${runId}/history/`,
          data: { content: prompt.trim() },
        });
        setHistory((prev) => [...prev, response.data]);
      }
      setPrompt('');
    } catch (err) {
      setError('Не удалось отправить сообщение.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateNext = async () => {
    if (generating || submitting || historyBusy) return;
    setError('');
    setGenerating(true);
    try {
      const response = await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/adventures/runs/${runId}/history/next/`,
      });
      setHistory((prev) => [...prev, response.data]);
    } catch (err) {
      setError('Не удалось получить продолжение.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRollback = async (entryId) => {
    if (historyBusy || submitting || generating) return;
    setHistoryBusy(true);
    setError('');
    try {
      await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/adventures/runs/${runId}/history/${entryId}/rollback/`,
      });
      setHistory((prev) => prev.filter((entry) => entry.id <= entryId));
    } catch (err) {
      setError('Не удалось откатить историю.');
    } finally {
      setHistoryBusy(false);
    }
  };

  const handleRegenerateLast = async () => {
    if (historyBusy || submitting || generating) return;
    setHistoryBusy(true);
    setError('');
    try {
      const response = await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/adventures/runs/${runId}/history/last/regenerate/`,
      });
      setHistory((prev) => {
        if (!prev.length) return prev;
        return [...prev.slice(0, -1), response.data];
      });
    } catch (err) {
      setError('Не удалось перегенерировать сообщение.');
    } finally {
      setHistoryBusy(false);
    }
  };

  const handleExportPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    setError('');
    try {
      const response = await authRequest({
        method: 'get',
        url: `${apiBaseUrl}/api/adventures/runs/${runId}/history/pdf/`,
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `adventure_${runId}_history.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Не удалось сохранить историю в PDF.');
    } finally {
      setPdfBusy(false);
    }
  };

  const rollbackMinId = runInfo?.rollback_min_history_id ?? null;
  const lastEntryId = history.length ? history[history.length - 1].id : null;

  return (
    <div className="game-page">
      <aside className="game-sidebar">
        <h3>Персонажи</h3>
        {characters.length === 0 && <p className="templates-empty">Пока нет персонажей.</p>}
        {characters.map((character) => (
          <div className="character-card" key={character.id}>
            <strong>{character.title}</strong>
            <div className="template-meta">
              Тело {character.body_power} • Разум {character.mind_power} • Воля {character.will_power}
            </div>
            {character.age !== null && character.age !== undefined && (
              <div className="template-meta">Возраст: {character.age}</div>
            )}
          </div>
        ))}
      </aside>
      <section className="game-main">
        <div className="history-panel">
          {history.length === 0 && <p className="templates-empty">История пока пуста.</p>}
          {history.map((entry) => (
            <div className="history-entry" key={entry.id}>
              <div className="history-role">{entry.role}</div>
              <div className="history-content">{entry.content}</div>
              <div className="template-actions">
                {(rollbackMinId === null || entry.id >= rollbackMinId) &&
                  entry.id !== lastEntryId && (
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => handleRollback(entry.id)}
                      disabled={historyBusy || submitting || generating}
                      title="Откатить историю до этого поста"
                    >
                      ↩
                    </button>
                  )}
                {entry.id === lastEntryId && (
                  <button
                    className="link-button"
                    type="button"
                    onClick={handleRegenerateLast}
                    disabled={historyBusy || submitting || generating}
                    title="Перегенерировать последний пост"
                  >
                    ↻
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <form className="prompt-form" onSubmit={handleSubmitPrompt}>
          {error && <div className="error-message">{error}</div>}
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={asHero}
              onChange={(event) => setAsHero(event.target.checked)}
              disabled={submitting || generating || historyBusy}
            />
            Писать от лица главного героя
          </label>
          <textarea
            rows="3"
            placeholder="Введите действие или реплику..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={submitting || generating || historyBusy}
          />
          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={submitting || generating || historyBusy}
            >
              Отправить
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleGenerateNext}
              disabled={generating || submitting || historyBusy}
            >
              Продолжить
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleExportPdf}
              disabled={pdfBusy || submitting || generating || historyBusy}
            >
              Сохранить PDF
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default GamePage;
