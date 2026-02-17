import { createContext, useContext, useState, type ReactNode } from 'react';

interface QuizModeContextType {
  isQuizActive: boolean;
  setQuizActive: (active: boolean) => void;
}

const QuizModeContext = createContext<QuizModeContextType | undefined>(undefined);

export function QuizModeProvider({ children }: { children: ReactNode }) {
  const [isQuizActive, setIsQuizActive] = useState(false);

  return (
    <QuizModeContext.Provider value={{ isQuizActive, setQuizActive: setIsQuizActive }}>
      {children}
    </QuizModeContext.Provider>
  );
}

export function useQuizMode() {
  const context = useContext(QuizModeContext);
  if (!context) {
    throw new Error('useQuizMode must be used within a QuizModeProvider');
  }
  return context;
}
