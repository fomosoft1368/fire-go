import { API_BASE_URL } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getHeaders() {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

export const bonusService = {
  /** Driver: get active rules with progress for the current period */
  getDriverProgress: () => apiFetch('/bonuses/driver/progress'),

  /** Driver: get own claim history */
  getDriverClaims: () => apiFetch('/bonuses/driver/claims'),

  /** Driver: submit a bonus claim */
  createClaim: (bonusRuleId: string) =>
    apiFetch('/bonuses/driver/claims', {
      method: 'POST',
      body: JSON.stringify({ bonusRuleId }),
    }),
};
