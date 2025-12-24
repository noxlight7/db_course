import React from 'react';

import { formatTags, sortByTitle } from '../utils';

function CharactersTab({
  characters,
  races,
  locations,
  systems,
  techniques,
  activeCharacterId,
  setActiveCharacterId,
  activeCharacter,
  activeCharacterSystems,
  activeCharacterTechniques,
  availableSystemsForTechniques,
  characterSystems,
  characterTechniques,
}) {
  return (
    <div className="editor-section split-panel characters-layout">
      <div className="editor-list characters-list">
        {characters.items.length === 0 && <p className="templates-empty">Пока нет персонажей.</p>}
        {characters.items.map((item) => (
          <article className="template-card" key={item.id}>
            <h4>{item.title}</h4>
            {item.description && <p>{item.description}</p>}
            <div className="template-meta">
              Роль: {item.is_player ? 'Игрок' : 'NPC'} • {item.in_party ? 'В партии' : 'Вне партии'}
            </div>
            <div className="template-meta">
              Сила: {item.body_power} • Разум: {item.mind_power} • Воля: {item.will_power}
            </div>
            <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
            <div className="template-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  characters.startEdit(item);
                  setActiveCharacterId(item.id);
                }}
              >
                Изменить
              </button>
              <button
                className="link-button"
                type="button"
                onClick={() => {
                  if (activeCharacterId === item.id) {
                    setActiveCharacterId(null);
                  }
                  characters.remove(item.id);
                }}
              >
                Удалить
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="editor-stack editor-panel characters-panel">
        <form className="editor-form" onSubmit={characters.submit}>
          {characters.error && <div className="error-message">{characters.error}</div>}
          <label>
            Имя персонажа
            <input
              value={characters.form.title}
              onChange={(event) =>
                characters.setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </label>
          <label>
            Описание
            <textarea
              rows="3"
              value={characters.form.description}
              onChange={(event) =>
                characters.setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>
          <div className="form-row">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={characters.form.is_player}
                onChange={(event) =>
                  characters.setForm((prev) => ({
                    ...prev,
                    is_player: event.target.checked,
                    in_party: event.target.checked ? true : prev.in_party,
                  }))
                }
              />
              Персонаж игрока
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={characters.form.in_party}
                onChange={(event) =>
                  characters.setForm((prev) => ({
                    ...prev,
                    in_party: event.target.checked,
                  }))
                }
              />
              В партии
            </label>
          </div>
          <div className="form-row">
            <label>
              Возраст
              <input
                type="number"
                min="0"
                value={characters.form.age}
                onChange={(event) =>
                  characters.setForm((prev) => ({ ...prev, age: event.target.value }))
                }
              />
            </label>
            <label>
              Сила тела
              <input
                type="number"
                min="0"
                value={characters.form.body_power}
                onChange={(event) =>
                  characters.setForm((prev) => ({ ...prev, body_power: event.target.value }))
                }
              />
            </label>
            <label>
              Сила разума
              <input
                type="number"
                min="0"
                value={characters.form.mind_power}
                onChange={(event) =>
                  characters.setForm((prev) => ({ ...prev, mind_power: event.target.value }))
                }
              />
            </label>
            <label>
              Сила воли
              <input
                type="number"
                min="0"
                value={characters.form.will_power}
                onChange={(event) =>
                  characters.setForm((prev) => ({ ...prev, will_power: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Прогресс тела (%)
              <input
                type="number"
                min="0"
                max="100"
                value={characters.form.body_power_progress}
                onChange={(event) =>
                  characters.setForm((prev) => ({
                    ...prev,
                    body_power_progress: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Прогресс разума (%)
              <input
                type="number"
                min="0"
                max="100"
                value={characters.form.mind_power_progress}
                onChange={(event) =>
                  characters.setForm((prev) => ({
                    ...prev,
                    mind_power_progress: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Прогресс воли (%)
              <input
                type="number"
                min="0"
                max="100"
                value={characters.form.will_power_progress}
                onChange={(event) =>
                  characters.setForm((prev) => ({
                    ...prev,
                    will_power_progress: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Раса
              <select
                value={characters.form.race}
                onChange={(event) =>
                  characters.setForm((prev) => ({ ...prev, race: event.target.value }))
                }
              >
                <option value="">Не выбрана</option>
                {sortByTitle(races.items).map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Локация
              <select
                value={characters.form.location}
                onChange={(event) =>
                  characters.setForm((prev) => ({ ...prev, location: event.target.value }))
                }
              >
                <option value="">Не выбрана</option>
                {sortByTitle(locations.items).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Теги (через запятую)
            <input
              value={characters.form.tags}
              onChange={(event) =>
                characters.setForm((prev) => ({ ...prev, tags: event.target.value }))
              }
            />
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={characters.saving}>
              {characters.editingId ? 'Сохранить' : 'Добавить'}
            </button>
            {characters.editingId && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  characters.resetForm();
                  setActiveCharacterId(null);
                }}
              >
                Отмена
              </button>
            )}
          </div>
        </form>
        <div className="editor-subsection">
          <h3>Знания систем{activeCharacter && `: ${activeCharacter.title}`}</h3>
          <div className="editor-list">
            {!activeCharacterId && (
              <p className="templates-empty">Выберите персонажа для управления знаниями.</p>
            )}
            {activeCharacterId && activeCharacterSystems.length === 0 && (
              <p className="templates-empty">Пока нет записей.</p>
            )}
            {activeCharacterSystems.map((item) => (
              <article className="template-card" key={item.id}>
                <h4>{characters.items.find((char) => char.id === item.character)?.title || '—'}</h4>
                <div className="template-meta">
                  Система: {systems.items.find((system) => system.id === item.system)?.title || '—'}
                </div>
                <div className="template-meta">
                  Уровень: {item.level} • Прогресс: {item.progress_percent ?? 0}%
                </div>
                {item.notes && <p>{item.notes}</p>}
                <div className="template-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      characterSystems.startEdit(item);
                      setActiveCharacterId(item.character);
                    }}
                  >
                    Изменить
                  </button>
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => characterSystems.remove(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
          <form
            className="editor-form"
            onSubmit={(event) => {
              if (!activeCharacterId) {
                event.preventDefault();
                return;
              }
              characterSystems.submit(event);
            }}
          >
            {characterSystems.error && <div className="error-message">{characterSystems.error}</div>}
            <label>
              Система
              <select
                value={characterSystems.form.system}
                onChange={(event) =>
                  characterSystems.setForm((prev) => ({
                    ...prev,
                    system: event.target.value,
                  }))
                }
                disabled={!activeCharacterId}
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
              Уровень
              <input
                type="number"
                min="0"
                value={characterSystems.form.level}
                onChange={(event) =>
                  characterSystems.setForm((prev) => ({
                    ...prev,
                    level: event.target.value,
                  }))
                }
                disabled={!activeCharacterId}
              />
            </label>
            <label>
              Прогресс (%)
              <input
                type="number"
                min="0"
                max="100"
                value={characterSystems.form.progress_percent}
                onChange={(event) =>
                  characterSystems.setForm((prev) => ({
                    ...prev,
                    progress_percent: event.target.value,
                  }))
                }
                disabled={!activeCharacterId}
              />
            </label>
            <label>
              Заметки
              <textarea
                rows="2"
                value={characterSystems.form.notes}
                onChange={(event) =>
                  characterSystems.setForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                disabled={!activeCharacterId}
              />
            </label>
            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={characterSystems.saving || !activeCharacterId}
              >
                {characterSystems.editingId ? 'Сохранить' : 'Добавить'}
              </button>
              {characterSystems.editingId && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={characterSystems.resetForm}
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="editor-subsection">
          <h3>Выученные приемы{activeCharacter && `: ${activeCharacter.title}`}</h3>
          <div className="editor-list">
            {!activeCharacterId && (
              <p className="templates-empty">Выберите персонажа для управления приемами.</p>
            )}
            {activeCharacterId && activeCharacterTechniques.length === 0 && (
              <p className="templates-empty">Пока нет записей.</p>
            )}
            {activeCharacterTechniques.map((item) => (
              <article className="template-card" key={item.id}>
                <h4>{characters.items.find((char) => char.id === item.character)?.title || '—'}</h4>
                <div className="template-meta">
                  Прием: {techniques.items.find((technique) => technique.id === item.technique)?.title || '—'}
                </div>
                {item.notes && <p>{item.notes}</p>}
                <div className="template-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      characterTechniques.startEdit(item);
                      setActiveCharacterId(item.character);
                    }}
                  >
                    Изменить
                  </button>
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => characterTechniques.remove(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
          <form
            className="editor-form"
            onSubmit={(event) => {
              if (!activeCharacterId) {
                event.preventDefault();
                return;
              }
              characterTechniques.submit(event);
            }}
          >
            {characterTechniques.error && (
              <div className="error-message">{characterTechniques.error}</div>
            )}
            <label>
              Система
              <select
                value={characterTechniques.form.system}
                onChange={(event) =>
                  characterTechniques.setForm((prev) => ({
                    ...prev,
                    system: event.target.value,
                    technique: '',
                  }))
                }
                disabled={!activeCharacterId}
              >
                <option value="">Выберите систему</option>
                {sortByTitle(availableSystemsForTechniques).map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Прием
              <select
                value={characterTechniques.form.technique}
                onChange={(event) =>
                  characterTechniques.setForm((prev) => ({
                    ...prev,
                    technique: event.target.value,
                  }))
                }
                disabled={!activeCharacterId || !characterTechniques.form.system}
              >
                <option value="">Выберите прием</option>
                {sortByTitle(
                  techniques.items.filter((technique) =>
                    characterTechniques.form.system
                      ? technique.system === Number(characterTechniques.form.system)
                      : false
                  )
                ).map((technique) => (
                  <option key={technique.id} value={technique.id}>
                    {technique.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Заметки
              <textarea
                rows="2"
                value={characterTechniques.form.notes}
                onChange={(event) =>
                  characterTechniques.setForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                disabled={!activeCharacterId}
              />
            </label>
            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={characterTechniques.saving || !activeCharacterId}
              >
                {characterTechniques.editingId ? 'Сохранить' : 'Добавить'}
              </button>
              {characterTechniques.editingId && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={characterTechniques.resetForm}
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CharactersTab;
