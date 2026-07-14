'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type SetPageTitle = (title: string | null) => void

const StorePageTitleContext = createContext<{
  pageTitle: string | null
  setPageTitle: SetPageTitle
}>({
  pageTitle: null,
  setPageTitle: () => {},
})

export function StorePageTitleProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitleState] = useState<string | null>(null)
  const setPageTitle = useCallback((title: string | null) => {
    setPageTitleState(title)
  }, [])
  return (
    <StorePageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </StorePageTitleContext.Provider>
  )
}

export function useStorePageTitle() {
  const { setPageTitle } = useContext(StorePageTitleContext)
  return setPageTitle
}

export function useStorePageTitleValue() {
  const { pageTitle } = useContext(StorePageTitleContext)
  return pageTitle
}
