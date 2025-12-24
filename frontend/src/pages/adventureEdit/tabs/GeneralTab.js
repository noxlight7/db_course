import React from 'react';

import { sortByTitle } from '../utils';

function GeneralTab({
  generalForm,
  generalError,
  savingGeneral,
  handleGeneralChange,
  saveGeneral,
  isTemplate,
  exportError,
  exporting,
  handleExportAdventure,
  characters,
  heroSetupSummary,
  heroSetupForm,
  setHeroSetupForm,
  heroSetupError,
  saveHeroSetup,
  savingHeroSetup,
  locations,
  races,
}) {
  return (
    <>
      <form className="editor-form" onSubmit={saveGeneral}>
        {generalError && <div className="error-message">{generalError}</div>}
        <label>
          Название
          <input name="title" value={generalForm.title} onChange={handleGeneralChange} />
        </label>
        <label>
          Описание
          <textarea
            name="description"
            rows="3"
            value={generalForm.description}
            onChange={handleGeneralChange}
          />
        </label>
        <label>
          Специальные инструкции к ИИ
          <textarea
            name="spec_instructions"
            rows="3"
            value={generalForm.spec_instructions}
            onChange={handleGeneralChange}
          />
        </label>
        <label>
          Интро
          <textarea
            name="intro"
            rows="3"
            value={generalForm.intro}
            onChange={handleGeneralChange}
          />
        </label>
        <label>
          Главный герой
          <select name="primary_hero" value={generalForm.primary_hero} onChange={handleGeneralChange}>
            <option value="">Сгенерировать перед приключением</option>
            {sortByTitle(characters.items).map((character) => (
              <option key={character.id} value={character.id}>
                {character.title}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={savingGeneral}>
            Сохранить
          </button>
          {isTemplate && (
            <button
              className="secondary-button"
              type="button"
              onClick={handleExportAdventure}
              disabled={exporting}
            >
              Экспорт в JSON
            </button>
          )}
        </div>
        {exportError && <div className="error-message">{exportError}</div>}
      </form>
      {isTemplate && !generalForm.primary_hero && (
        <form className="editor-form" onSubmit={saveHeroSetup}>
          <div className="editor-subsection">
            <h3>Настройки главного героя</h3>
            <div className="template-meta">
              Параметры для выбора: {heroSetupSummary.requiredFields.join(', ') || '—'}
            </div>
            <div className="template-meta">
              Задано по умолчанию: {heroSetupSummary.presetFields.join(', ') || '—'}
            </div>
          </div>
          {heroSetupError && <div className="error-message">{heroSetupError}</div>}
          <label>
            Стартовая локация
            <select
              value={heroSetupForm.default_location}
              onChange={(event) =>
                setHeroSetupForm((prev) => ({
                  ...prev,
                  default_location: event.target.value,
                }))
              }
            >
              <option value="">Создать новую при старте</option>
              {sortByTitle(locations.items).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.title}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={heroSetupForm.require_race}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({
                    ...prev,
                    require_race: event.target.checked,
                  }))
                }
              />
              Выбирать расу при старте
            </label>
            <label>
              Раса по умолчанию
              <select
                value={heroSetupForm.default_race}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({ ...prev, default_race: event.target.value }))
                }
                disabled={heroSetupForm.require_race}
              >
                <option value="">Не задана</option>
                {sortByTitle(races.items).map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={heroSetupForm.require_age}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({
                    ...prev,
                    require_age: event.target.checked,
                  }))
                }
              />
              Выбирать возраст при старте
            </label>
            <label>
              Возраст по умолчанию
              <input
                type="number"
                min="0"
                value={heroSetupForm.default_age}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({ ...prev, default_age: event.target.value }))
                }
                disabled={heroSetupForm.require_age}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={heroSetupForm.require_body_power}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({
                    ...prev,
                    require_body_power: event.target.checked,
                  }))
                }
              />
              Выбирать силу тела при старте
            </label>
            <label>
              Сила тела по умолчанию
              <input
                type="number"
                min="0"
                value={heroSetupForm.default_body_power}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({ ...prev, default_body_power: event.target.value }))
                }
                disabled={heroSetupForm.require_body_power}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={heroSetupForm.require_mind_power}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({
                    ...prev,
                    require_mind_power: event.target.checked,
                  }))
                }
              />
              Выбирать силу разума при старте
            </label>
            <label>
              Сила разума по умолчанию
              <input
                type="number"
                min="0"
                value={heroSetupForm.default_mind_power}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({ ...prev, default_mind_power: event.target.value }))
                }
                disabled={heroSetupForm.require_mind_power}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={heroSetupForm.require_will_power}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({
                    ...prev,
                    require_will_power: event.target.checked,
                  }))
                }
              />
              Выбирать силу воли при старте
            </label>
            <label>
              Сила воли по умолчанию
              <input
                type="number"
                min="0"
                value={heroSetupForm.default_will_power}
                onChange={(event) =>
                  setHeroSetupForm((prev) => ({ ...prev, default_will_power: event.target.value }))
                }
                disabled={heroSetupForm.require_will_power}
              />
            </label>
          </div>
          <div className="form-row">
            <div className="template-meta">Знания систем и приемов выбираются при старте приключения.</div>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={savingHeroSetup}>
              Сохранить настройки героя
            </button>
          </div>
        </form>
      )}
    </>
  );
}

export default GeneralTab;
