import React from 'react';

export const handleDecimalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (
    ['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key) ||
    e.ctrlKey || e.metaKey
  ) {
    return;
  }
  if (e.key === '.' && !e.currentTarget.value.includes('.')) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

export const handleIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (
    ['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key) ||
    e.ctrlKey || e.metaKey
  ) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};
