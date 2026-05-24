'use client';

import { useEffect, useRef, useState } from 'react';
import PlacesAutocomplete, { geocodeByAddress, getLatLng, type Suggestion } from 'react-places-autocomplete';
import { MapPin, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface LocationResult {
  city: string;
  state: string;
  pincode?: string;
  country: string;
  street?: string;
  displayText: string;
  latitude?: number;
  longitude?: number;
}

interface LocationAutocompleteProps {
  defaultValue?: string;
  placeholder?: string;
  onSelect: (loc: LocationResult) => void;
  onClear?: () => void;
  disabled?: boolean;
  inputClassName?: string;
  className?: string;
}

const INDIA_SEARCH_OPTIONS = {
  componentRestrictions: { country: 'in' },
};

export function LocationAutocomplete({
  defaultValue = '',
  placeholder = 'Search city, area…',
  onSelect,
  onClear,
  disabled = false,
  inputClassName,
  className,
}: LocationAutocompleteProps) {
  const [address, setAddress] = useState(defaultValue);
  const [mapsReady, setMapsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAddress(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      setMapsReady(true);
      return;
    }
    const interval = setInterval(() => {
      if ((window as any).google?.maps?.places) {
        setMapsReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = async (value: string) => {
    try {
      const results = await geocodeByAddress(value);
      const latlng = await getLatLng(results[0]);
      const components = results[0].address_components;
      const formatted = results[0].formatted_address;

      let city = '';
      let state = '';
      let pincode = '';
      let country = '';
      let streetNumber = '';
      let route = '';
      let sublocalityL1 = '';

      for (const comp of components) {
        if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_3')) {
          city = comp.long_name;
        } else if (comp.types.includes('administrative_area_level_1')) {
          state = comp.long_name;
        } else if (comp.types.includes('postal_code')) {
          pincode = comp.long_name;
        } else if (comp.types.includes('country')) {
          country = comp.long_name;
        } else if (comp.types.includes('street_number')) {
          streetNumber = comp.long_name;
        } else if (comp.types.includes('route')) {
          route = comp.long_name;
        } else if (comp.types.includes('sublocality_level_1')) {
          sublocalityL1 = comp.long_name;
        }
      }

      const street = [streetNumber, route].filter(Boolean).join(' ') || sublocalityL1 || undefined;
      const displayText = city || state || formatted;
      setAddress(displayText);

      onSelect({
        city,
        state,
        pincode: pincode || undefined,
        country,
        street,
        displayText,
        latitude: latlng.lat,
        longitude: latlng.lng,
      });
    } catch {
      setAddress(value);
    }
  };

  const handleClear = () => {
    setAddress('');
    onClear?.();
    inputRef.current?.focus();
  };

  if (!mapsReady) {
    return (
      <div className={cn('relative', className)}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
        <input
          disabled
          placeholder={placeholder}
          className={cn(
            'w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground opacity-60 cursor-not-allowed',
            inputClassName,
          )}
        />
      </div>
    );
  }

  return (
    <PlacesAutocomplete
      value={address}
      onChange={setAddress}
      onSelect={handleSelect}
      searchOptions={INDIA_SEARCH_OPTIONS}
      debounce={350}
    >
      {({ getInputProps, suggestions, getSuggestionItemProps, loading }: { getInputProps: (opts?: Record<string, unknown>) => Record<string, unknown>; suggestions: Suggestion[]; getSuggestionItemProps: (s: Suggestion, opts?: Record<string, unknown>) => Record<string, unknown>; loading: boolean }) => (
        <div className={cn('relative', className)}>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <input
              {...getInputProps({
                placeholder,
                disabled,
                ref: inputRef,
                autoComplete: 'new-password',
              })}
              className={cn(
                'w-full h-10 pl-9 pr-8 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed',
                inputClassName,
              )}
            />
            {address && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                tabIndex={-1}
                aria-label="Clear location"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {(suggestions.length > 0 || loading) && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[200] bg-white rounded-md border border-border shadow-lg max-h-60 overflow-y-auto">
              {loading && (
                <div className="px-3 py-2 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              )}
              {suggestions.map((suggestion: Suggestion, index: number) => (
                <div
                  {...getSuggestionItemProps(suggestion)}
                  key={`${index}_${suggestion.placeId}`}
                  className={`flex items-start gap-2 px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    suggestion.active ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span>{suggestion.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PlacesAutocomplete>
  );
}
