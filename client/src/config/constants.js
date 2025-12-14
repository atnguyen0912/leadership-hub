// UI Timing Constants
export const TOAST_DURATION = 3000; // Duration to show success/error toasts
export const REDIRECT_DELAY = 2000; // Delay before redirecting after action

// POS Grid Configuration
export const POS_GRID = {
  COLS: 4,
  ROWS: 3,
};

// Currency Denominations
export const DENOMINATIONS = [
  { value: 100, label: '$100' },
  { value: 50, label: '$50' },
  { value: 20, label: '$20' },
  { value: 10, label: '$10' },
  { value: 5, label: '$5' },
  { value: 1, label: '$1' },
  { value: 0.25, label: 'Quarters' },
  { value: 0.1, label: 'Dimes' },
  { value: 0.05, label: 'Nickels' },
  { value: 0.01, label: 'Pennies' },
];

// API Base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Local Storage Keys
export const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
  THEME: 'theme',
};
