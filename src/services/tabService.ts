import { TabModel, TabLines } from "../models/tab";

export interface TabData {
    lines: TabLines;
    song: string;
    artist: string;
}

export class TabService {
    private static readonly CURRENT_TAB_KEY = "currenttab";

    // Get the current tab data
    static getCurrentTab(): TabModel {
        const newModel = new TabModel();
        const saved = localStorage.getItem(this.CURRENT_TAB_KEY);
        if (saved) {
            const data: TabData = JSON.parse(saved);
            if (data.lines) {
                newModel.setLines(data.lines);
            }
            if (data.song) {
                newModel.setSong(data.song);
            }
            if (data.artist) {
                newModel.setArtist(data.artist);
            }
        }
        return newModel;
    }

    // Save the current tab data
    static saveCurrentTab(model: TabModel): void {
        const data: TabData = {
            lines: model.getLines(),
            song: model.getSong(),
            artist: model.getArtist()
        };
        localStorage.setItem(this.CURRENT_TAB_KEY, JSON.stringify(data));
    }
}