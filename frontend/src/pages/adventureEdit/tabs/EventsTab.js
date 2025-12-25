import React from 'react';

import { sortByTitle } from '../utils';

function EventsTab({ events, locations, readOnly }) {
  return (
    <div className="editor-section split-panel">
      <div className="editor-list">
        {events.items.length === 0 && <p className="templates-empty">Пока нет событий.</p>}
        {events.items.map((item) => (
          <article className="template-card" key={item.id}>
            <h4>{item.title}</h4>
            <div className="template-meta">Статус: {item.status}</div>
            <div className="template-meta">
              Локация:{' '}
              {item.location
                ? locations.items.find((loc) => loc.id === item.location)?.title || '—'
                : 'Глобальное'}
            </div>
            {item.trigger_hint && <p>Триггер: {item.trigger_hint}</p>}
            {item.state && <div className="template-meta">Состояние: {item.state}</div>}
            {!readOnly && (
              <div className="template-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => events.startEdit(item)}
                >
                  Изменить
                </button>
                <button className="link-button" type="button" onClick={() => events.remove(item.id)}>
                  Удалить
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <form className="editor-form editor-panel" onSubmit={events.submit}>
        {events.error && <div className="error-message">{events.error}</div>}
        <label>
          Название
          <input
            value={events.form.title}
            onChange={(event) => events.setForm((prev) => ({ ...prev, title: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <label>
          Статус
          <select
            value={events.form.status}
            onChange={(event) => events.setForm((prev) => ({ ...prev, status: event.target.value }))}
            disabled={readOnly}
          >
            <option value="inactive">inactive</option>
            <option value="active">active</option>
            <option value="resolved">resolved</option>
          </select>
        </label>
        <label>
          Локация
          <select
            value={events.form.location}
            onChange={(event) => events.setForm((prev) => ({ ...prev, location: event.target.value }))}
            disabled={readOnly}
          >
            <option value="">Глобальное</option>
            {sortByTitle(locations.items).map((location) => (
              <option key={location.id} value={location.id}>
                {location.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Триггер старта
          <textarea
            rows="2"
            value={events.form.trigger_hint}
            onChange={(event) => events.setForm((prev) => ({ ...prev, trigger_hint: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <label>
          Текущее состояние
          <textarea
            rows="2"
            value={events.form.state}
            onChange={(event) => events.setForm((prev) => ({ ...prev, state: event.target.value }))}
            disabled={readOnly}
          />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={events.saving || readOnly}>
            {events.editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {events.editingId && !readOnly && (
            <button className="secondary-button" type="button" onClick={events.resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default EventsTab;
