import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TabMetadata = { id: string; song: string; artist: string };

type TabsMetadataStoreState = {
  tabList: TabMetadata[];
  currentTabId: string | null;
  currentTabMetadata: TabMetadata | null;
}

type TabsMetadataStoreActions = {
  setCurrentTabId: (id: string | null) => void;
  createTabMetadata: () => void;
  updateTabMetadata: (id: string, updates: Partial<TabMetadata>) => void;
  deleteTabMetadata: (id: string) => void;
}

type TabsMetadataStore = TabsMetadataStoreState & TabsMetadataStoreActions;

export const useTabStore = create<TabsMetadataStore>()(
  persist(
    (set, get) => ({
      tabList: [],
      currentTabId: null,
      currentTabMetadata: null,

      setCurrentTabId: (id) => {
        const tabList = get().tabList;
        const metadata = tabList.filter(v => v.id == id)[0] ?? null;
        set({ currentTabId: id, currentTabMetadata: metadata });
      },

      createTabMetadata: () => {
        const metadata = { id: crypto.randomUUID(), song: '', artist: '' };
        set(state => ({
          tabList: [...state.tabList, metadata],
          currentTabId: metadata.id,
        }));
      },

      updateTabMetadata: (id, updates) => {
        const tabList = get().tabList;
        const metadata = tabList.filter(v => v.id == id)[0] ?? null;
        set(state => ({
          tabList: state.tabList.map(tab =>
            tab.id === id ? { ...tab, ...updates } : tab
          ),
        }));
      },

      deleteTabMetadata: (id) => {
        set(state => ({
          tabList: state.tabList.filter(tab => tab.id !== id),
          currentTabId: state.currentTabId === id ? null : state.currentTabId,
        }));
      },
    }),
    {
      name: 'tab-metadata', // key in localStorage
      partialize: (state) => ({
        tabList: state.tabList,
        currentTabId: state.currentTabId,
        currentTabMetadata: state.currentTabMetadata
      }),
    }
  )
);
