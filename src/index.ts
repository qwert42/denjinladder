import {FusedPlayerBestItem, PlayerBestIndexer} from "./PlayerBestIndexer";
import { token } from "../token";
import * as jQuery from "jquery";
import LEDRenderer from "./LEDRenderer";
import {tap} from "./utils";


const PLAYER_BESTS_SAVED_KEY = 'PlayerBestsSavedKey';

function renderLamps(playerBests: Map<string, FusedPlayerBestItem>) {
    console.info('Rendering lamps...');

    const renderer = new LEDRenderer(playerBests);
    renderer.render();
    renderer.sort();

}

function serializePlayerBests(playerBests: Map<string, FusedPlayerBestItem>) {
    return tap(JSON.stringify([...playerBests]))
        .do(v => console.debug(`Serializing player bests... ${v}`));
}

function deserializePlayerBests(serialized: string): Map<string, FusedPlayerBestItem> {
    return new Map(JSON.parse(serialized));
}


// === Begin actions ===
jQuery('div.menu_head:contains("メニュー")')
    .next()
    .append(jQuery('<li><a id="load-secret-data" href="#">Load Secret Data</a></li>'));


const savedPlayerBests = tap(GM_getValue(PLAYER_BESTS_SAVED_KEY) as string)
    .do(savedPlayerBests => console.debug(`Saved player bests: ${savedPlayerBests}`));

if (savedPlayerBests && !jQuery.isEmptyObject(savedPlayerBests)) {
    renderLamps(deserializePlayerBests(savedPlayerBests));
}

jQuery('#load-secret-data').on('click', () =>
    new PlayerBestIndexer(25, token)
        .fetch()
        .then(playerBests => {
            console.info(`Fetch completed: fetched ${playerBests.size} entries.`);

            console.info(`Updating latest entries into local storage...`);
            GM_setValue(PLAYER_BESTS_SAVED_KEY, serializePlayerBests(playerBests));

            renderLamps(playerBests);
        }));
