import React from 'react';

import { formatTags } from '../utils';

function RacesTab({ races, readOnly }) {
  return (
    <div className="editor-section split-panel">
      <div className="editor-list">
        {races.items.length === 0 && <p className="templates-empty">Пока нет рас.</p>}
        {races.items.map((item) => (
          <article className="template-card" key={item.id}>
            <h4>{item.title}</h4>
            {item.description && <p>{item.description}</p>}
            <div className="template-meta">Продолжительность жизни: {item.life_span ?? 100}</div>
            <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
            {!readOnly && (
              <div className="template-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => races.startEdit(item)}
                >
                  Изменить
                </button>
                <button className="link-button" type="button" onClick={() => races.remove(item.id)}>
                  Удалить
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <form className="editor-form editor-panel" onSubmit={races.submit}>
        {races.error && <div className="error-message">{races.error}</div>}
        <label>
          Название
          <input
            value={races.form.title}
            onChange={(event) => races.setForm((prev) => ({ ...prev, title: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <label>
          Описание
          <textarea
            rows="3"
            value={races.form.description}
            onChange={(event) => races.setForm((prev) => ({ ...prev, description: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <label>
          Продолжительность жизни
          <input
            type="number"
            min="0"
            value={races.form.life_span}
            onChange={(event) => races.setForm((prev) => ({ ...prev, life_span: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <label>
          Теги (через запятую)
          <input
            value={races.form.tags}
            onChange={(event) => races.setForm((prev) => ({ ...prev, tags: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={races.saving || readOnly}>
            {races.editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {races.editingId && !readOnly && (
            <button className="secondary-button" type="button" onClick={races.resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default RacesTab;
