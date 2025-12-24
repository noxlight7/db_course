import React from 'react';

import { formatTags } from '../utils';

function SystemsTab({ systems }) {
  return (
    <div className="editor-section split-panel">
      <div className="editor-list">
        {systems.items.length === 0 && <p className="templates-empty">Пока нет систем.</p>}
        {systems.items.map((item) => (
          <article className="template-card" key={item.id}>
            <h4>{item.title}</h4>
            {item.description && <p>{item.description}</p>}
            <div className="template-meta">
              Веса: тело {item.w_body}, разум {item.w_mind}, воля {item.w_will}
            </div>
            {item.formula_hint && <div className="template-meta">Формула: {item.formula_hint}</div>}
            <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
            <div className="template-actions">
              <button className="secondary-button" type="button" onClick={() => systems.startEdit(item)}>
                Изменить
              </button>
              <button className="link-button" type="button" onClick={() => systems.remove(item.id)}>
                Удалить
              </button>
            </div>
          </article>
        ))}
      </div>
      <form className="editor-form editor-panel" onSubmit={systems.submit}>
        {systems.error && <div className="error-message">{systems.error}</div>}
        <label>
          Название
          <input
            value={systems.form.title}
            onChange={(event) => systems.setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </label>
        <label>
          Описание
          <textarea
            rows="3"
            value={systems.form.description}
            onChange={(event) => systems.setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>
        <div className="form-row">
          <label>
            Вес тела
            <input
              type="number"
              min="0"
              value={systems.form.w_body}
              onChange={(event) => systems.setForm((prev) => ({ ...prev, w_body: event.target.value }))}
            />
          </label>
          <label>
            Вес разума
            <input
              type="number"
              min="0"
              value={systems.form.w_mind}
              onChange={(event) => systems.setForm((prev) => ({ ...prev, w_mind: event.target.value }))}
            />
          </label>
          <label>
            Вес воли
            <input
              type="number"
              min="0"
              value={systems.form.w_will}
              onChange={(event) => systems.setForm((prev) => ({ ...prev, w_will: event.target.value }))}
            />
          </label>
        </div>
        <label>
          Формула (описание)
          <textarea
            rows="2"
            value={systems.form.formula_hint}
            onChange={(event) =>
              systems.setForm((prev) => ({ ...prev, formula_hint: event.target.value }))
            }
          />
        </label>
        <label>
          Теги (через запятую)
          <input
            value={systems.form.tags}
            onChange={(event) => systems.setForm((prev) => ({ ...prev, tags: event.target.value }))}
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={systems.saving}>
            {systems.editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {systems.editingId && (
            <button className="secondary-button" type="button" onClick={systems.resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default SystemsTab;
