import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for debouncing values with configurable delay
 * Provides smooth UX by reducing API calls during user input
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}

/**
 * Custom hook for debounced search with instant clear functionality
 */
export function useDebouncedSearch(initialValue: string = '', delay: number = 500) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchValue = useDebouncedValue(searchValue, delay);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set searching state when user types
  const handleSearchChange = (value: string) => {
    setSearchValue(value);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If value is empty, don't show searching state
    if (!value.trim()) {
      setIsSearching(false);
      return;
    }

    // Show searching state immediately
    setIsSearching(true);

    // Clear searching state after debounce delay + small buffer
    timeoutRef.current = setTimeout(() => {
      setIsSearching(false);
    }, delay + 100);
  };

  // Clear searching state when debounced value updates
  useEffect(() => {
    if (debouncedSearchValue !== searchValue) {
      setIsSearching(false);
    }
  }, [debouncedSearchValue, searchValue]);

  // Instant clear function
  const clearSearch = () => {
    setSearchValue('');
    setIsSearching(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return {
    searchValue,
    debouncedSearchValue,
    isSearching,
    handleSearchChange,
    clearSearch
  };
}