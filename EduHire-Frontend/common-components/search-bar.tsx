"use client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
  inputClassName?: string
}

export function SearchBar({
  placeholder = "Search by Name, Phone, or Email",
  onSearch,
  className = "",
  inputClassName = "",
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const clearSearch = () => {
    setSearchQuery("")
    onSearch?.("")
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        <Search className="h-5 w-5 text-gray-400" />
      </div>

      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className={`w-full pl-10 pr-10 h-12 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#D94B00] focus:border-transparent ${inputClassName}`}
      />

      {searchQuery && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
