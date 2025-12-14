export const HOUR_TYPES = [
  { value: 'poster_making', label: 'Poster Making', color: '#3b82f6' },
  { value: 'event_planning', label: 'Event Planning', color: '#8b5cf6' },
  { value: 'concessions', label: 'Concessions', color: '#22c55e' },
  { value: 'other', label: 'Other', color: '#6b7280' }
];

export const getHourTypeLabel = (value) => {
  const type = HOUR_TYPES.find(t => t.value === value);
  return type ? type.label : 'Other';
};

export const getHourTypeColor = (value) => {
  const type = HOUR_TYPES.find(t => t.value === value);
  return type ? type.color : '#6b7280';
};
