import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const tabs = [
  { id: 'general', label: 'Общее' },
  { id: 'locations', label: 'Локации' },
  { id: 'characters', label: 'Персонажи' },
  { id: 'races', label: 'Расы' },
  { id: 'systems', label: 'Системы' },
  { id: 'techniques', label: 'Приемы' },
  { id: 'events', label: 'События' },
  { id: 'factions', label: 'Фракции' },
  { id: 'other', label: 'Иная информация' },
];

const toOptionalInt = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toInt = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const serializeTags = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const formatTags = (tags) => (tags && tags.length ? tags.join(', ') : '');

const sortByTitle = (items) =>
  [...items].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru'));

const useAdventureEntity = ({
  adventureId,
  endpoint,
  authRequest,
  initialForm,
  mapItemToForm,
  buildPayload,
  onSaved = () => {},
}) => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!adventureId) return;
    try {
      const response = await authRequest({ method: 'get', url: endpoint });
      setItems(response.data);
    } catch (fetchError) {
      setItems([]);
    }
  }, [adventureId, endpoint, authRequest]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm(mapItemToForm(item));
    setError('');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload(form);
      if (editingId) {
        const response = await authRequest({
          method: 'put',
          url: `${endpoint}${editingId}/`,
          data: payload,
        });
        setItems((prev) =>
          prev.map((item) => (item.id === response.data.id ? response.data : item))
        );
        onSaved(response.data, 'update');
      } else {
        const response = await authRequest({
          method: 'post',
          url: endpoint,
          data: payload,
        });
        setItems((prev) => [response.data, ...prev]);
        onSaved(response.data, 'create');
      }
      resetForm();
    } catch (submitError) {
      setError('Не удалось сохранить изменения.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      await authRequest({ method: 'delete', url: `${endpoint}${id}/` });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError('Не удалось удалить запись.');
    }
  };

  return {
    items,
    form,
    setForm,
    editingId,
    startEdit,
    resetForm,
    submit,
    remove,
    error,
    saving,
  };
};

