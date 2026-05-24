"use client"

import { useState, useEffect } from "react"
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface NetworkErrorProps {
  onRetry?: () => void
  message?: string
}

export function NetworkError({ onRetry, message }: NetworkErrorProps) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      if (typeof window !== 'undefined') window.location.reload()
    }
  }

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-100 rounded-full">
              {isOnline ? (
                <AlertTriangle className="h-12 w-12 text-red-600" />
              ) : (
                <WifiOff className="h-12 w-12 text-red-600" />
              )}
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {isOnline ? "Connection Error" : "No Internet Connection"}
          </h2>
          <p className="text-gray-600 mb-6">
            {message ||
              (isOnline
                ? "Unable to connect to the server. Please check your connection and try again."
                : "Please check your internet connection and try again.")}
          </p>
          <Button onClick={handleRetry} className="w-full bg-[#D94B00] hover:bg-[#B83E00]">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
