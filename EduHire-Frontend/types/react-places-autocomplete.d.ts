declare module 'react-places-autocomplete' {
  import { Component, ReactNode } from 'react';

  export interface Suggestion {
    active: boolean;
    description: string;
    id: string;
    index: number;
    placeId: string;
    terms: Array<{ offset: number; value: string }>;
    types: string[];
    formattedSuggestion: { mainText: string; secondaryText: string };
    matchedSubstrings: Array<{ length: number; offset: number }>;
  }

  export interface RenderFuncProps {
    getInputProps: (options?: Record<string, unknown>) => Record<string, unknown>;
    suggestions: Suggestion[];
    getSuggestionItemProps: (suggestion: Suggestion, options?: Record<string, unknown>) => Record<string, unknown>;
    loading: boolean;
  }

  export interface PlacesAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (value: string) => void;
    searchOptions?: Record<string, unknown>;
    debounce?: number;
    highlightFirstSuggestion?: boolean;
    shouldFetchSuggestions?: boolean;
    onError?: (status: string, clearSuggestions: () => void) => void;
    children: (props: RenderFuncProps) => ReactNode;
  }

  export default class PlacesAutocomplete extends Component<PlacesAutocompleteProps> {}

  export function geocodeByAddress(address: string): Promise<google.maps.GeocoderResult[]>;
  export function geocodeByPlaceId(placeId: string): Promise<google.maps.GeocoderResult[]>;
  export function getLatLng(result: google.maps.GeocoderResult): Promise<{ lat: number; lng: number }>;
}
