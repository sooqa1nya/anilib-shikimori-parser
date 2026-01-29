import path from 'node:path';
import fs from 'node:fs';
import { puppeteerBrowser } from '../puppeteer-browser';


class Anilib {
    private parseList = ['Смотрю', 'Запланировано', 'Брошено', 'Просмотрено', 'Любимые', 'Пересматриваю', 'Отложено'];
    private animeList: { name: string, count: number, titles: string[]; }[] = [];


    private async writeData() {
        try {
            fs.writeFileSync(path.join('./src/anilib/titles.json'), JSON.stringify(this.animeList, null, 4));
        } catch (error) {
            console.error('anilib - Ошибка writeData');
        }
    }

    public async parseProfile(url: string) {
        const page = await puppeteerBrowser.newPage();
        await page.goto(url);

        // Ждем пока загрузится меню
        await page.waitForSelector('.menu .menu-list', { timeout: 10000 });

        const frame = page.frames()[0];
        if (!frame) {
            console.error('anilib - Фрейм не найден');
            return;
        }

        const items = await frame.$$('.menu-item');
        if (items.length > 0) {
            for (const item of items) {
                const text = await item.evaluate(el =>
                    el.querySelector('.menu-item__text')?.textContent?.trim()
                );

                if (!text) {
                    continue;
                }

                if (this.parseList.includes(text)) {
                    console.log(`- Сканирование списка "${text}"`);
                    await item.click();

                    // Скролл страницы (нужен для прогрузки тайтлов)
                    await page.evaluate(async () => {
                        let previousHeight = 0;
                        let retries = 0;
                        const maxRetries = 10;

                        while (retries < maxRetries) {
                            const currentHeight = document.body.scrollHeight;
                            window.scrollTo(0, currentHeight);

                            await new Promise(resolve => setTimeout(resolve, 1000));

                            if (currentHeight === previousHeight) {
                                retries++;
                            } else {
                                retries = 0;
                                previousHeight = currentHeight;
                            }
                        }
                    });

                    // Ожидаем появление тайтлов
                    try {
                        await page.waitForSelector('.book-list a span', { timeout: 10000 });
                    } catch {
                        console.log(`- Список "${text}" пустой, переходим к следующему.`);
                        continue;
                    }

                    // Собираем название всех тайтлов в списке
                    const titles = await page.$$eval('.book-list a span', elements => {
                        return elements.map(el => el.textContent?.trim());
                    });

                    this.animeList.push({
                        name: text,
                        count: titles.length,
                        titles
                    });
                    console.log(`- В списке "${text}" найдено ${titles.length} тайтлов.`);
                }

                await this.writeData();
            }


        }

        await this.writeData();
        await puppeteerBrowser.closeBrowser();
    }
}

export const anilib = new Anilib();