import React, { createContext, useContext, ReactNode } from 'react';
import { useFirestoreData } from '../hooks/useFirestoreData';

// Týmto získame kompletný typ toho, čo vracia hook useFirestoreData (dáta aj CRUD funkcie)
// Vďaka ReturnType nemusíme manuálne udržiavať interface pri pridávaní nových polí v hooku
type UseFirestoreDataReturn = ReturnType<typeof useFirestoreData>;

const DataContext = createContext<UseFirestoreDataReturn | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
  isAuthenticated: boolean;
  currentUserRole: string;
}

/**
 * DataProvider obaľuje useFirestoreData a poskytuje výsledky do React Contextu.
 * Umožňuje komponentom pristupovať k dátam pomocou hooku useData().
 */
export const DataProvider: React.FC<DataProviderProps> = ({ 
  children, 
  isAuthenticated, 
  currentUserRole 
}) => {
  const data = useFirestoreData(isAuthenticated, currentUserRole);

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
};

/**
 * Vlastný hook pre jednoduchý prístup k centrálnemu úložisku dát.
 * @throws Error ak je použitý mimo DataProvidera.
 */
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};