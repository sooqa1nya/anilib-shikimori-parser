import puppeteer from 'puppeteer-extra';
import { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'node:path';


class PuppeteerBrowser {
    private browser: Browser | null = null;

    constructor() {
        puppeteer.use(StealthPlugin());
    }

    private async launchBrowser() {
        this.browser = await puppeteer.launch({
            headless: false,
            userDataDir: path.join('./cache-browser'),
            protocolTimeout: 400000,
            args: [
                '--no-sandbox'
            ]
        });
    }

    public async closeBrowser() {
        if (this.browser) {
            const pages = await this.browser.pages();
            for (const page of pages) {
                await page.close();
            }

            await this.browser.close();
            this.browser = null;
        }
    }

    private async blockImage(page: Page) {

        await page.setRequestInterception(true);

        page.on('request', (req) => {

            if (req.resourceType() === 'image') {
                req.abort();
            } else {
                req.continue();
            }

        });

    }

    public async newPage(): Promise<Page> {
        if (!this.browser) {
            await this.launchBrowser();
        }

        const page = await this.browser!.newPage();
        await page.emulate({
            userAgent: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6222.173 Safari/537.36',
            viewport: {
                width: 1920,
                height: 1080,
                isMobile: false
            }
        });

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin' },
                    { name: 'Chrome PDF Viewer' },
                ],
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });

        await this.blockImage(page);

        return page;
    }
}

export const puppeteerBrowser = new PuppeteerBrowser();