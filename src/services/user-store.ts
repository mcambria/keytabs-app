import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type User = { id: string, preferences: Preferences }
export type Preferences = { tabsListCollapsed: boolean, keybingingsCollapsed: boolean }

type UserStoreState = {
    currentUser: User;
}

type UserStoreStateActions = {
    updatePreferences: (updates: Partial<Preferences>) => void;
}

type UserState = UserStoreState & UserStoreStateActions;

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            currentUser: { id: crypto.randomUUID(), preferences: { tabsListCollapsed: false, keybingingsCollapsed: false } },
            updatePreferences: (updates: Partial<Preferences>) => {
                set((state) => ({
                    currentUser: {
                        ...state.currentUser,
                        preferences: {
                            ...state.currentUser.preferences,
                            ...updates,
                        },
                    },
                }));
            }
        }),
        {
            name: 'current-user',
        }
    )
)