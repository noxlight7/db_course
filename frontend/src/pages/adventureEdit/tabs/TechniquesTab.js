import React from 'react';

import { formatTags, sortByTitle } from '../utils';

function TechniquesTab({ techniques, systems }) {
  return (
    <div className="editor-section split-panel">
      <div className="editor-list">
        {techniques.items.length === 0 && <p className="templates-empty">Пока нет приемов.</p>}
        {techniques.items.map((item) => (
          <article className="template-card" key={item.id}>
            <h4>{item.title}</h4>
            {item.description && <p>{item.description}</p>}
            <div className="template-meta">
              Система: {systems.items.find((system) => system.id === item.system)?.title || '—'}
            </div>
            <div className="template-meta">
              Сложность {item.difficulty} • Ранг {item.tier ?? '—'} • Треб. уровень{' '}
              {item.required_system_level}
            </div>
            <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
            <div className="template-actions">
              <button className="secondary-button" type="button" onClick={() => techniques.startEdit(item)}>
                Изменить
              </button>
              <button className="link-button" type="button" onClick={() => techniques.remove(item.id)}>
                Удалить
              </button>
            </div>
          </article>
        ))}
      </div>
      <form className="editor-form editor-panel" onSubmit={techniques.submit}>
        {techniques.error && <div className="error-message">{techniques.error}</div>}
        <label>
          Система
          <select
            value={techniques.form.system}
            onChange={(event) => techniques.setForm((prev) => ({ ...prev, system: event.target.value }))}
          >
            <option value="">Выберите систему</option>
            {sortByTitle(systems.items).map((system) => (
              <option key={system.id} value={system.id}>
                {system.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Название
          <input
            value={techniques.form.title}
            onChange={(event) => techniques.setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </label>
        <label>
          Описание
          <textarea
            rows="3"
            value={techniques.form.description}
            onChange={(event) =>
              techniques.setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </label>
        <div className="form-row">
          <label>
            Сложность
            <input
              type="number"
              min="0"
              value={techniques.form.difficulty}
              onChange={(event) =>
                techniques.setForm((prev) => ({ ...prev, difficulty: event.target.value }))
              }
            />
          </label>
          <label>
            Ранг
            <input
              type="number"
              min="0"
              value={techniques.form.tier}
              disabled={techniques.form.is_rankless}
              onChange={(event) =>
                techniques.setForm((prev) => ({ ...prev, tier: event.target.value }))
              }
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={techniques.form.is_rankless}
              onChange={(event) =>
                techniques.setForm((prev) => ({
                  ...prev,
                  is_rankless: event.target.checked,
                  tier: event.target.checked ? '' : prev.tier,
                }))
              }
            />
            Безранговый прием
          </label>
          <label>
            Треб. уровень
            <input
              type="number"
              min="0"
              value={techniques.form.required_system_level}
              onChange={(event) =>
                techniques.setForm((prev) => ({
                  ...prev,
                  required_system_level: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <label>
          Теги (через запятую)
          <input
            value={techniques.form.tags}
            onChange={(event) => techniques.setForm((prev) => ({ ...prev, tags: event.target.value }))}
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={techniques.saving}>
            {techniques.editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {techniques.editingId && (
            <button className="secondary-button" type="button" onClick={techniques.resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default TechniquesTab;
