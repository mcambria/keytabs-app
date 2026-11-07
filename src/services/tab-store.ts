import { DEFAULT_TUNING, TAB_DATA_VERSION, defaultTabEntries, deserializeTab } from '@/models/tab';
import { create } from 'zustand';

export type Chord = string[];
export type Tuning = string[];
/** A staff: a list of chords, each with one value per string. */
export type StaffEntry = Chord[];
/** A block of free text (lyrics, labels, ...), rows separated by "\n". */
export type TextEntry = string;
export type TabEntry = StaffEntry | TextEntry;

export type TabData = {
    id: string;
    version: typeof TAB_DATA_VERSION;
    entries: TabEntry[];
}

export type TabMetadata = {
    id: string;
    song: string;
    artist: string,
    tuning: Tuning,
    lastModified: number
};

type TabContentStoreState = {
    currentTab: TabData | null;
    currentTabMetadata: TabMetadata | null;
    tabList: TabMetadata[];
}

type TabContentStoreActions = {
    setCurrentTab: (id: string | null) => void;
    saveCurrentTab: (entries: TabEntry[]) => void;
    deleteCurrentTab: () => void;
    updateTabMetadata: (id: string, updates: Partial<TabMetadata>) => void;
}

const makeTabStorageId = (id: string) => `tab_${id}`;
const TAB_METADATA_STORAGE_KEY = 'tab-metadata';
const CURRENT_TAB_ID_STORAGE_KEY = 'current-tab-id';

const saveTabContent = (tab: TabData) => {
    localStorage.setItem(makeTabStorageId(tab.id), JSON.stringify(tab));
}

const saveTabMetadata = (tabList: TabMetadata[]) => {
    localStorage.setItem(TAB_METADATA_STORAGE_KEY, JSON.stringify(tabList));
}

const saveCurrentTabId = (id: string) => {
    localStorage.setItem(CURRENT_TAB_ID_STORAGE_KEY, id);
}

const newTab = (id: string): TabData => ({ id, version: TAB_DATA_VERSION, entries: defaultTabEntries() });

const loadTabContent = (id: string): TabData => {
    const rawContent = localStorage.getItem(makeTabStorageId(id));
    if (rawContent === null) {
        const tab = newTab(id);
        saveTabContent(tab);
        return tab;
    }

    const result = deserializeTab(id, rawContent);
    if (!result) {
        // keep the unreadable data around instead of overwriting it on next save
        localStorage.setItem(`${makeTabStorageId(id)}_unreadable`, rawContent);
        return newTab(id);
    }
    if (result.migrated) {
        saveTabContent(result.tab);
    }
    return result.tab;
}

// do an initial load outside of the definitions to avoid repeats
const initialTabList = (JSON.parse(localStorage.getItem(TAB_METADATA_STORAGE_KEY) ?? '[]') as TabMetadata[]).map(m => {
    m.tuning = m.tuning ?? DEFAULT_TUNING
    return m;
});
const initialCurrentTabId = localStorage.getItem(CURRENT_TAB_ID_STORAGE_KEY);

type TabContentState = TabContentStoreState & TabContentStoreActions;

export const useTabStore = create<TabContentState>((set, get) => ({
    currentTab: initialCurrentTabId ? loadTabContent(initialCurrentTabId) : null,
    currentTabMetadata: initialCurrentTabId ? initialTabList.find(m => m.id == initialCurrentTabId) ?? null : null,
    tabList: initialTabList,

    setCurrentTab: (id: string | null) => {
        // clear
        if (!id) {
            set(() => ({
                currentTab: null,
                currentTabMetadata: null
            }))
            return;
        }
        // only load it from storage if its not the current state
        if (get().currentTab?.id === id) {
            return;
        }

        const tab = loadTabContent(id);

        // these if/elses should be mutually exclusive but its simpler to not care about that

        // if it doesn't exist in the local cache, create the metadata entry
        const tabList = get().tabList;
        const storedMetadata = tabList.find(m => m.id == id);
        let tabMetadata: TabMetadata;
        if (storedMetadata) {
            tabMetadata = storedMetadata
        }
        else {
            tabMetadata = { id: id, song: '', artist: '', tuning: DEFAULT_TUNING, lastModified: Date.now() };
            tabList.unshift(tabMetadata);
            saveTabMetadata(tabList);
        }

        set({ currentTab: tab, currentTabMetadata: tabMetadata, tabList: [...tabList] });
        saveCurrentTabId(tab.id);
    },

    saveCurrentTab: (entries) => {
        const id = get().currentTab?.id;
        if (!id) {
            return;
        }

        const tab: TabData = { id: id, version: TAB_DATA_VERSION, entries: entries };
        saveTabContent(tab);
        set({ currentTab: tab });

        // save the metadata changes, they are already in the local state
        saveTabMetadata(get().tabList);
    },

    deleteCurrentTab: () => {
        const state = get();
        const id = get().currentTab?.id;
        if (!id || !state.currentTab || !state.currentTabMetadata) {
            return;
        }

        let tabList = state.tabList;
        const metadataIndex = tabList.findIndex(m => m.id == id);
        if (metadataIndex !== -1) {
            tabList.splice(metadataIndex, 1);
            saveTabMetadata(tabList);
        }

        localStorage.removeItem(makeTabStorageId(id));
        localStorage.removeItem(CURRENT_TAB_ID_STORAGE_KEY);

        set({ currentTab: null, currentTabMetadata: null, tabList: [...tabList] });
    },

    updateTabMetadata: (id: string, updates: Partial<TabMetadata>) => {
        const tabList = get().tabList;
        let index = tabList.findIndex(m => m.id === id);
        if (index === -1) {
            return;
        }

        let metadata = tabList[index];
        let currentMetadata = get().currentTabMetadata;
        metadata = { ...metadata, ...updates, lastModified: Date.now() };
        // update in the list
        tabList[index] = metadata;
        // update the current if that's what we're editing
        if (currentMetadata?.id === id) {
            currentMetadata = { ...metadata };
        }

        set({ tabList: [...tabList], currentTabMetadata: currentMetadata });
        saveTabMetadata(tabList);
    }
}));
