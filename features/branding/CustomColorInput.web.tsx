import React from 'react';

type CustomColorInputProps = {
  value: string;
  onChange: (hex: string) => void;
  onCommit: () => void;
};

/** Opens the browser colour picker. The visible swatch sits underneath. */
export function CustomColorInput({ value, onChange, onCommit }: CustomColorInputProps) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toLowerCase() : '#1fa84a';
  return React.createElement('input', {
    type: 'color',
    'aria-label': 'Choose a custom accent colour',
    value: safe,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    onBlur: () => onCommit(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0,
      zIndex: 1,
      cursor: 'pointer',
      border: 'none',
      padding: 0,
    },
  });
}
