'use client';

import { createContext, useContext, useState, type ReactNode, Children, isValidElement } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/client/components/ui/button";

interface BranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToNext: () => void;
  goToPrevious: () => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const useBranchContext = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('Branch components must be used within a Branch component');
  }
  return context;
};

interface BranchProps {
  children: ReactNode;
  defaultBranch?: number;
}

export const Branch = ({ children, defaultBranch = 0 }: BranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);

  const childrenArray = Children.toArray(children);
  const branchMessages = childrenArray.find(
    (child) => isValidElement(child) && child.type === BranchMessages
  );

  const totalBranches = branchMessages && isValidElement<BranchMessagesProps>(branchMessages)
    ? Children.count(branchMessages.props.children)
    : 0;

  const goToNext = () => {
    setCurrentBranch((prev) => Math.min(prev + 1, totalBranches - 1));
  };

  const goToPrevious = () => {
    setCurrentBranch((prev) => Math.max(prev - 1, 0));
  };

  return (
    <BranchContext.Provider value={{ currentBranch, totalBranches, goToNext, goToPrevious }}>
      <div className="space-y-2">
        {children}
      </div>
    </BranchContext.Provider>
  );
};

interface BranchMessagesProps {
  children: ReactNode;
}

export const BranchMessages = ({ children }: BranchMessagesProps) => {
  const { currentBranch } = useBranchContext();
  const childrenArray = Children.toArray(children);

  return <>{childrenArray[currentBranch]}</>;
};

interface BranchSelectorProps {
  children: ReactNode;
  from?: 'user' | 'assistant';
}

export const BranchSelector = ({ children, from }: BranchSelectorProps) => {
  const { totalBranches } = useBranchContext();

  if (totalBranches <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${from === 'assistant' ? 'justify-start' : 'justify-end'}`}>
      {children}
    </div>
  );
};

export const BranchPrevious = () => {
  const { currentBranch, goToPrevious } = useBranchContext();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={goToPrevious}
      disabled={currentBranch === 0}
      className="h-7 w-7 p-0"
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
  );
};

export const BranchNext = () => {
  const { currentBranch, totalBranches, goToNext } = useBranchContext();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={goToNext}
      disabled={currentBranch === totalBranches - 1}
      className="h-7 w-7 p-0"
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
};

export const BranchPage = () => {
  const { currentBranch, totalBranches } = useBranchContext();

  return (
    <span className="text-xs text-muted-foreground">
      {currentBranch + 1} / {totalBranches}
    </span>
  );
};