function AdventureEditPage({ user, apiBaseUrl, authRequest, entityScope = 'templates' }) {
  const { id } = useParams();
  const adventureId = Number(id);
  const [activeTab, setActiveTab] = useState('general');
  const [activeCharacterId, setActiveCharacterId] = useState(null);
  const [adventure, setAdventure] = useState(null);
  const [generalForm, setGeneralForm] = useState({
    title: '',
    description: '',
    spec_instructions: '',
    intro: '',
    primary_hero: '',
  });
  const [generalError, setGeneralError] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [heroSetupForm, setHeroSetupForm] = useState({
    default_location: '',
    require_race: true,
    default_race: '',
    require_age: false,
    default_age: '',
    require_body_power: true,
    default_body_power: '',
    require_mind_power: true,
    default_mind_power: '',
    require_will_power: true,
    default_will_power: '',
  });
  const [heroSetupError, setHeroSetupError] = useState('');
  const [savingHeroSetup, setSavingHeroSetup] = useState(false);

  const baseEndpoint = `${apiBaseUrl}/api/adventures/${entityScope}/${adventureId}/`;
  const heroSetupEndpoint = `${baseEndpoint}hero-setup/`;
  const isTemplate = entityScope === 'templates';

  const locations = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}locations/`,
    authRequest,
    initialForm: {
      title: '',
      description: '',
      x: '0',
      y: '0',
      width: '1',
      height: '1',
      tags: '',
    },
    mapItemToForm: (item) => ({
      title: item.title || '',
      description: item.description || '',
      x: String(item.x ?? 0),
      y: String(item.y ?? 0),
      width: String(item.width ?? 1),
      height: String(item.height ?? 1),
      tags: formatTags(item.tags),
    }),
    buildPayload: (form) => ({
      title: form.title,
      description: form.description,
      x: toInt(form.x, 0),
      y: toInt(form.y, 0),
      width: toInt(form.width, 1),
      height: toInt(form.height, 1),
      tags: serializeTags(form.tags),
    }),
  });

  const races = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}races/`,
    authRequest,
    initialForm: {
      title: '',
      description: '',
      life_span: '100',
      tags: '',
    },
    mapItemToForm: (item) => ({
      title: item.title || '',
      description: item.description || '',
      life_span: String(item.life_span ?? 100),
      tags: formatTags(item.tags),
    }),
    buildPayload: (form) => ({
      title: form.title,
      description: form.description,
      life_span: toInt(form.life_span, 100),
      tags: serializeTags(form.tags),
    }),
  });

  const systems = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}systems/`,
    authRequest,
    initialForm: {
      title: '',
      description: '',
      w_body: '0',
      w_mind: '100',
      w_will: '0',
      formula_hint: '',
      tags: '',
    },
    mapItemToForm: (item) => ({
      title: item.title || '',
      description: item.description || '',
      w_body: String(item.w_body ?? 0),
      w_mind: String(item.w_mind ?? 0),
      w_will: String(item.w_will ?? 0),
      formula_hint: item.formula_hint || '',
      tags: formatTags(item.tags),
    }),
    buildPayload: (form) => ({
      title: form.title,
      description: form.description,
      w_body: toInt(form.w_body, 0),
      w_mind: toInt(form.w_mind, 0),
      w_will: toInt(form.w_will, 0),
      formula_hint: form.formula_hint,
      tags: serializeTags(form.tags),
    }),
  });

  const techniques = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}techniques/`,
    authRequest,
    initialForm: {
      system: '',
      title: '',
      description: '',
      difficulty: '0',
      tier: '0',
      is_rankless: false,
      required_system_level: '0',
      tags: '',
    },
    mapItemToForm: (item) => ({
      system: item.system ? String(item.system) : '',
      title: item.title || '',
      description: item.description || '',
      difficulty: String(item.difficulty ?? 0),
      tier: item.tier === null || item.tier === undefined ? '' : String(item.tier),
      is_rankless: item.tier === null,
      required_system_level: String(item.required_system_level ?? 0),
      tags: formatTags(item.tags),
    }),
    buildPayload: (form) => ({
      system: form.system ? Number(form.system) : null,
      title: form.title,
      description: form.description,
      difficulty: toInt(form.difficulty, 0),
      tier: form.is_rankless ? null : toOptionalInt(form.tier) ?? 0,
      required_system_level: toInt(form.required_system_level, 0),
      tags: serializeTags(form.tags),
    }),
  });

  const factions = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}factions/`,
    authRequest,
    initialForm: {
      title: '',
      description: '',
      tags: '',
    },
    mapItemToForm: (item) => ({
      title: item.title || '',
      description: item.description || '',
      tags: formatTags(item.tags),
    }),
    buildPayload: (form) => ({
      title: form.title,
      description: form.description,
      tags: serializeTags(form.tags),
    }),
  });

  const events = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}events/`,
    authRequest,
    initialForm: {
      title: '',
      status: 'inactive',
      location: '',
      trigger_hint: '',
      state: '',
    },
    mapItemToForm: (item) => ({
      title: item.title || '',
      status: item.status || 'inactive',
      location: item.location ? String(item.location) : '',
      trigger_hint: item.trigger_hint || '',
      state: item.state || '',
    }),
    buildPayload: (form) => ({
      title: form.title,
      status: form.status,
      location: form.location ? Number(form.location) : null,
      trigger_hint: form.trigger_hint,
      state: form.state,
    }),
  });

  const otherInfo = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}other-info/`,
    authRequest,
    initialForm: {
      category: '',
      title: '',
      description: '',
      tags: '',
    },
    mapItemToForm: (item) => ({
      category: item.category || '',
      title: item.title || '',
      description: item.description || '',
      tags: formatTags(item.tags),
    }),
    buildPayload: (form) => ({
      category: form.category,
      title: form.title,
      description: form.description,
      tags: serializeTags(form.tags),
    }),
  });

  const characters = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}characters/`,
    authRequest,
    initialForm: {
      title: '',
      description: '',
      is_player: false,
      in_party: false,
      age: '',
      body_power: '0',
      body_power_progress: '0',
      mind_power: '0',
      mind_power_progress: '0',
      will_power: '0',
      will_power_progress: '0',
      race: '',
      location: '',
      tags: '',
    },
    mapItemToForm: (item) => ({
      title: item.title || '',
      description: item.description || '',
      is_player: Boolean(item.is_player),
      in_party: Boolean(item.in_party),
      age: item.age === null || item.age === undefined ? '' : String(item.age),
      body_power: String(item.body_power ?? 0),
      body_power_progress: String(item.body_power_progress ?? 0),
      mind_power: String(item.mind_power ?? 0),
      mind_power_progress: String(item.mind_power_progress ?? 0),
      will_power: String(item.will_power ?? 0),
      will_power_progress: String(item.will_power_progress ?? 0),
      race: item.race ? String(item.race) : '',
      location: item.location ? String(item.location) : '',
      tags: formatTags(item.tags),
    }),
    buildPayload: (form) => ({
      title: form.title,
      description: form.description,
      is_player: Boolean(form.is_player),
      in_party: Boolean(form.in_party),
      age: toOptionalInt(form.age),
      body_power: toInt(form.body_power, 0),
      body_power_progress: toInt(form.body_power_progress, 0),
      mind_power: toInt(form.mind_power, 0),
      mind_power_progress: toInt(form.mind_power_progress, 0),
      will_power: toInt(form.will_power, 0),
      will_power_progress: toInt(form.will_power_progress, 0),
      race: form.race ? Number(form.race) : null,
      location: form.location ? Number(form.location) : null,
      tags: serializeTags(form.tags),
    }),
    onSaved: (item) => {
      setActiveCharacterId(item.id);
    },
  });

  const characterSystems = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}character-systems/`,
    authRequest,
    initialForm: {
      system: '',
      level: '0',
      progress_percent: '0',
      notes: '',
    },
    mapItemToForm: (item) => ({
      system: item.system ? String(item.system) : '',
      level: String(item.level ?? 0),
      progress_percent: String(item.progress_percent ?? 0),
      notes: item.notes || '',
    }),
    buildPayload: (form) => ({
      character: activeCharacterId,
      system: form.system ? Number(form.system) : null,
      level: toInt(form.level, 0),
      progress_percent: toInt(form.progress_percent, 0),
      notes: form.notes,
    }),
  });

  const characterTechniques = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}character-techniques/`,
    authRequest,
    initialForm: {
      system: '',
      technique: '',
      notes: '',
    },
    mapItemToForm: (item) => {
      const technique = techniques.items.find((entry) => entry.id === item.technique);
      return {
        system: technique?.system ? String(technique.system) : '',
        technique: item.technique ? String(item.technique) : '',
        notes: item.notes || '',
      };
    },
    buildPayload: (form) => ({
      character: activeCharacterId,
      technique: form.technique ? Number(form.technique) : null,
      notes: form.notes,
    }),
  });

  useEffect(() => {
    if (!user || !adventureId) return;
    const fetchAdventure = async () => {
      try {
        const response = await authRequest({ method: 'get', url: baseEndpoint });
        setAdventure(response.data);
        setGeneralForm({
          title: response.data.title || '',
          description: response.data.description || '',
          spec_instructions: response.data.spec_instructions || '',
          intro: response.data.intro || '',
          primary_hero: response.data.primary_hero ? String(response.data.primary_hero) : '',
        });
      } catch (error) {
        setAdventure(null);
      }
    };
    fetchAdventure();
  }, [user, adventureId, authRequest, baseEndpoint]);

  useEffect(() => {
    if (!user || !adventureId) return;
    const fetchHeroSetup = async () => {
      if (!isTemplate) return;
      try {
        const response = await authRequest({ method: 'get', url: heroSetupEndpoint });
        setHeroSetupForm({
          default_location: response.data.default_location
            ? String(response.data.default_location)
            : '',
          require_race: Boolean(response.data.require_race),
          default_race: response.data.default_race ? String(response.data.default_race) : '',
          require_age: Boolean(response.data.require_age),
          default_age:
            response.data.default_age === null || response.data.default_age === undefined
              ? ''
              : String(response.data.default_age),
          require_body_power: Boolean(response.data.require_body_power),
          default_body_power:
            response.data.default_body_power === null ||
            response.data.default_body_power === undefined
              ? ''
              : String(response.data.default_body_power),
          require_mind_power: Boolean(response.data.require_mind_power),
          default_mind_power:
            response.data.default_mind_power === null ||
            response.data.default_mind_power === undefined
              ? ''
              : String(response.data.default_mind_power),
          require_will_power: Boolean(response.data.require_will_power),
          default_will_power:
            response.data.default_will_power === null ||
            response.data.default_will_power === undefined
              ? ''
              : String(response.data.default_will_power),
        });
      } catch (error) {
        setHeroSetupError('Не удалось загрузить настройки героя.');
      }
    };
    fetchHeroSetup();
  }, [user, adventureId, authRequest, heroSetupEndpoint]);

  const activeCharacter = characters.items.find((entry) => entry.id === activeCharacterId) || null;
  const activeCharacterSystems = characterSystems.items.filter(
    (entry) => entry.character === activeCharacterId
  );
  const activeCharacterTechniques = characterTechniques.items.filter(
    (entry) => entry.character === activeCharacterId
  );
  const availableSystemsForTechniques = systems.items.filter((system) =>
    activeCharacterSystems.some((entry) => entry.system === system.id)
  );

  const heroSetupSummary = (() => {
    const requiredFields = [];
    const presetFields = [];
    const raceTitle =
      heroSetupForm.default_race &&
      races.items.find((race) => race.id === Number(heroSetupForm.default_race))?.title;
    const pushField = (label, isRequired, value) => {
      if (isRequired) {
        requiredFields.push(label);
      } else {
        presetFields.push(`${label}: ${value}`);
      }
    };
    const locationTitle =
      heroSetupForm.default_location &&
      locations.items.find((location) => location.id === Number(heroSetupForm.default_location))
        ?.title;
    presetFields.push(`Стартовая локация: ${locationTitle || '—'}`);
    pushField('Раса', heroSetupForm.require_race, raceTitle || '—');
    pushField('Возраст', heroSetupForm.require_age, heroSetupForm.default_age || '—');
    pushField('Сила тела', heroSetupForm.require_body_power, heroSetupForm.default_body_power || '—');
    pushField('Сила разума', heroSetupForm.require_mind_power, heroSetupForm.default_mind_power || '—');
    pushField('Сила воли', heroSetupForm.require_will_power, heroSetupForm.default_will_power || '—');
    return { requiredFields, presetFields };
  })();


  const handleGeneralChange = (event) => {
    const { name, value } = event.target;
    setGeneralForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveGeneral = async (event) => {
    event.preventDefault();
    setGeneralError('');
    setSavingGeneral(true);
    try {
      const response = await authRequest({
        method: 'put',
        url: baseEndpoint,
        data: {
          title: generalForm.title,
          description: generalForm.description,
          spec_instructions: generalForm.spec_instructions,
          intro: generalForm.intro,
          primary_hero: generalForm.primary_hero ? Number(generalForm.primary_hero) : null,
        },
      });
      setAdventure(response.data);
    } catch (error) {
      setGeneralError('Не удалось сохранить изменения.');
    } finally {
      setSavingGeneral(false);
    }
  };

  const saveHeroSetup = async (event) => {
    event.preventDefault();
    if (!isTemplate) return;
    setHeroSetupError('');
    setSavingHeroSetup(true);
    try {
      await authRequest({
        method: 'put',
        url: heroSetupEndpoint,
        data: {
          default_location: heroSetupForm.default_location
            ? Number(heroSetupForm.default_location)
            : null,
          require_race: heroSetupForm.require_race,
          default_race: heroSetupForm.default_race ? Number(heroSetupForm.default_race) : null,
          require_age: heroSetupForm.require_age,
          default_age: toOptionalInt(heroSetupForm.default_age),
          require_body_power: heroSetupForm.require_body_power,
          default_body_power: toOptionalInt(heroSetupForm.default_body_power),
          require_mind_power: heroSetupForm.require_mind_power,
          default_mind_power: toOptionalInt(heroSetupForm.default_mind_power),
          require_will_power: heroSetupForm.require_will_power,
          default_will_power: toOptionalInt(heroSetupForm.default_will_power),
          require_systems: false,
          require_techniques: false,
        },
      });
    } catch (error) {
      setHeroSetupError('Не удалось сохранить настройки героя.');
    } finally {
      setSavingHeroSetup(false);
    }
  };

  const handleExportAdventure = async () => {
    if (!isTemplate) return;
    setExportError('');
    setExporting(true);
    try {
      const response = await authRequest({
        method: 'get',
        url: `${apiBaseUrl}/api/adventures/templates/${adventureId}/export/`,
      });
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generalForm.title || 'adventure'}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError('Не удалось экспортировать приключение.');
    } finally {
      setExporting(false);
    }
  };

  if (!user) {
    return <h2>Авторизуйтесь, чтобы редактировать приключения.</h2>;
  }

  return (
    <div className="adventure-editor">
      <div className="editor-header">
        <div>
          <h2>{adventure ? adventure.title : 'Редактирование приключения'}</h2>
          <p className="editor-subtitle">Настройте все элементы шаблона по вкладкам ниже.</p>
        </div>
        <Link className="secondary-button" to="/">
          Назад к списку
        </Link>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'general' && (
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
                <select
                  name="primary_hero"
                  value={generalForm.primary_hero}
                  onChange={handleGeneralChange}
                >
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
            {isTemplate && (
              <form className="editor-form" onSubmit={saveHeroSetup}>
                <div className="editor-subsection">
                  <h3>Настройки главного героя</h3>
                  {!generalForm.primary_hero && (
                    <>
                      <div className="template-meta">
                        Параметры для выбора: {heroSetupSummary.requiredFields.join(', ') || '—'}
                      </div>
                      <div className="template-meta">
                        Задано по умолчанию: {heroSetupSummary.presetFields.join(', ') || '—'}
                      </div>
                    </>
                  )}
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
                        setHeroSetupForm((prev) => ({
                          ...prev,
                          default_body_power: event.target.value,
                        }))
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
                        setHeroSetupForm((prev) => ({
                          ...prev,
                          default_mind_power: event.target.value,
                        }))
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
                        setHeroSetupForm((prev) => ({
                          ...prev,
                          default_will_power: event.target.value,
                        }))
                      }
                      disabled={heroSetupForm.require_will_power}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <div className="template-meta">
                    Знания систем и приемов выбираются при старте приключения.
                  </div>
                </div>
                <div className="form-actions">
                  <button className="primary-button" type="submit" disabled={savingHeroSetup}>
                    Сохранить настройки героя
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {activeTab === 'locations' && (
          <div className="editor-section">
            <div className="editor-list">
              {locations.items.length === 0 && (
                <p className="templates-empty">Пока нет локаций.</p>
              )}
              {locations.items.map((item) => (
                <article className="template-card" key={item.id}>
                  <h4>{item.title}</h4>
                  {item.description && <p>{item.description}</p>}
                  <div className="template-meta">
                    Координаты: {item.x}, {item.y} • Размер: {item.width}x{item.height}
                  </div>
                  <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
                  <div className="template-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => locations.startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => locations.remove(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form className="editor-form" onSubmit={locations.submit}>
              {locations.error && <div className="error-message">{locations.error}</div>}
              <label>
                Название
                <input
                  value={locations.form.title}
                  onChange={(event) =>
                    locations.setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Описание
                <textarea
                  rows="3"
                  value={locations.form.description}
                  onChange={(event) =>
                    locations.setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
              <div className="form-row">
                <label>
                  X
                  <input
                    type="number"
                    value={locations.form.x}
                    onChange={(event) =>
                      locations.setForm((prev) => ({ ...prev, x: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={locations.form.y}
                    onChange={(event) =>
                      locations.setForm((prev) => ({ ...prev, y: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Ширина
                  <input
                    type="number"
                    min="1"
                    value={locations.form.width}
                    onChange={(event) =>
                      locations.setForm((prev) => ({ ...prev, width: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Высота
                  <input
                    type="number"
                    min="1"
                    value={locations.form.height}
                    onChange={(event) =>
                      locations.setForm((prev) => ({ ...prev, height: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label>
                Теги (через запятую)
                <input
                  value={locations.form.tags}
                  onChange={(event) =>
                    locations.setForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
                />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={locations.saving}>
                  {locations.editingId ? 'Сохранить' : 'Добавить'}
                </button>
                {locations.editingId && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={locations.resetForm}
                  >
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'characters' && (
          <div className="editor-section">
            <div className="editor-list">
              {characters.items.length === 0 && (
                <p className="templates-empty">Пока нет персонажей.</p>
              )}
              {characters.items.map((item) => (
                <article className="template-card" key={item.id}>
                  <h4>{item.title}</h4>
                  {item.description && <p>{item.description}</p>}
                  <div className="template-meta">
                    Роль: {item.is_player ? 'Игрок' : 'NPC'} •{' '}
                    {item.in_party ? 'В партии' : 'Вне партии'}
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
            <div className="editor-stack">
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
                <h3>
                  Знания систем
                  {activeCharacter && `: ${activeCharacter.title}`}
                </h3>
                <div className="editor-list">
                  {!activeCharacterId && (
                    <p className="templates-empty">Выберите персонажа для управления знаниями.</p>
                  )}
                  {activeCharacterId && activeCharacterSystems.length === 0 && (
                    <p className="templates-empty">Пока нет записей.</p>
                  )}
                  {activeCharacterSystems.map((item) => (
                    <article className="template-card" key={item.id}>
                      <h4>
                        {characters.items.find((char) => char.id === item.character)?.title || '—'}
                      </h4>
                      <div className="template-meta">
                        Система:{' '}
                        {systems.items.find((system) => system.id === item.system)?.title || '—'}
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
                  {characterSystems.error && (
                    <div className="error-message">{characterSystems.error}</div>
                  )}
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
                <h3>
                  Выученные приемы
                  {activeCharacter && `: ${activeCharacter.title}`}
                </h3>
                <div className="editor-list">
                  {!activeCharacterId && (
                    <p className="templates-empty">Выберите персонажа для управления приемами.</p>
                  )}
                  {activeCharacterId && activeCharacterTechniques.length === 0 && (
                    <p className="templates-empty">Пока нет записей.</p>
                  )}
                  {activeCharacterTechniques.map((item) => (
                    <article className="template-card" key={item.id}>
                      <h4>
                        {characters.items.find((char) => char.id === item.character)?.title || '—'}
                      </h4>
                      <div className="template-meta">
                        Прием:{' '}
                        {techniques.items.find((technique) => technique.id === item.technique)
                          ?.title || '—'}
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
        )}

        {activeTab === 'races' && (
          <div className="editor-section">
            <div className="editor-list">
              {races.items.length === 0 && <p className="templates-empty">Пока нет рас.</p>}
              {races.items.map((item) => (
                <article className="template-card" key={item.id}>
                  <h4>{item.title}</h4>
                  {item.description && <p>{item.description}</p>}
                  <div className="template-meta">
                    Продолжительность жизни: {item.life_span ?? 100}
                  </div>
                  <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
                  <div className="template-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => races.startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => races.remove(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form className="editor-form" onSubmit={races.submit}>
              {races.error && <div className="error-message">{races.error}</div>}
              <label>
                Название
                <input
                  value={races.form.title}
                  onChange={(event) =>
                    races.setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Описание
                <textarea
                  rows="3"
                  value={races.form.description}
                  onChange={(event) =>
                    races.setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
              <label>
                Продолжительность жизни
                <input
                  type="number"
                  min="0"
                  value={races.form.life_span}
                  onChange={(event) =>
                    races.setForm((prev) => ({ ...prev, life_span: event.target.value }))
                  }
                />
              </label>
              <label>
                Теги (через запятую)
                <input
                  value={races.form.tags}
                  onChange={(event) =>
                    races.setForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
                />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={races.saving}>
                  {races.editingId ? 'Сохранить' : 'Добавить'}
                </button>
                {races.editingId && (
                  <button className="secondary-button" type="button" onClick={races.resetForm}>
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'systems' && (
          <div className="editor-section">
            <div className="editor-list">
              {systems.items.length === 0 && <p className="templates-empty">Пока нет систем.</p>}
              {systems.items.map((item) => (
                <article className="template-card" key={item.id}>
                  <h4>{item.title}</h4>
                  {item.description && <p>{item.description}</p>}
                  <div className="template-meta">
                    Веса: тело {item.w_body}, разум {item.w_mind}, воля {item.w_will}
                  </div>
                  {item.formula_hint && (
                    <div className="template-meta">Формула: {item.formula_hint}</div>
                  )}
                  <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
                  <div className="template-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => systems.startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => systems.remove(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form className="editor-form" onSubmit={systems.submit}>
              {systems.error && <div className="error-message">{systems.error}</div>}
              <label>
                Название
                <input
                  value={systems.form.title}
                  onChange={(event) =>
                    systems.setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Описание
                <textarea
                  rows="3"
                  value={systems.form.description}
                  onChange={(event) =>
                    systems.setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
              <div className="form-row">
                <label>
                  Вес тела
                  <input
                    type="number"
                    min="0"
                    value={systems.form.w_body}
                    onChange={(event) =>
                      systems.setForm((prev) => ({ ...prev, w_body: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Вес разума
                  <input
                    type="number"
                    min="0"
                    value={systems.form.w_mind}
                    onChange={(event) =>
                      systems.setForm((prev) => ({ ...prev, w_mind: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Вес воли
                  <input
                    type="number"
                    min="0"
                    value={systems.form.w_will}
                    onChange={(event) =>
                      systems.setForm((prev) => ({ ...prev, w_will: event.target.value }))
                    }
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
                  onChange={(event) =>
                    systems.setForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
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
        )}

        {activeTab === 'techniques' && (
          <div className="editor-section">
            <div className="editor-list">
              {techniques.items.length === 0 && (
                <p className="templates-empty">Пока нет приемов.</p>
              )}
              {techniques.items.map((item) => (
                <article className="template-card" key={item.id}>
                  <h4>{item.title}</h4>
                  {item.description && <p>{item.description}</p>}
                  <div className="template-meta">
                    Система:{' '}
                    {systems.items.find((system) => system.id === item.system)?.title || '—'}
                  </div>
                  <div className="template-meta">
                    Сложность {item.difficulty} • Ранг {item.tier ?? '—'} • Треб. уровень{' '}
                    {item.required_system_level}
                  </div>
                  <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
                  <div className="template-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => techniques.startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => techniques.remove(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form className="editor-form" onSubmit={techniques.submit}>
              {techniques.error && <div className="error-message">{techniques.error}</div>}
              <label>
                Система
                <select
                  value={techniques.form.system}
                  onChange={(event) =>
                    techniques.setForm((prev) => ({ ...prev, system: event.target.value }))
                  }
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
                  onChange={(event) =>
                    techniques.setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
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
                  onChange={(event) =>
                    techniques.setForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
                />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={techniques.saving}>
                  {techniques.editingId ? 'Сохранить' : 'Добавить'}
                </button>
                {techniques.editingId && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={techniques.resetForm}
                  >
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="editor-section">
            <div className="editor-list">
              {events.items.length === 0 && (
                <p className="templates-empty">Пока нет событий.</p>
              )}
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
                  <div className="template-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => events.startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => events.remove(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
              <form className="editor-form" onSubmit={events.submit}>
                {events.error && <div className="error-message">{events.error}</div>}
              <label>
                Название
                <input
                  value={events.form.title}
                  onChange={(event) =>
                    events.setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Статус
                <select
                  value={events.form.status}
                  onChange={(event) =>
                    events.setForm((prev) => ({ ...prev, status: event.target.value }))
                  }
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
                  onChange={(event) =>
                    events.setForm((prev) => ({ ...prev, location: event.target.value }))
                  }
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
                  onChange={(event) =>
                    events.setForm((prev) => ({ ...prev, trigger_hint: event.target.value }))
                  }
                />
              </label>
              <label>
                Текущее состояние
                <textarea
                  rows="2"
                  value={events.form.state}
                  onChange={(event) =>
                    events.setForm((prev) => ({ ...prev, state: event.target.value }))
                  }
                />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={events.saving}>
                  {events.editingId ? 'Сохранить' : 'Добавить'}
                </button>
                {events.editingId && (
                  <button
                    className="secondary-button"
                    type="button"
                  onClick={() => {
                    events.resetForm();
                  }}
                >
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'factions' && (
          <div className="editor-section">
            <div className="editor-list">
              {factions.items.length === 0 && (
                <p className="templates-empty">Пока нет фракций.</p>
              )}
              {factions.items.map((item) => (
                <article className="template-card" key={item.id}>
                  <h4>{item.title}</h4>
                  {item.description && <p>{item.description}</p>}
                  <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
                  <div className="template-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => factions.startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => factions.remove(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form className="editor-form" onSubmit={factions.submit}>
              {factions.error && <div className="error-message">{factions.error}</div>}
              <label>
                Название
                <input
                  value={factions.form.title}
                  onChange={(event) =>
                    factions.setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
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
                  onChange={(event) =>
                    factions.setForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
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
        )}

        {activeTab === 'other' && (
          <div className="editor-section">
            <div className="editor-list">
              {otherInfo.items.length === 0 && (
                <p className="templates-empty">Пока нет записей.</p>
              )}
              {otherInfo.items.map((item) => (
                <article className="template-card" key={item.id}>
                  <h4>{item.title}</h4>
                  {item.category && <div className="template-meta">Категория: {item.category}</div>}
                  {item.description && <p>{item.description}</p>}
                  <div className="template-meta">Теги: {formatTags(item.tags) || '—'}</div>
                  <div className="template-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => otherInfo.startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => otherInfo.remove(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form className="editor-form" onSubmit={otherInfo.submit}>
              {otherInfo.error && <div className="error-message">{otherInfo.error}</div>}
              <label>
                Категория
                <input
                  value={otherInfo.form.category}
                  onChange={(event) =>
                    otherInfo.setForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                />
              </label>
              <label>
                Заголовок
                <input
                  value={otherInfo.form.title}
                  onChange={(event) =>
                    otherInfo.setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
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
                />
              </label>
              <label>
                Теги (через запятую)
                <input
                  value={otherInfo.form.tags}
                  onChange={(event) =>
                    otherInfo.setForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
                />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={otherInfo.saving}>
                  {otherInfo.editingId ? 'Сохранить' : 'Добавить'}
                </button>
                {otherInfo.editingId && (
                  <button className="secondary-button" type="button" onClick={otherInfo.resetForm}>
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdventureEditPage;
