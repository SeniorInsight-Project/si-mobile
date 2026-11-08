import React, { createContext, useContext, ReactNode } from 'react';

export interface IdosoContextType {
  idosoId: string | null;
  setIdosoId: (id: string | null) => void;
  nomeIdoso: string | null;
  setNomeIdoso: (nome: string | null) => void;
}

const IdosoContext = createContext<IdosoContextType>({
  idosoId: null,
  setIdosoId: () => {},
  nomeIdoso: null,
  setNomeIdoso: () => {},
});

export function IdosoProvider({
  value,
  children,
}: {
  value: IdosoContextType;
  children: ReactNode;
}) {
  return <IdosoContext.Provider value={value}>{children}</IdosoContext.Provider>;
}

export function useIdoso(): IdosoContextType {
  return useContext(IdosoContext);
}
