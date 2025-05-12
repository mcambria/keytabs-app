import { TabModel, TabLines } from "../models/tab";
import { TabMetadata, TabsListService } from "./tabs-list-service";

export interface TabData {
    lines: TabLines;
    song: string;
    artist: string;
}

export class TabService {
    private static readonly CURRENT_TAB_ID_KEY = "currenttabid";

    private static TabModelFromData(data: TabData): TabModel {
        return new TabModel(data.lines, data.song, data.artist);
    }

    // Get the current tab data
    static getCurrentTab(): TabModel {
        const currentTabId = this.getCurrentTabId();
        if (currentTabId) {
            return this.loadTab(currentTabId) || new TabModel();
        }
        return new TabModel();
    }

    // Save the current tab data
    static saveCurrentTab(model: TabModel): void {
        const currentTabId = localStorage.getItem(this.CURRENT_TAB_ID_KEY);
        if (currentTabId) {
            this.saveTab(currentTabId, model);
        }
    }

    // Set the current tab ID
    static setCurrentTabId(id: string): void {
        localStorage.setItem(this.CURRENT_TAB_ID_KEY, id);
    }

    // Get the current tab ID
    static getCurrentTabId(): string | null {
        return localStorage.getItem(this.CURRENT_TAB_ID_KEY);
    }

    // Save a tab with a specific ID
    static saveTab(id: string, model: TabModel): void {
        const data: TabData = {
            lines: model.getLines(),
            song: model.getSong(),
            artist: model.getArtist()
        };
        localStorage.setItem(`tab_${id}`, JSON.stringify(data));

        // Update metadata in the tabs list
        const metadata: TabMetadata = {
            id,
            song: model.getSong(),
            artist: model.getArtist(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        TabsListService.upsertTab(id, metadata);
    }

    // Load a tab by ID
    static loadTab(id: string): TabModel | null {
        const saved = localStorage.getItem(`tab_${id}`);
        if (!saved) {
            return null;
        }
        const data: TabData = JSON.parse(saved);
        return this.TabModelFromData(data);
    }

    // Create a new tab
    static createNewTab(): string {
        const id = crypto.randomUUID();
        const model = new TabModel();
        this.saveTab(id, model);
        this.setCurrentTabId(id);
        return id;
    }

    // Delete a tab
    static deleteTab(id: string): void {
        localStorage.removeItem(`tab_${id}`);
        TabsListService.removeTab(id);

        // If we're deleting the current tab, clear the current tab ID
        if (this.getCurrentTabId() === id) {
            localStorage.removeItem(this.CURRENT_TAB_ID_KEY);
        }
    }
}