"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  className?: string;
  showResultsCount?: boolean;
  resultsCount?: number;
  totalCount?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  placeholder = "Search...",
  className = "",
  showResultsCount = false,
  resultsCount = 0,
  totalCount = 0,
}) => {
  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            title="Clear search"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
      {showResultsCount && searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-500">
          {resultsCount === 0
            ? "No results found"
            : `${resultsCount} of ${totalCount} result${
                resultsCount === 1 ? "" : "s"
              }`}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
