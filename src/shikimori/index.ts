import { puppeteerBrowser } from '../puppeteer-browser';
import { Page } from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import titles from '../anilib/titles.json';

class Shikimori {
    private async gotoTitle(page: Page, titleName: string): Promise<string | null> {
        await page.waitForSelector('.global-search', { timeout: 20000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.click('.global-search input', { count: 3 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.type('.global-search input', titleName);

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Из выпавшего списка выписываем тайты (название-ссылка)
        const arrHrefs = await page.$$eval('.b-db_entry-variant-list_item', elements => {
            const array: any[] = [];
            elements.forEach((el) => {
                array.push({ name: el.querySelector('.name .b-link')?.childNodes[0]?.textContent?.trim(), url: el?.getAttribute('href') });
            });

            return array;
        });

        const arrElement = arrHrefs.find(el => el.name === titleName);

        return arrElement?.url || null;
    }

    private async changeStatus(page: Page, titleStatus: string) {
        await page.waitForSelector('.trigger-arrow', { timeout: 20000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        const statusName = await page.$eval('.status-name', el => el.getAttribute('data-text'));
        if (!statusName) {
            console.error('shikimori - statusName не найден.');
            return;
        }

        if (statusName == titleStatus) {
            return;
        }

        const triggerArrow = await page.$('.trigger-arrow');
        await triggerArrow?.click();
        await page.waitForSelector('.expanded-options', { timeout: 20000 });

        await new Promise(resolve => setTimeout(resolve, 2000));
        const triggers = await page.$$('.add-trigger');
        for (const trigger of triggers) {
            // Достаем название кнопок
            const triggerText = await trigger.$eval('.status-name', el => el.getAttribute('data-text'));
            if (triggerText == titleStatus) {
                // Имитируем нажатие мыши
                const triggerButton = await trigger.evaluate((el, sel: string) => {
                    const element = el.querySelector(sel);
                    if (element) {
                        const { top, left, width, height } = element.getBoundingClientRect();
                        return { x: left + width / 2, y: top + height / 2 };
                    }
                    return null;
                }, '.status-name');

                if (!triggerButton) {
                    console.error('shikimori - Кнопка не найдена');
                    continue;
                }
                await page.mouse.move(triggerButton.x, triggerButton.y, { steps: 10 });
                await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 50));
                await page.mouse.click(triggerButton.x, triggerButton.y);
                await new Promise(resolve => setTimeout(resolve, Math.random() * 400 + 100));
            }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    private async logTitle(fileName: string, title: string) {
        const filePath = path.join(__dirname, fileName + '.txt');
        await fs.appendFile(filePath, title + '\n', 'utf-8');
    }

    private async deleteLogs() {
        const fileSuccessfully = path.join(__dirname, 'Successfully.txt');
        const fileUnsuccessful = path.join(__dirname, 'Unsuccessful.txt');

        try {
            await fs.rm(fileSuccessfully);
            await fs.rm(fileUnsuccessful);
        } catch { }
    }

    public async main(url: string) {
        const page = await puppeteerBrowser.newPage();
        await page.goto(url);

        await this.deleteLogs();
        for (const list of titles) {
            for (const title of list.titles) {
                const link = await this.gotoTitle(page, title);
                if (!link) {
                    console.log(`[НЕ НАЙДЕНО] ${list.name} | ${title}`);
                    await this.logTitle('Unsuccessful', `${title} | ${list.name}`);
                    continue;
                }

                const newPage = await puppeteerBrowser.newPage();
                await newPage.goto(link);
                await this.changeStatus(newPage, list.name);
                await newPage.close();
                await this.logTitle('Successfully', title);
            }
        }
        console.log(`[УСПЕШНО] Весь список тайтлов с animelib был перенесен. Подробнее в логах ./src/shikimori/*.txt`);
    }
}

export const shikimori = new Shikimori();;