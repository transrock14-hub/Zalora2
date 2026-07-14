import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ==================== CART STORE ====================

interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  image: string
  quantity: number
  variant?: {
    name: string
    value: string
  }
  shopId?: string
  shopName?: string
}

interface CartStore {
  items: CartItem[]
  selectedIds: string[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  toggleSelected: (id: string) => void
  setSelectedIds: (ids: string[]) => void
  getTotal: () => number
  getItemCount: () => number
  getSelectedItems: () => CartItem[]
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selectedIds: [],
      
      addItem: (item) => {
        const items = get().items
        const existingIndex = items.findIndex(
          (i) => 
            i.productId === item.productId && 
            JSON.stringify(i.variant) === JSON.stringify(item.variant)
        )
        
        if (existingIndex > -1) {
          const newItems = [...items]
          newItems[existingIndex].quantity += item.quantity
          set({ items: newItems })
        } else {
          const id = crypto.randomUUID()
          set({
            items: [...items, { ...item, id }],
            selectedIds: [...get().selectedIds, id],
          })
        }
      },
      
      removeItem: (id) => {
        set({
          items: get().items.filter((i) => i.id !== id),
          selectedIds: get().selectedIds.filter((i) => i !== id),
        })
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id)
          return
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        })
      },
      
      clearCart: () => set({ items: [], selectedIds: [] }),

      toggleSelected: (id) => {
        const selectedIds = get().selectedIds
        set({
          selectedIds: selectedIds.includes(id)
            ? selectedIds.filter((i) => i !== id)
            : [...selectedIds, id],
        })
      },

      setSelectedIds: (ids) => set({ selectedIds: ids }),
      
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },

      getSelectedItems: () => {
        const { items, selectedIds } = get()
        // If nothing tracked as selected (e.g. legacy state), treat all as selected.
        if (selectedIds.length === 0) return items
        const selected = items.filter((i) => selectedIds.includes(i.id))
        return selected.length > 0 ? selected : items
      },
    }),
    {
      name: 'zalora-cart',
    }
  )
)

// ==================== USER STORE ====================

interface UserData {
  id: string
  email: string
  name: string
  avatar?: string | null
  role: 'ADMIN' | 'MANAGER' | 'USER'
  balance: number
  canSell: boolean
  shop?: {
    id: string
    name: string
    slug: string
    status: string
  } | null
  isImpersonating?: boolean
}

interface UserStore {
  user: UserData | null
  setUser: (user: UserData | null) => void
  clearUser: () => void
  isAdmin: () => boolean
  isManager: () => boolean
  canAccessAdmin: () => boolean
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  
  setUser: (user) => set({ user }),
  
  clearUser: () => set({ user: null }),
  
  isAdmin: () => get().user?.role === 'ADMIN',
  
  isManager: () => 
    get().user?.role === 'ADMIN' || get().user?.role === 'MANAGER',
  
  canAccessAdmin: () => {
    const role = get().user?.role
    return role === 'ADMIN' || role === 'MANAGER'
  },
}))

// ==================== UI STORE ====================

interface UIStore {
  isMobileMenuOpen: boolean
  isCartOpen: boolean
  isSearchOpen: boolean
  isChatOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  setCartOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setChatOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  isMobileMenuOpen: false,
  isCartOpen: false,
  isSearchOpen: false,
  isChatOpen: false,
  
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setCartOpen: (open) => set({ isCartOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setChatOpen: (open) => set({ isChatOpen: open }),
}))

// ==================== CHECKOUT STORE ====================

interface CheckoutData {
  addressId: string | null
  paymentMethod: string | null
  couponCode: string | null
  couponDiscount: number
  notes: string
}

interface CheckoutStore {
  data: CheckoutData
  setAddressId: (id: string) => void
  setPaymentMethod: (method: string) => void
  setCoupon: (code: string, discount: number) => void
  clearCoupon: () => void
  setNotes: (notes: string) => void
  reset: () => void
}

const initialCheckoutData: CheckoutData = {
  addressId: null,
  paymentMethod: null,
  couponCode: null,
  couponDiscount: 0,
  notes: '',
}

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  data: initialCheckoutData,
  
  setAddressId: (id) => 
    set((state) => ({ data: { ...state.data, addressId: id } })),
  
  setPaymentMethod: (method) => 
    set((state) => ({ data: { ...state.data, paymentMethod: method } })),
  
  setCoupon: (code, discount) => 
    set((state) => ({ 
      data: { ...state.data, couponCode: code, couponDiscount: discount } 
    })),
  
  clearCoupon: () => 
    set((state) => ({ 
      data: { ...state.data, couponCode: null, couponDiscount: 0 } 
    })),
  
  setNotes: (notes) => 
    set((state) => ({ data: { ...state.data, notes } })),
  
  reset: () => set({ data: initialCheckoutData }),
}))
