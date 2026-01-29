import 'dotenv/config';
import { anilib } from './anilib';
import { shikimori } from './shikimori';
import { puppeteerBrowser } from './puppeteer-browser';

(async () => {
    try {
        // await anilib.parseProfile(process.env.ANILIB_PROFILE!);
        // await shikimori.main(process.env.SHIKIMORI_URL!);
        await shikimori.main('https://shikimori.one/');
    } catch (error) {
        console.error(error);
        // await puppeteerBrowser.closeBrowser();
    }
})();