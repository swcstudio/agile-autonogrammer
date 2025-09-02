"use client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils";
import { useKatalyst, React } from "@katalyst/hooks";
// Leveraging Katalyst's Rust-enhanced React for better performance

interface SpotlightProps {
  className?: string;
  children?: React.ReactNode;
  onSearch?: (query: string) => void;
  searchResults?: Array<{
    id: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: () => void;
  }>;
}

export function Spotlight({
  className,
  children,
  onSearch,
  searchResults = [],
}: SpotlightProps) {
  const k = useKatalyst();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  
  const debouncedQuery = k.utils.debounce(query, 300);
  const isMetaK = k.dom.keyPress("Meta+k");
  const isCtrlK = k.dom.keyPress("Control+k");
  const isEscape = k.dom.keyPress("Escape");
  const isArrowDown = k.dom.keyPress("ArrowDown");
  const isArrowUp = k.dom.keyPress("ArrowUp");
  const isEnter = k.dom.keyPress("Enter");

  React.useEffect(() => {
    if (isMetaK || isCtrlK) {
      setIsOpen(true);
    }
  }, [isMetaK, isCtrlK]);

  React.useEffect(() => {
    if (isEscape && isOpen) {
      setIsOpen(false);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isEscape, isOpen]);

  React.useEffect(() => {
    if (isArrowDown && searchResults.length > 0) {
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    }
  }, [isArrowDown, searchResults.length]);

  React.useEffect(() => {
    if (isArrowUp && searchResults.length > 0) {
      setSelectedIndex((prev) => 
        prev === 0 ? searchResults.length - 1 : prev - 1
      );
    }
  }, [isArrowUp, searchResults.length]);

  React.useEffect(() => {
    if (isEnter && searchResults[selectedIndex]) {
      searchResults[selectedIndex].action?.();
      setIsOpen(false);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isEnter, searchResults, selectedIndex]);

  React.useEffect(() => {
    if (debouncedQuery && onSearch) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const handleResultClick = React.useCallback((result: typeof searchResults[0]) => {
    result.action?.();
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
          className
        )}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span>Search</span>
        <kbd className="px-2 py-1 text-xs bg-gray-200 rounded dark:bg-gray-700">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl dark:bg-gray-900"
            >
              <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="flex-1 bg-transparent outline-none"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800">
                  ESC
                </kbd>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        "flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                        selectedIndex === index && "bg-gray-50 dark:bg-gray-800"
                      )}
                    >
                      {result.icon && (
                        <div className="text-gray-400">{result.icon}</div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        {result.description && (
                          <div className="text-sm text-gray-500">
                            {result.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {query && searchResults.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No results found for "{query}"
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}