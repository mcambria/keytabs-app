import { defaultTabLines } from '@/models/tab';
import { create } from 'zustand';

export type TabLines = string[][][];
export type Chord = string[];

export type TabData = {
    id: string;
    lines: TabLines;
}

type TabContentStoreState = {
    tab: TabData;
}

type TabContentStoreActions = {
    loadOrCreateTab: () => void;
    updateContent: (lines: TabLines) => void;
    saveTab: () => void;
    deleteTab: () => void;
}

type TabContentState = TabContentStoreState & TabContentStoreActions;

const makeTabStorageId = (id: string) => `tab_${id}`;

export const useTabContentStore = create<TabContentState>((set, get) => ({
    tab: { id: crypto.randomUUID(), lines: defaultTabLines() },

    loadOrCreateTab: () => {
        const id = get().tab.id
        const raw = localStorage.getItem(makeTabStorageId(id));
        let tab: TabData;
        if (raw) {
            tab = JSON.parse(raw);
        }
        else {
            tab = { id: id, lines: defaultTabLines()}
        }
        set({ tab: tab });
    },

    updateContent: (lines) =>
        set((state) => ({
            tab: { ...state.tab, lines },
        })),

    saveTab: () => {
        const tab = get().tab;
        if (tab) {
            localStorage.setItem(`tab-${tab.id}`, JSON.stringify(tab));
        }
    },

    deleteTab: () => {
        const tab = get().tab;
        if (!tab) {
            return;
        }
        localStorage.removeItem(makeTabStorageId(tab.id));
        set({ tab: { id: crypto.randomUUID(), lines: defaultTabLines() }});
    }
}));
