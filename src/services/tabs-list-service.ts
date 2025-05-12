export interface TabMetadata {
    id: string;
    song: string;
    artist: string;
    createdAt: Date;
    updatedAt: Date;
}

export class TabsListService {
    private static readonly TABS_LIST_KEY = "tabslist";
    private static tabsList: TabMetadata[] = this.loadFromStorage();

    private static loadFromStorage(): TabMetadata[] {
        const saved = localStorage.getItem(this.TABS_LIST_KEY) || "[]";
        return JSON.parse(saved);
    }

    static getTabsList(): TabMetadata[] {
        return [...this.tabsList].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    static upsertTab(id: string, metadata: TabMetadata): void {
        const index = this.tabsList.findIndex(tab => tab.id === id);
        if (index !== -1) {
            this.tabsList[index] = {
                ...this.tabsList[index],
                ...metadata,
                updatedAt: new Date()
            };
        }
        else {
            this.tabsList.push(metadata);
        }
        this.saveTabsList();
    }

    static removeTab(id: string): void {
        this.tabsList = this.tabsList.filter(tab => tab.id !== id);
        this.saveTabsList();
    }

    private static saveTabsList(): void {
        localStorage.setItem(this.TABS_LIST_KEY, JSON.stringify(this.tabsList));
    }
} 