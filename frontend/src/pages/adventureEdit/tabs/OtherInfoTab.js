import React from 'react';

import { formatTags } from '../utils';

function OtherInfoTab({ otherInfo, readOnly }) {
  return (
    <div className="editor-section split-panel">
      <div className="editor-list">
        {otherInfo.items.length === 0 && <p className="templates-empty">Пока нет записей.</p>}
        {otherInfo.items.map((item) => (
          <article className="template-card" key={item.id}>
            <h4>{item.title}</h4>
            {item.category && <div className="template-meta">Категория: {item.category}</div>}
            {item.description && <p>{item.description}</p>}
            <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
            {!readOnly && (
              <div className="template-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => otherInfo.startEdit(item)}
                >
                  Изменить
                </button>
                <button className="link-button" type="button" onClick={() => otherInfo.remove(item.id)}>
                  Удалить
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <form className="editor-form editor-panel" onSubmit={otherInfo.submit}>
        {otherInfo.error && <div className="error-message">{otherInfo.error}</div>}
        <label>
          Категория
          <input
            value={otherInfo.form.category}
            onChange={(event) => otherInfo.setForm((prev) => ({ ...prev, category: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <label>
          Заголовок
          <input
            value={otherInfo.form.title}
            onChange={(event) => otherInfo.setForm((prev) => ({ ...prev, title: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <label>
          Описание
          <textarea
            rows="3"
            value={otherInfo.form.description}
            onChange={(event) =>
              otherInfo.setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            disabled={readOnly}
          />
        </label>
        <label>
          Теги (через запятую)
          <input
            value={otherInfo.form.tags}
            onChange={(event) => otherInfo.setForm((prev) => ({ ...prev, tags: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={otherInfo.saving || readOnly}>
            {otherInfo.editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {otherInfo.editingId && !readOnly && (
            <button className="secondary-button" type="button" onClick={otherInfo.resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default OtherInfoTab;
