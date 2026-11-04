import React, { createContext, useContext } from 'react';
import { PapelApp } from '../services/acessoService';

const PapelContext = createContext<PapelApp | null>(null);

export const PapelProvider = PapelContext.Provider;

/** Papel de quem está usando o app (familiar ou idoso); null antes de entrar. */
export function usePapel(): PapelApp | null {
  return useContext(PapelContext);
}
