import { createContext, useContext } from 'react';

/** Nome de quem está usando o app (para as siglas do header); null antes de entrar. */
const UsuarioContext = createContext<string | null>(null);

export const UsuarioProvider = UsuarioContext.Provider;

export function useNomeUsuario(): string | null {
  return useContext(UsuarioContext);
}
