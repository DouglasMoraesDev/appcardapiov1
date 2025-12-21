import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('deve renderizar sem erros', () => {
    render(<App />);
    // Espera que algum texto padrão da tela inicial apareça
    expect(screen.getByText(/cardápio|restaurante|login/i)).toBeInTheDocument();
  });
});
