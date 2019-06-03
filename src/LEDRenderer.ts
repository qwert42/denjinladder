import * as jQuery from "jquery";
import {FusedPlayerBestItem, LampType} from "./PlayerBestIndexer";
const rgb2hex: (rgb: string) => { hex: string, alpha: number } = require('rgb2hex');


export default class LEDRenderer {
    constructor(private playerBests: Map<string, FusedPlayerBestItem>) {
        this.render = this.render.bind(this);
        this.sort = this.sort.bind(this);
        this.retrievePlayerBestItem = this.retrievePlayerBestItem.bind(this);
    }

    static playerBestIdFrom(name: string, difficulty: string) {
        return `${name}|*|DP${difficulty}`;
    }

    private static LAMP_TO_COLOR = {
        'NO_PLAY': '#ffffff',
        'FAILED': '#c0c0c0',
        'ASSIST_CLEAR': '#9595ff',
        'EASY_CLEAR': '#98fb98',
        'CLEAR': '#afeeee',
        'HARD_CLEAR': '#ff6347',
        'EX_HARD_CLEAR': '#ffd900',
        'FULL_COMBO': '#ff8c00'
    };

    private static COLOR_TO_LAMP: { [clr: string]: LampType } = Object
        .getOwnPropertyNames(LEDRenderer.LAMP_TO_COLOR)
        .reduce(
            (acc, name: LampType) => Object.assign(acc, {[LEDRenderer.LAMP_TO_COLOR[name]]: name}),
            {});

    private static LAMP_WEIGHTS: { [clr: string]: number } = {
        '#ffffff': 0,
        '#c0c0c0': 1,
        '#9595ff': 2,
        '#98fb98': 3,
        '#afeeee': 4,
        '#ff6347': 5,
        '#ffd900': 6,
        '#ff8c00': 7
    };

    static lampColorFrom(playerBest?: FusedPlayerBestItem) {
        const lamp = playerBest ? playerBest.lamp : "NO_PLAY";
        return this.LAMP_TO_COLOR[lamp];
    }

    static clearLamps() {
        jQuery('span.lamp').remove();
    }

    retrievePlayerBestItem(musicTitle: string) {
        const [, name, difficulty] = musicTitle.match(/(.+) \[([NHAL])]/);

        console.debug(`Found ${name} ${difficulty}`);

        const playerBestId = LEDRenderer.playerBestIdFrom(name, difficulty);
        const playerBest = this.playerBests.get(playerBestId);
        console.debug(`Found item by ${playerBestId}: ${playerBest}`);

        return playerBest;
    }

    render() {
        LEDRenderer.clearLamps();

        jQuery('a.music span').each((idx, el) => {
            const elHeight = jQuery(el).css('height');

            // noinspection JSSuspiciousNameCombination
            jQuery(el).prepend(
                jQuery('<span class="lamp"></span>')
                    .css({
                        width: elHeight,
                        height: elHeight,
                        'background-color': LEDRenderer.lampColorFrom(this.retrievePlayerBestItem(el.innerText)),
                        display: 'inline-block'
                    }));
        })
    }

    private static hexColorFromMusicAnchor(elem: HTMLElement) {
        return rgb2hex(
            jQuery(elem)
                .find('span.lamp')
                .css('background-color'))
            .hex;
    }

    private static sortMusicAnchors(jqDiv: JQuery) {
        const comparator = (eI: HTMLElement, eJ: HTMLElement) => {
            const [bgI, bgJ] = [eI, eJ].map(e => LEDRenderer.LAMP_WEIGHTS[this.hexColorFromMusicAnchor(e)]);

            const cmp = bgI - bgJ;
            return cmp === 0 ? 0 : cmp < 0 ? -1 : 1;
        };

        return jQuery(jqDiv.children('a.music')).toArray().sort(comparator);
    }

    private static renderStatistics(jqDiv: JQuery) {
        const stats: {[k: string]: number} = jqDiv.children('a.music')
            .map((idx, el) => LEDRenderer.COLOR_TO_LAMP[LEDRenderer.hexColorFromMusicAnchor(el)])
            .toArray()
            .reduce((acc: {[k: string]: number}, i: LampType) => {
                return Object.assign(acc, {[i]: (acc[i] ? acc[i] : 0) + 1}, {total: acc['total'] + 1});
            }, {total: 0});

        // <wat???>
        const levelDifficulty = jqDiv.contents().filter((idx, e) => e.nodeType === 3)[0].nodeValue;
        jqDiv.contents().filter((idx, e) => e.nodeType === 3).remove();
        // </wat???>

        return Object
            .getOwnPropertyNames(stats)
            .reduce(
                (acc, lamp) => `${acc} | ${lamp}: ${stats[lamp]} (${(stats[lamp] / stats['total']).toFixed(2)})`,
                levelDifficulty);
    }

    sort() {
        if (!jQuery('input[value="m1"]').prop('checked')) {
            console.warn('Denjinladder supports sorting only when simple mode is selected.');
            return;
        }

        jQuery('div#main div')
            .filter((_, div) => jQuery(div).children('a.music').length > 0)
            .each((_, div) => {
                const jqDiv = jQuery(div);

                jqDiv.find('br').remove();

                jqDiv.prepend(LEDRenderer.renderStatistics(jqDiv));
                LEDRenderer.sortMusicAnchors(jqDiv).forEach(anchor => {
                    jqDiv.append('<br/>');
                    jqDiv.append(anchor);
                });
            });
    }
}
