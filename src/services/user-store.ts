import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type User = { id: string }

type UserState = {
    user: User;
    saveUser: (User: User) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: { id: crypto.randomUUID() },
            saveUser: (user) => {
                set({ user: user});
            }
        }),
        {
            name: 'current-user'
        }
    )
)