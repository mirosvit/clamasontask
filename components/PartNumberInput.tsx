
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';

interface PartNumberInputProps {
  parts: string[];
  onPartSelect: (part: string | null) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  value: string | null;
  onRequestPart?: (part: string) => Promise<boolean>; // Returns boolean based on success
}

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const PartNumberInput: React.FC<PartNumberInputProps> = ({ parts, onPartSelect, onInputChange, placeholder, value, onRequestPart }) => {
  const [query, setQuery] = useState<string>('');
  const [filteredParts, setFilteredParts] = useState<string[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  
  // Status state for the report button
  const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    // Sync internal query state with external value prop
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery === '') {
      setFilteredParts(parts);
    } else if (trimmedQuery.includes('*')) {
      // --- WILDCARD SEARCH LOGIC ---
      try {
        // Escape regex special chars EXCEPT *
        const escapeRegex = (str: string) => str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        
        // Convert user's "*" to regex ".*"
        // Anchor to start (^) and end ($) to match the whole pattern structure defined by user
        const pattern = trimmedQuery.split('*').map(escapeRegex).join('.*');
        const regex = new RegExp(`^${pattern}$`, 'i');

        setFilteredParts(parts.filter(part => regex.test(part)));
      } catch (e) {
        setFilteredParts([]);
      }
    } else {
      // --- STANDARD SUBSTRING SEARCH ---
      setFilteredParts(
        parts.filter(part =>
          part.toLowerCase().includes(trimmedQuery.toLowerCase())
        )
      );
    }
  }, [query, parts]);

  // Reset report status when query changes
  useEffect(() => {
    setReportStatus('idle');
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectPart = (part: string) => {
    setQuery(part);
    onPartSelect(part);
    if (onInputChange) onInputChange(part);
    setIsDropdownVisible(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    if (onInputChange) onInputChange(newValue);
    
    if (parts.includes(newValue)) {
      onPartSelect(newValue);
    } else {
      onPartSelect(null); // Clear selection if text doesn't match a full part
    }
  };

  const handleRequestClick = async (e: React.MouseEvent) => {
    // Prevent default to ensure focus logic doesn't interfere
    e.preventDefault();
    
    if (onRequestPart && query.trim()) {
        setReportStatus('loading');
        
        // Call the async function from App.tsx
        const success = await onRequestPart(query.trim());
        
        if (success) {
            setReportStatus('success');
            setIsDropdownVisible(false);
            // Reset status is handled by component unmounting/value changing usually,
            // but we can set a timeout to reset to idle if the input persists
            setTimeout(() => setReportStatus('idle'), 3000);
        } else {
            setReportStatus('idle');
        }
    }
  };

  // Determine if we should show the "Report" button
  const isExactMatch = parts.some(p => p.toLowerCase() === query.trim().toLowerCase());
  const hasWildcard = query.includes('*'); // Don't allow reporting wildcards
  const showReportButton = onRequestPart && query.trim() !== '' && !isExactMatch && !hasWildcard;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchIcon className="h-5 w-5 text-gray-500" />
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsDropdownVisible(true)}
          placeholder={placeholder || t('input_wildcard_hint')}
          className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
        />
      </div>

      {/* Standard Dropdown for Matches */}
      {isDropdownVisible && filteredParts.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <ul className="py-1">
            {filteredParts.map((part, index) => (
            <li
                key={index}
                onClick={() => handleSelectPart(part)}
                className="px-4 py-2 text-gray-300 hover:bg-teal-600 hover:text-white cursor-pointer transition-colors duration-150"
            >
                {part}
            </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prominent Report Button (Outside Dropdown) */}
      {showReportButton && (
        <div className="mt-2 animate-fade-in">
             <button
                type="button"
                onMouseDown={handleRequestClick}
                disabled={reportStatus !== 'idle'}
                className={`w-full py-3 px-4 font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] ${
                    reportStatus === 'success' 
                    ? 'bg-green-600 border border-green-500 text-white cursor-default' 
                    : reportStatus === 'loading'
                    ? 'bg-yellow-800 border border-yellow-700 text-yellow-200 cursor-wait'
                    : 'bg-yellow-700 hover:bg-yellow-600 border border-yellow-500 text-white'
                }`}
            >
                {reportStatus === 'loading' ? (
                     <span>{t('report_btn_loading')}</span>
                ) : reportStatus === 'success' ? (
                     <span>{t('report_btn_success')}</span>
                ) : (
                    <>
                        <PlusIcon className="w-5 h-5 text-yellow-200" />
                        <span>{t('report_btn_idle')} <strong>{query}</strong></span>
                    </>
                )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-1">
                {reportStatus === 'success' ? t('report_hint_success') : t('report_hint_idle')}
            </p>
        </div>
      )}
    </div>
  );
};

export default PartNumberInput;
