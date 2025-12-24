import { useCallback, useEffect, useState } from 'react';

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

export default useAdventureEntity;
