import {secret_site_base} from "../token";

export interface MusicItem {
    readonly _id: string,
    readonly folder: number,
    readonly title: string,
    readonly artist: string,
    readonly genre: string
}

export interface ChartItem {
    readonly _id: string,
    readonly music_id: string,
    readonly play_style: "DOUBLE" | "SINGLE",
    readonly difficulty: "NORMAL" | "HYPER" | "ANOTHER" | "BLACK",
    readonly rating: number,
    readonly notes: number,
    readonly bpm_min: number,
    readonly bpm_max: number
}

export type LampType = "NO_PLAY" | "ASSISTED_CLEAR" | "EASY_CLEAR" | "CLEAR" | "HARD_CLEAR" | "EX_HARD_CLEAR"
    | "FULL_COMBO" | "FAILED";

export interface PlayerBestItem {
    _links: any,
    readonly _id: string,
    readonly chart_id: string,
    readonly music_id: string,
    readonly profile_id: string,
    readonly lamp: LampType,
    readonly ex_score: number,
    readonly miss_count: number,
    readonly timestamp: Date,
    readonly status: LampType
}

type Combo = MusicItem & ChartItem & PlayerBestItem;
export type FusedPlayerBestItem = Pick<Combo, keyof Exclude<Combo, "_id" | "_links">>;

export const FUSED_ITEM_ID_DELIMITER = '|*|';

export class PlayerBestIndexer {
    private BASE_URL = `${secret_site_base}/iidx`;
    private header: RequestInit;

    constructor(
        private version: number,
        private token: string) {
        this.header = {
            mode: 'cors',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        this.getPlayBestsUrl = this.getPlayBestsUrl.bind(this);
        this.fetchBests = this.fetchBests.bind(this);
        this.fetch = this.fetch.bind(this);
    };

    async getPlayBestsUrl() {
        const iidxVersionedResource =
            await fetch(`${this.BASE_URL}/${this.version.toString()}/`, this.header)
            .then(r => r.json());

        return iidxVersionedResource['_links']['my_bests'];
    }

    static makeIndex<T, K>(items: T[], attr: (i: T) => K): Map<K, T> {
        return new Map(items.map(i => [attr(i), i]));
    }

    async fetchBests(
        url: string,
        callback: (fusedItems: FusedPlayerBestItem[]) => void,
        filterCriteria?: Partial<FusedPlayerBestItem>[]) {
        const response = await fetch(url, this.header).then(r => r.json());

        const bests = response['_items'] as PlayerBestItem[];
        const charts = response['_related']['charts'] as ChartItem[];
        const music = response['_related']['music'] as MusicItem[];
        const nextPageUrl = response['_links']['_next'];

        const chartsIndex = PlayerBestIndexer.makeIndex(charts, c => c._id);
        const musicIndex = PlayerBestIndexer.makeIndex(music, m => m._id);

        const fusedItems = bests
            .map(b => Object.assign(
                {},
                chartsIndex.get(b.chart_id),
                musicIndex.get(b.music_id),
                b))
            .filter(fused => {
                return filterCriteria.some(criterion =>
                    Object.getOwnPropertyNames(criterion).every((prop: keyof FusedPlayerBestItem) => {
                        const queriedProp = criterion[prop];
                        const myProp = fused[prop];

                        return queriedProp === myProp;
                    }));
            });

        callback(fusedItems);

        return nextPageUrl;
    }

    static makePlayerBestIdentifier(playerBest: FusedPlayerBestItem) {
        const shortenedPlayStyle = {'DOUBLE': 'DP', 'SINGLE': 'SP'}[playerBest.play_style];
        const shortenedDifficulty = {'NORMAL': 'N', 'HYPER': 'H', 'ANOTHER': 'A', 'BLACK': 'L'}[playerBest.difficulty];
        return `${playerBest.title}${FUSED_ITEM_ID_DELIMITER}${shortenedPlayStyle}${shortenedDifficulty}`;
    }

    async fetch(filterCriteria: Partial<FusedPlayerBestItem>[] = [{ play_style: "DOUBLE" }]) {
        const startUrl = await this.getPlayBestsUrl();

        console.info(`${startUrl}: started fetching player's bests.`);

        const allFusedItems: FusedPlayerBestItem[][] = [];
        const collector = (fusedItems: FusedPlayerBestItem[]) => allFusedItems.push(fusedItems);

        let nextPageUrl = await this.fetchBests(startUrl, collector, filterCriteria);
        let counter = 1;
        while (nextPageUrl) {
            console.debug(`${nextPageUrl}: fetched #${counter}`);

            nextPageUrl = await this.fetchBests(nextPageUrl, collector, filterCriteria);
            ++counter;
        }

        const items: FusedPlayerBestItem[] = [].concat(...allFusedItems);
        return PlayerBestIndexer.makeIndex(items, i => PlayerBestIndexer.makePlayerBestIdentifier(i));
    }
}
