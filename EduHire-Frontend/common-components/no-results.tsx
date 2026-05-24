"use client"

import type React from "react"

import { Search, Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface NoResultsProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  type?: "search" | "filter" | "empty"
}

export function NoResults({ title, description, action, type = "search" }: NoResultsProps) {
  const getIcon = () => {
    switch (type) {
      case "filter":
        return <Filter className="h-12 w-12 text-gray-400" />
      case "empty":
        return <Plus className="h-12 w-12 text-gray-400" />
      default:
        return <Search className="h-12 w-12 text-gray-400" />
    }
  }

  const getDefaultTitle = () => {
    switch (type) {
      case "filter":
        return "No results match your filters"
      case "empty":
        return "No data available"
      default:
        return "No results found"
    }
  }

  const getDefaultDescription = () => {
    switch (type) {
      case "filter":
        return "Try adjusting your filters or search criteria to find what you're looking for."
      case "empty":
        return "Get started by adding your first item."
      default:
        return "Try adjusting your search terms or check your spelling."
    }
  }

  return (
    <Card className="bg-white rounded-lg border border-gray-200">
      <CardContent className="p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gray-100 rounded-full">{getIcon()}</div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{title || getDefaultTitle()}</h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">{description || getDefaultDescription()}</p>
        {action && (
          <Button onClick={action.onClick} className="bg-[#D94B00] hover:bg-[#B83E00] text-white">
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
