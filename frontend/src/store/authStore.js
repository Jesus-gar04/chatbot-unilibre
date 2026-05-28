import { create } from 'zustand'
import { setAuthToken } from '../api/client'

const useAuthStore = create((set) => ({
  // Token lives only in memory — never persisted to localStorage
  token: null,
  username: null,

  login: (token, username) => {
    setAuthToken(token)
    set({ token, username })
  },

  logout: () => {
    setAuthToken(null)
    set({ token: null, username: null })
  },
}))

export default useAuthStore
