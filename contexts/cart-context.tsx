"use client"

import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'

export interface CartItem {
  id: string
  type: "publisher" | "product"
  name: string
  price: number
  quantity: number
  addedAt: Date
  metadata?: {
    publisherId?: string
    website?: string
    niche?: string[]
    dr?: number
    da?: number
  }
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  isLoading: boolean
  error: string | null
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_OPEN'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_CART'; payload: CartItem[] }

interface CartContextType {
  state: CartState
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  isItemInCart: (itemId: string) => boolean
  getCartItemIds: () => Set<string>
}

const initialState: CartState = {
  items: [],
  isOpen: false,
  isLoading: false,
  error: null,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { payload: newItem } = action
      const existingItemIndex = state.items.findIndex(
        item => item.id === newItem.id && item.type === newItem.type
      )

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const updatedItems = [...state.items]
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + newItem.quantity,
          addedAt: new Date()
        }
        return { ...state, items: updatedItems }
      } else {
        // Add new item
        return {
          ...state,
          items: [...state.items, newItem]
        }
      }
    }
    case 'REMOVE_ITEM':
      return { 
        ...state, 
        items: state.items.filter(item => item.id !== action.payload.itemId) 
      }
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ).filter(item => item.quantity > 0)
      }
    case 'CLEAR_CART':
      return { ...state, items: [] }
    case 'SET_OPEN':
      return { ...state, isOpen: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'LOAD_CART':
      return { ...state, items: action.payload }
    default:
      return state
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('oms-cart')
      if (saved) {
        const parsed = JSON.parse(saved).map((item: any) => ({ 
          ...item, 
          addedAt: new Date(item.addedAt) 
        }))
        dispatch({ type: 'LOAD_CART', payload: parsed })
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('oms-cart', JSON.stringify(state.items))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }, [state.items])

  const addItem = (item: CartItem) => dispatch({ type: 'ADD_ITEM', payload: item })
  const removeItem = (itemId: string) => dispatch({ type: 'REMOVE_ITEM', payload: { itemId } })
  const updateQuantity = (itemId: string, quantity: number) => 
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } })
  const clearCart = () => dispatch({ type: 'CLEAR_CART' })
  const toggleCart = () => dispatch({ type: 'SET_OPEN', payload: !state.isOpen })
  const openCart = () => dispatch({ type: 'SET_OPEN', payload: true })
  const closeCart = () => dispatch({ type: 'SET_OPEN', payload: false })
  
  const getTotalItems = () => state.items.reduce((acc, item) => acc + item.quantity, 0)
  const getTotalPrice = () => state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const isItemInCart = (itemId: string) => state.items.some(item => item.id === itemId)
  const getCartItemIds = () => new Set(state.items.map(item => item.id))

  const value: CartContextType = { 
    state, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    toggleCart, 
    openCart, 
    closeCart, 
    getTotalItems, 
    getTotalPrice, 
    isItemInCart,
    getCartItemIds
  }
  
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
