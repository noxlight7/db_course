import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { tabs } from './adventureEdit/constants';
import useAdventureEntity from './adventureEdit/hooks/useAdventureEntity';
import { formatTags, serializeTags, toInt, toOptionalInt } from './adventureEdit/utils';
import GeneralTab from './adventureEdit/tabs/GeneralTab';
import LocationsTab from './adventureEdit/tabs/LocationsTab';
import CharactersTab from './adventureEdit/tabs/CharactersTab';
import RacesTab from './adventureEdit/tabs/RacesTab';
import SystemsTab from './adventureEdit/tabs/SystemsTab';
import TechniquesTab from './adventureEdit/tabs/TechniquesTab';
import EventsTab from './adventureEdit/tabs/EventsTab';
import FactionsTab from './adventureEdit/tabs/FactionsTab';
import OtherInfoTab from './adventureEdit/tabs/OtherInfoTab';

function AdventureEditPage({ user, apiBaseUrl, authRequest, entityScope = 'templates' }) {
  const { id } = useParams();
  const adventureId = Number(id);
  const [activeTab, setActiveTab] = useState('general');
  const [activeCharacterId, setActiveCharacterId] = useState(null);
  const [adventure, setAdventure] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
  const readOnly = Boolean(adventure && adventure.can_edit === false);

  const locations = useAdventureEntity({
    adventureId,
    endpoint: `${baseEndpoint}locations/`,
    authRequest,
    readOnly,
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
    readOnly,
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
    readOnly,
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
    readOnly,
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
    readOnly,
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
    readOnly,
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
    readOnly,
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
    readOnly,
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
    readOnly,
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
    readOnly,
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
          default_location: response.data.default_location ? String(response.data.default_location) : '',
          require_race: Boolean(response.data.require_race),
          default_race: response.data.default_race ? String(response.data.default_race) : '',
          require_age: Boolean(response.data.require_age),
          default_age:
            response.data.default_age === null || response.data.default_age === undefined
              ? ''
              : String(response.data.default_age),
          require_body_power: Boolean(response.data.require_body_power),
          default_body_power:
            response.data.default_body_power === null || response.data.default_body_power === undefined
              ? ''
              : String(response.data.default_body_power),
          require_mind_power: Boolean(response.data.require_mind_power),
          default_mind_power:
            response.data.default_mind_power === null || response.data.default_mind_power === undefined
              ? ''
              : String(response.data.default_mind_power),
          require_will_power: Boolean(response.data.require_will_power),
          default_will_power:
            response.data.default_will_power === null || response.data.default_will_power === undefined
              ? ''
              : String(response.data.default_will_power),
        });
      } catch (error) {
        setHeroSetupError('Не удалось загрузить настройки героя.');
      }
    };
    fetchHeroSetup();
  }, [user, adventureId, authRequest, heroSetupEndpoint, isTemplate]);

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
    if (readOnly) return;
    const { name, value } = event.target;
    setGeneralForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveGeneral = async (event) => {
    event.preventDefault();
    if (readOnly) return;
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
    if (readOnly) return;
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

  const canSubmitForModeration =
    isTemplate &&
    adventure &&
    adventure.can_edit &&
    !adventure.is_under_moderation &&
    !adventure.is_published;

  const handleSubmitForModeration = async () => {
    if (!canSubmitForModeration) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await authRequest({
        method: 'post',
        url: `${apiBaseUrl}/api/adventures/templates/${adventureId}/submit/`,
      });
      setAdventure((prev) => (prev ? { ...prev, is_under_moderation: true } : prev));
    } catch (error) {
      setSubmitError('Не удалось отправить приключение на модерацию.');
    } finally {
      setSubmitting(false);
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
          <p className="editor-subtitle">
            {readOnly
              ? 'Режим просмотра: изменения недоступны.'
              : 'Настройте все элементы шаблона по вкладкам ниже.'}
          </p>
          {adventure?.is_under_moderation && (
            <p className="template-meta">Отправлено на модерацию.</p>
          )}
          {adventure?.is_published && (
            <p className="template-meta">Приключение опубликовано.</p>
          )}
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
          <GeneralTab
            generalForm={generalForm}
            generalError={generalError}
            savingGeneral={savingGeneral}
            handleGeneralChange={handleGeneralChange}
            saveGeneral={saveGeneral}
            isTemplate={isTemplate}
            exportError={exportError}
            exporting={exporting}
            handleExportAdventure={handleExportAdventure}
            readOnly={readOnly}
            canSubmitForModeration={canSubmitForModeration}
            submittingModeration={submitting}
            submitModerationError={submitError}
            handleSubmitForModeration={handleSubmitForModeration}
            characters={characters}
            heroSetupSummary={heroSetupSummary}
            heroSetupForm={heroSetupForm}
            setHeroSetupForm={setHeroSetupForm}
            heroSetupError={heroSetupError}
            saveHeroSetup={saveHeroSetup}
            savingHeroSetup={savingHeroSetup}
            locations={locations}
            races={races}
          />
        )}
        {activeTab === 'locations' && <LocationsTab locations={locations} readOnly={readOnly} />}
        {activeTab === 'characters' && (
          <CharactersTab
            characters={characters}
            races={races}
            locations={locations}
            systems={systems}
            techniques={techniques}
            activeCharacterId={activeCharacterId}
            setActiveCharacterId={setActiveCharacterId}
            activeCharacter={activeCharacter}
            activeCharacterSystems={activeCharacterSystems}
            activeCharacterTechniques={activeCharacterTechniques}
            availableSystemsForTechniques={availableSystemsForTechniques}
            characterSystems={characterSystems}
            characterTechniques={characterTechniques}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'races' && <RacesTab races={races} readOnly={readOnly} />}
        {activeTab === 'systems' && <SystemsTab systems={systems} readOnly={readOnly} />}
        {activeTab === 'techniques' && (
          <TechniquesTab techniques={techniques} systems={systems} readOnly={readOnly} />
        )}
        {activeTab === 'events' && (
          <EventsTab events={events} locations={locations} readOnly={readOnly} />
        )}
        {activeTab === 'factions' && <FactionsTab factions={factions} readOnly={readOnly} />}
        {activeTab === 'other' && <OtherInfoTab otherInfo={otherInfo} readOnly={readOnly} />}
      </div>
    </div>
  );
}

export default AdventureEditPage;
