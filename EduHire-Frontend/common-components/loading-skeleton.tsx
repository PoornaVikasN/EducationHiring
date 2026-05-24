import { Card, CardContent } from "@/components/ui/card"

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-100">
            <tr>
              {[...Array(7)].map((_, i) => (
                <th key={i} className="text-left p-4 border-r border-gray-200">
                  <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {[...Array(7)].map((_, colIndex) => (
                  <td key={colIndex} className="p-4 border-r border-gray-100">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <CardContent className="p-6 flex items-center space-x-4">
        <div className="p-3 bg-gray-200 rounded-lg animate-pulse">
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-300 rounded w-1/2 animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {[...Array(3)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="mb-4 md:mb-6">
        <div className="h-8 bg-gray-300 rounded w-1/4 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-300 rounded w-1/3 animate-pulse"></div>
      </div>
      <TableSkeleton />
    </div>
  )
}
