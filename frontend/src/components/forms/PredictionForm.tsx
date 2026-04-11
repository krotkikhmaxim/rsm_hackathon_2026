// frontend/src/components/forms/PredictionForm.tsx

import React, { useState } from 'react';
import { PredictRequest } from '../../types/prediction';

interface PredictionFormProps {
  onSubmit: (data: PredictRequest) => Promise<void> | void;
  isLoading: boolean;
}

// Справочники (в будущем будут подгружаться с бэкенда)
const ENTERPRISE_TYPES = [
  'Медицина',
  'НКО',
  'Образование',
  'Госсектор',
  'Финансы',
  'Промышленность',
];

const REGIONS = [
  'Москва',
  'Якутия',
  'Краснодарский край',
  'Хабаровский край',
  'Свердловская область',
  'Татарстан',
];

export default function PredictionForm({ onSubmit, isLoading }: PredictionFormProps) {
  const [formData, setFormData] = useState<PredictRequest>({
    enterprise_type: ENTERPRISE_TYPES[0],
    region: REGIONS[0],
    host_count: 100,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PredictRequest, string>>>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.enterprise_type) newErrors.enterprise_type = 'Выберите отрасль';
    if (!formData.region) newErrors.region = 'Выберите регион';
    if (formData.host_count < 1) newErrors.host_count = 'Минимум 1 хост';
    if (formData.host_count > 100000) newErrors.host_count = 'Слишком большое число';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
    // Сброс ошибки поля при изменении
    if (errors[name as keyof PredictRequest]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="enterprise_type" className="block text-sm font-medium text-gray-700">
          Отрасль
        </label>
        <select
          id="enterprise_type"
          name="enterprise_type"
          value={formData.enterprise_type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {ENTERPRISE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.enterprise_type && (
          <p className="mt-1 text-sm text-red-600">{errors.enterprise_type}</p>
        )}
      </div>

      <div>
        <label htmlFor="region" className="block text-sm font-medium text-gray-700">
          Регион
        </label>
        <select
          id="region"
          name="region"
          value={formData.region}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        {errors.region && (
          <p className="mt-1 text-sm text-red-600">{errors.region}</p>
        )}
      </div>

      <div>
        <label htmlFor="host_count" className="block text-sm font-medium text-gray-700">
          Количество хостов
        </label>
        <input
          type="number"
          id="host_count"
          name="host_count"
          value={formData.host_count}
          onChange={handleChange}
          min={1}
          max={100000}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.host_count && (
          <p className="mt-1 text-sm text-red-600">{errors.host_count}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Выполняется прогноз...' : 'Запустить прогноз'}
      </button>
    </form>
  );
}