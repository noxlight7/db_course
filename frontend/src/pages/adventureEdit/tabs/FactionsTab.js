import React from 'react';

import { formatTags } from '../utils';

function FactionsTab({ factions }) {
  return (
    <div className="editor-section split-panel">
      <div className="editor-list">
        {factions.items.length === 0 && <p className="templates-empty">Пока нет фракций.</p>}
        {factions.items.map((item) => (
          <article className="template-card" key={item.id}>
            <h4>{item.title}</h4>
            {item.description && <p>{item.description}</p>}
            <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
            <div className="template-actions">
              <button className="secondary-button" type="button" onClick={() => factions.startEdit(item)}>
                Изменить
              </button>
              <button className="link-button" type="button" onClick={() => factions.remove(item.id)}>
                Удалить
              </button>
            </div>
          </article>
        ))}
      </div>
      <form className="editor-form editor-panel" onSubmit={factions.submit}>
        {factions.error && <div className="error-message">{factions.error}</div>}
        <label>
          Название
          <input
            value={factions.form.title}
            onChange={(event) => factions.setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </label>
        <label>
          Описание
          <textarea
            rows="3"
            value={factions.form.description}
            onChange={(event) =>
              factions.setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </label>
        <label>
          Теги (через запятую)
          <input
            value={factions.form.tags}
            onChange={(event) => factions.setForm((prev) => ({ ...prev, tags: event.target.value }))}
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={factions.saving}>
            {factions.editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {factions.editingId && (
            <button className="secondary-button" type="button" onClick={factions.resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default FactionsTab;
