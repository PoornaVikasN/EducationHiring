"use client"

/**
 * CarCart Admin Panel - Reusable Page Skeleton Loading Component
 * DRY principle: Single skeleton loader for all pages
 */

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface PageSkeletonProps {
  type?: "table" | "dashboard" | "form" | "reports" | "chart"
  showHeader?: boolean
  showSearch?: boolean
  showTabs?: boolean
  showFilters?: boolean
  showStats?: boolean
  tableColumns?: number
  tableRows?: number
  statsCards?: number
  showPagination?: boolean
}

export function PageSkeleton({
  type = "table",
  showHeader = true,
  showSearch = false,
  showTabs = false,
  showFilters = false,
  showStats = false,
  tableColumns = 8,
  tableRows = 10,
  statsCards = 3,
  showPagination = true,
}: PageSkeletonProps) {
  return (
    <div>
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="bg-white min-h-screen">
          <div className="px-5 py-8">
            {/* Header Skeleton */}
            {showHeader && (
              <div className="flex items-center justify-between mb-8">
                <div>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-11 w-32" />
              </div>
            )}

            {/* Stats Cards Skeleton */}
            {showStats && (
              <div className={`grid grid-cols-1 md:grid-cols-${statsCards} gap-6 mb-8`}>
                {Array.from({ length: statsCards }, (_, i) => (
                  <Card key={i} className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Search and Actions Skeleton */}
            {showSearch && (
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-11 w-80" />
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-11 w-20" />
                  <Skeleton className="h-11 w-20" />
                </div>
              </div>
            )}

            {/* Filters Skeleton */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            )}

            {/* Tabs Skeleton */}
            {showTabs && (
              <div className="flex space-x-8 mb-6 border-b border-gray-200">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="pb-3">
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            )}

            {/* Table Layout */}
            {type === "table" && (
              <div className="space-y-4">
                {/* Table Header */}
                <div className={`grid grid-cols-${tableColumns} gap-4 p-4 bg-gray-50 rounded-lg`}>
                  {Array.from({ length: tableColumns }, (_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>

                {/* Table Rows */}
                {Array.from({ length: tableRows }, (_, i) => (
                  <div key={i} className={`grid grid-cols-${tableColumns} gap-4 p-4 border-b border-gray-100`}>
                    {Array.from({ length: tableColumns }, (_, j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Dashboard Layout */}
            {type === "dashboard" && (
              <>
                {/* Greeting */}
                <div className="mb-8">
                  <Skeleton className="h-10 w-96 mb-2" />
                  <Skeleton className="h-5 w-64" />
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                  <Skeleton className="h-6 w-48 mb-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }, (_, i) => (
                      <Card key={i} className="border-2">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <Skeleton className="h-12 w-12 rounded-lg" />
                            <div className="flex-1 space-y-3">
                              <Skeleton className="h-5 w-40" />
                              <Skeleton className="h-4 w-full" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Activity Section */}
                <div>
                  <Skeleton className="h-6 w-48 mb-6" />
                  <Card className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                            <Skeleton className="h-9 w-24" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Reports Layout */}
            {type === "reports" && (
              <>
                {/* Filters Card */}
                <Card className="border border-gray-200 mb-8">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      {Array.from({ length: 4 }, (_, i) => (
                        <Skeleton key={i} className="h-11 w-full" />
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="h-11 w-40" />
                    </div>
                  </CardContent>
                </Card>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {Array.from({ length: 2 }, (_, i) => (
                    <Card key={i} className="border border-gray-200">
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-48 mb-4" />
                        <Skeleton className="h-64 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Data Table */}
                <Card className="border border-gray-200">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-48 mb-6" />
                    <div className="space-y-4">
                      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Skeleton key={i} className="h-4 w-full" />
                        ))}
                      </div>
                      {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} className="grid grid-cols-5 gap-4 p-4 border-b border-gray-100">
                          {Array.from({ length: 5 }, (_, j) => (
                            <Skeleton key={j} className="h-4 w-full" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Form Layout */}
            {type === "form" && (
              <div className="space-y-6">
                {Array.from({ length: 4 }, (_, i) => (
                  <Card key={i} className="border border-gray-200">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-48 mb-6" />
                      <div className="space-y-4">
                        {Array.from({ length: 3 }, (_, j) => (
                          <div key={j}>
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-11 w-full" />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end mt-6">
                        <Skeleton className="h-11 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination Skeleton */}
            {showPagination && type === "table" && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  {Array.from({ length: 7 }, (_, i) => (
                    <Skeleton key={i} className="h-9 w-9" />
                  ))}
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
