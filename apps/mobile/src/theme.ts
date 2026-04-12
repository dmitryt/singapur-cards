export const STATUS_COLORS = {
  learned:     '#d4edda',
  not_learned: '#f8d7da',
  unreviewed:  '#ffffff',
} as const;

export const STATUS_BADGE = {
  learned:     { background: '#21ba45', text: '#fff',     label: 'Learned'     },
  not_learned: { background: '#db2828', text: '#fff',     label: 'Not Learned' },
  unreviewed:  { background: '#d4d4d5', text: '#212529',  label: 'New'         },
} as const;

export const COLORS = {
  primary:       '#2185d0',
  primaryDark:   '#1678c2',
  border:        '#d4d4d5',
  text:          '#212529',
  textSecondary: '#6c757d',
  surface:       '#ffffff',
  background:    '#f9fafb',
} as const;
