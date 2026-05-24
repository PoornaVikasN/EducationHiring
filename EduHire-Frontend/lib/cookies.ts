/**
 * Cookie utility functions for client-side user data storage
 *
 * SECURITY ARCHITECTURE:
 * - JWT auth tokens are stored in httpOnly cookies (set by backend)
 * - User profile data is stored in regular cookies (for client-side RBAC)
 * - Frontend automatically sends httpOnly cookies with requests
 * - No sensitive authentication data is stored in localStorage
 */

export interface UserCookie {
  id: string
  name: string
  email: string
  role: "ADMIN" | "MANAGER" | "SALES" | "TELECALLER" // Role for client-side RBAC checks
  avatar: string
  department: string
  // Note: auth tokens are in httpOnly cookies, not stored here
}

const COOKIE_NAME = "carcraft_user"
const COOKIE_EXPIRY_DAYS = 7

/**
 * Set user data in cookies (client-side only for static deployment)
 */
export const setUserCookie = (user: UserCookie): void => {
  try {
    if (typeof document === "undefined") {
      console.warn("[Cookie] Cannot set cookie on server-side")
      return
    }

    const userData = JSON.stringify(user)
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS)

    // For static deployment, we use regular cookies (not httpOnly)
    const isSecure = typeof window !== 'undefined' ? window.location.protocol === 'https:' : false
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(userData)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax; Secure=${isSecure}`
    console.log("[Cookie] User data saved to cookie:", user.email)
  } catch (error) {
    console.error("[Cookie] Failed to save user data:", error)
  }
}

/**
 * Get user data from cookies
 */
export const getUserCookie = (): UserCookie | null => {
  try {
    if (typeof document === "undefined") return null

    const cookies = document.cookie.split(';')
    const userCookie = cookies.find(cookie =>
      cookie.trim().startsWith(`${COOKIE_NAME}=`)
    )

    if (!userCookie) return null

    const cookieValue = userCookie.split('=')[1]
    const decodedValue = decodeURIComponent(cookieValue)
    const userData = JSON.parse(decodedValue)

    console.log("[Cookie] User data retrieved from cookie:", userData.email)
    return userData
  } catch (error) {
    console.error("[Cookie] Failed to retrieve user data:", error)
    clearUserCookie()
    return null
  }
}

/**
 * Clear user data from cookies
 */
export const clearUserCookie = (): void => {
  try {
    if (typeof document === "undefined") {
      console.warn("[Cookie] Cannot clear cookie on server-side")
      return
    }

    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
    console.log("[Cookie] User data cleared from cookie")
  } catch (error) {
    console.error("[Cookie] Failed to clear user data:", error)
  }
}

/**
 * Check if user is authenticated based on cookie
 */
export const isAuthenticated = (): boolean => {
  return getUserCookie() !== null
}

/**
 * Get user role from cookie
 */
export const getUserRole = (): "ADMIN" | "MANAGER" | "SALES" | "TELECALLER" | null => {
  const user = getUserCookie()
  return user ? user.role : null
}

/**
 * Check if user has specific role
 */
export const hasRole = (role: "ADMIN" | "MANAGER" | "SALES" | "TELECALLER"): boolean => {
  const userRole = getUserRole()
  return userRole === role
}

/**
 * Check if user has admin or manager role
 */
export const isAdminOrManager = (): boolean => {
  const userRole = getUserRole()
  return userRole === "ADMIN" || userRole === "MANAGER"
}

/**
 * Check if user is sales role
 */
export const isSales = (): boolean => {
  const userRole = getUserRole()
  return userRole === "SALES"
}