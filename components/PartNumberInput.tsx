
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useLanguage } from './LanguageContext';

interface PartNumberInputProps {
  parts: string[];
  onPartSelect: (part: string | null) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  value: string | null;
  onRequestPart?: (part: string) => Promise<boolean>;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
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

const PartNumberInput: React.FC<PartNumberInputProps> = memo(({ parts, onPartSelect, onInputChange, placeholder, value, onRequestPart, inputRef, onKeyDown }) => {
  const [query, setQuery] = useState<string>('');
  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  
  const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const filteredParts = useMemo(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery === '') return parts.slice(0, 50);

    let results: string[] = [];
    if (trimmedQuery.includes('*')) {
      try {
        const escapeRegex = (str: string) => str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const pattern = trimmedQuery.split('*').map(escapeRegex).join('.*');
        const regex = new RegExp(`^${pattern}$`, 'i');
        results = parts.filter(part => regex.test(part));
      } catch (e) {
        results = [];
      }
    } else {
      const q = trimmedQuery.toLowerCase();
      results = parts.filter(part => part.toLowerCase().includes(q));
    }

    return results.slice(0, 50);
  }, [query, parts]);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    
    const exactMatch = parts.find(p => p.toLowerCase() === newValue.trim().toLowerCase());
    if (exactMatch) {
      onPartSelect(exactMatch);
    } else {
      onPartSelect(null);
    }
  };

  const handleInternalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsDropdownVisible(false);
    }
    if (onKeyDown) onKeyDown(e);
  };

  const handleRequestClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRequestPart && query.trim()) {
        setReportStatus('loading');
        const success = await onRequestPart(query.trim());
        if (success) {
            setReportStatus('success');
            setIsDropdownVisible(false);
            setTimeout(() => setReportStatus('idle'), 3000);
        } else {
            setReportStatus('idle');
        }
    }
  };

  const isExactMatch = useMemo(() => parts.some(p => p.toLowerCase() === query.trim().toLowerCase()), [query, parts]);
  const hasWildcard = query.includes('*');
  const showReportButton = onRequestPart && query.trim() !== '' && !isExactMatch && !hasWildcard;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4">
          <SearchIcon className="h-5 w-5 text-gray-500" />
        </span>
        <input
          type="text"
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleInternalKeyDown}
          onFocus={() => setIsDropdownVisible(true)}
          placeholder={placeholder || t('input_wildcard_hint')}
          className="w-full h-12 pl-12 pr-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono uppercase text-base"
        />
      </div>

      {isDropdownVisible && filteredParts.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <ul className="py-1">
            {filteredParts.map((part, index) => (
            <li
                key={index}
                onClick={() => handleSelectPart(part)}
                className="px-4 py-3 text-gray-300 hover:bg-teal-600 hover:text-white cursor-pointer transition-colors duration-150 font-mono text-base"
            >
                {part}
            </li>
            ))}
          </ul>
        </div>
      )}

      {showReportButton && (
        <div className="mt-2 animate-fade-in">
             <button
                type="button"
                onMouseDown={handleRequestClick}
                disabled={reportStatus !== 'idle'}
                className={`w-full py-4 px-4 font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] ${
                    reportStatus === 'success' 
                    ? 'bg-green-600 border border-green-500 text-white cursor-default' 
                    : reportStatus === 'loading'
                    ? 'bg-yellow-800 border border-yellow-700 text-yellow-200 cursor-wait'
                    : 'bg-yellow-700 hover:bg-yellow-600 border border-yellow-500 text-white'
                }`}
            >
                {reportStatus === 'loading' ? (
                     <span className="text-base">{t('report_btn_loading')}</span>
                ) : reportStatus === 'success' ? (
                     <span className="text-base">{t('report_btn_success')}</span>
                ) : (
                    <>
                        <PlusIcon className="w-6 h-6 text-yellow-200" />
                        <span className="text-base">{t('report_btn_idle')} <strong>{query}</strong></span>
                    </>
                )}
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">
                {reportStatus === 'success' ? t('report_hint_success') : t('report_hint_idle')}
            </p>
        </div>
      )}
    </div>
  );
});

export default PartNumberInput;
