"use client";

import NavigationBar from "./NavigationBar";
import { useHighPriorityConflicts } from "../hooks/useHighPriorityConflicts";

interface NavigationWrapperProps {
  children: React.ReactNode;
}

export default function NavigationWrapper({ children }: NavigationWrapperProps) {
  const { highPriorityCount } = useHighPriorityConflicts();

  return (
    <>
      <NavigationBar highPriorityConflicts={highPriorityCount} />
      {children}
    </>
  );
}
