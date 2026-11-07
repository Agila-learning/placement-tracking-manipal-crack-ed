import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, MapPin, X } from 'lucide-react';
import indiaLocationsData from '../../data/indiaLocations.json';

interface LocationData {
  [stateName: string]: {
    code: string;
    districts: string[];
  };
}

const locations: LocationData = indiaLocationsData as LocationData;
const STATE_NAMES = Object.keys(locations).sort();

interface IndiaLocationSelectorProps {
  selectedState?: string;
  selectedDistrict?: string;
  onStateChange: (state: string, stateCode?: string) => void;
  onDistrictChange: (district: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export const IndiaLocationSelector: React.FC<IndiaLocationSelectorProps> = ({
  selectedState = '',
  selectedDistrict = '',
  onStateChange,
  onDistrictChange,
  disabled = false,
  required = false,
}) => {
  const [stateOpen, setStateOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  const stateRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
        setStateOpen(false);
      }
      if (districtRef.current && !districtRef.current.contains(e.target as Node)) {
        setDistrictOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered states list
  const filteredStates = useMemo(() => {
    const q = stateSearch.toLowerCase().trim();
    if (!q) return STATE_NAMES;
    return STATE_NAMES.filter(
      (s) => s.toLowerCase().includes(q) || locations[s]?.code.toLowerCase().includes(q)
    );
  }, [stateSearch]);

  // Available districts for the selected state
  const availableDistricts = useMemo(() => {
    if (!selectedState || !locations[selectedState]) return [];
    return locations[selectedState].districts.slice().sort();
  }, [selectedState]);

  // Filtered districts list
  const filteredDistricts = useMemo(() => {
    const q = districtSearch.toLowerCase().trim();
    if (!q) return availableDistricts;
    return availableDistricts.filter((d) => d.toLowerCase().includes(q));
  }, [districtSearch, availableDistricts]);

  const handleSelectState = (stateName: string) => {
    const stateCode = locations[stateName]?.code;
    onStateChange(stateName, stateCode);
    onDistrictChange(''); // clear district when state changes
    setStateOpen(false);
    setStateSearch('');
  };

  const handleSelectDistrict = (districtName: string) => {
    onDistrictChange(districtName);
    setDistrictOpen(false);
    setDistrictSearch('');
  };

  const handleClearState = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStateChange('', '');
    onDistrictChange('');
  };

  const handleClearDistrict = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDistrictChange('');
  };

  return (
    <>
      {/* 1. Searchable State Dropdown */}
      <div className="relative" ref={stateRef}>
        <label className="fic-label">
          State / UT {required && <span className="text-red-500">*</span>}
        </label>
        <div
          onClick={() => {
            if (!disabled) {
              setStateOpen(!stateOpen);
              setDistrictOpen(false);
            }
          }}
          className={`fic-input flex items-center justify-between cursor-pointer min-h-[42px] ${
            disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'bg-white hover:border-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 truncate text-sm">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {selectedState ? (
              <span className="font-medium text-slate-800 truncate">
                {selectedState}{' '}
                {locations[selectedState] && (
                  <span className="text-xs text-slate-400 font-normal">
                    ({locations[selectedState].code})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">Select State or UT</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {selectedState && !disabled && (
              <button
                type="button"
                onClick={handleClearState}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                aria-label="Clear state"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                stateOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {stateOpen && !disabled && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-fic-border rounded-xl shadow-2xl z-50 overflow-hidden py-1">
            {/* Search Box */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search 28 States & 8 UTs..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-fic-navy bg-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
              {filteredStates.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">No state found</div>
              ) : (
                filteredStates.map((st) => {
                  const isSelected = selectedState === st;
                  return (
                    <div
                      key={st}
                      onClick={() => handleSelectState(st)}
                      className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50 text-fic-navy font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">
                        {st} <span className="text-slate-400 ml-1">({locations[st]?.code})</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-fic-navy flex-shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Dependent Searchable District / City Dropdown */}
      <div className="relative" ref={districtRef}>
        <label className="fic-label">
          District / City {required && <span className="text-red-500">*</span>}
        </label>
        <div
          onClick={() => {
            if (!disabled && selectedState) {
              setDistrictOpen(!districtOpen);
              setStateOpen(false);
            }
          }}
          className={`fic-input flex items-center justify-between min-h-[42px] ${
            !selectedState
              ? 'opacity-50 cursor-not-allowed bg-slate-100 border-dashed'
              : disabled
              ? 'opacity-60 cursor-not-allowed bg-slate-100'
              : 'cursor-pointer bg-white hover:border-slate-400'
          }`}
          title={!selectedState ? 'Please select a State / UT first' : ''}
        >
          <div className="flex items-center gap-2 truncate text-sm">
            {selectedDistrict ? (
              <span className="font-medium text-slate-800 truncate">{selectedDistrict}</span>
            ) : (
              <span className="text-slate-400">
                {selectedState ? 'Select District / City' : 'Select State First'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {selectedDistrict && !disabled && (
              <button
                type="button"
                onClick={handleClearDistrict}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                aria-label="Clear district"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                districtOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {districtOpen && !disabled && selectedState && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-fic-border rounded-xl shadow-2xl z-50 overflow-hidden py-1">
            {/* Search Box */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder={`Search ${availableDistricts.length} districts in ${selectedState}...`}
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-fic-navy bg-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
              {filteredDistricts.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">No district found</div>
              ) : (
                filteredDistricts.map((dst) => {
                  const isSelected = selectedDistrict === dst;
                  return (
                    <div
                      key={dst}
                      onClick={() => handleSelectDistrict(dst)}
                      className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50 text-fic-navy font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{dst}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-fic-navy flex-shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default IndiaLocationSelector;

