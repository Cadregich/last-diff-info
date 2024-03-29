import OsuApi from './OsuApiHelper'
class LastDiffInfo {
    initialize() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    this.setLastDiffInfoToMapsRows(mutation.addedNodes);
                }
            });
        });
        const targetNode = document.querySelector('.beatmapsets__items');

        if (targetNode) {
            observer.observe(targetNode, { childList: true });
        }

        this.catchMapsFromDom(5)
            .then(beatmapsRows => {
                console.log('Пытаемся вызвать setLastDiffInfoToMapsRows');
                if (beatmapsRows) {
                    this.setLastDiffInfoToMapsRows(beatmapsRows);
                }
            })
            .catch(error => {
                console.error('Произошла ошибка:', error);
            });
    }

    catchMapsFromDom(attempts) {
        console.log('Вызвана функция catchMapsFromDom');
        return new Promise((resolve, reject) => {
            const attemptToCatchMaps = () => {
                const beatmapsRows = document.getElementsByClassName('beatmapsets__items-row');

                if (beatmapsRows.length > 0) {
                    console.log('Получили карты');
                    resolve(beatmapsRows);
                } else if (attempts > 1) {
                    console.log('Не удалось получить карты с DOM, повторяем попытку');
                    setTimeout(() => {
                        attemptToCatchMaps();
                    }, 200);
                } else {
                    reject('Не удалось получить карты после нескольких попыток');
                }
            };

            attemptToCatchMaps();
        });
    }

    setLastDiffInfoToMapsRows(beatmapsBlocksRows) {
        console.log(beatmapsBlocksRows);
        const beatmapsBlocks = this.flattenBeatmapRows(beatmapsBlocksRows);

        beatmapsBlocks.map(async (element) => {
            const mapsetId = this.getMapsetId(element);
            const mapsetData = await OsuApi.getMapsetData(mapsetId);
            const lastDiffData = this.getLastMapsetDiffInfo(mapsetData);
            console.log(lastDiffData);
            let mapParamsString;
            if (lastDiffData.mode === 'osu') {
                const mapBlockLeftMenu = element.querySelector('.beatmapset-panel__menu');
                const moreDiffInfoBtn = document.createElement('button');
                moreDiffInfoBtn.classList.add('more-diff-info-btn');
                moreDiffInfoBtn.innerText = '...';
                moreDiffInfoBtn.addEventListener('click', () => {
                    this.showDeepMapData(lastDiffData.id, element);
                });
                mapBlockLeftMenu.insertAdjacentElement('afterbegin', moreDiffInfoBtn);
            }
            mapParamsString = this.createMapParamsString(lastDiffData);
            this.createInfoBlock(element, mapParamsString, mapsetId);
        });
    }

    async showDeepMapData(mapId, element) {
        console.log(mapId);

        const existingTooltip = document.querySelector('.deep-map-params-tooltip');

        if (existingTooltip && parseInt(existingTooltip.mapId) === mapId) {
            existingTooltip.remove();
            return;
        }

        const cachedData = this.getCachedMapData(mapId);

        if (cachedData) {
            console.log('Data retrieved from cache:', cachedData);
            this.displayTooltip(cachedData.mapDiffDeepParams, mapId, element);
        } else {
            const deepLastDiffData = await OsuApi.getBeatmapData(mapId);
            const mapDiffDeepParams = this.createBeatmapDifficultyParamsString(deepLastDiffData);
            console.log('Data retrieved from API:', mapDiffDeepParams);
            this.cacheMapData(mapId, { mapDiffDeepParams });

            this.displayTooltip(mapDiffDeepParams, mapId, element);
        }
    }
    cacheMapData(mapId, data) {
        const cacheKey = `mapCache_${mapId}`;

        const deepParams = JSON.parse(localStorage.getItem('deepParams')) || {};
        deepParams[cacheKey] = data;

        localStorage.setItem('deepParams', JSON.stringify(deepParams));
    }

    getCachedMapData(mapId) {
        const cacheKey = `mapCache_${mapId}`;
        const deepParams = JSON.parse(localStorage.getItem('deepParams'));

        if (deepParams && deepParams[cacheKey]) {
            return deepParams[cacheKey];
        }

        return null;
    }

    displayTooltip(mapDiffDeepParams, mapId, element) {
        const existingTooltip = document.querySelector('.deep-map-params-tooltip');

        if (existingTooltip && parseInt(existingTooltip.mapId) === mapId) {
            existingTooltip.remove();
            return;
        }

        const tooltip = document.createElement('div');
        tooltip.classList.add('deep-map-params-tooltip');
        tooltip.innerText = mapDiffDeepParams;
        tooltip.mapId = mapId;

        const hideTooltip = () => {
            tooltip.remove();
            document.removeEventListener('click', hideTooltip);
            console.log('Подсказка убрана');
        };

        element.before(tooltip);

        setTimeout(() => {
            document.addEventListener('click', hideTooltip);
        }, 0);
    }

    flattenBeatmapRows(beatmapsBlocksRows) {
        return Array.from(beatmapsBlocksRows)
            .flatMap(row => Array.from(row.querySelectorAll('.beatmapsets__item')))
            .flat();
    }

    getMapsetId(element) {
        const href = element.querySelector('a').getAttribute('href');
        const match = href.match(/\/(\d+)$/);
        return match ? match[1] : null;
    }

    createMapParamsString(lastDiffData) {
        return `<div class="last-diff-info">
    ${lastDiffData.difficulty_rating}★ bpm ${lastDiffData.bpm}
    combo ${lastDiffData.max_combo} od ${lastDiffData.accuracy}
    ar ${lastDiffData.ar} cs ${lastDiffData.cs} hp ${lastDiffData.drain}`;
    }


    createInfoBlock(element, mapParamsString) {
        const infoBlock = document.createElement('div');
        infoBlock.classList.add('last-diff-info');
        const statsRow = element.querySelector('.beatmapset-panel__info-row--stats');
        statsRow.parentNode.insertBefore(infoBlock, statsRow.nextSibling);
        infoBlock.innerHTML = mapParamsString;
        return infoBlock;
    }

    getLastMapsetDiffInfo(mapsetData) {
        if (!mapsetData || !mapsetData.beatmaps || mapsetData.beatmaps.length === 0) {
            return null;
        }

        return mapsetData.beatmaps.reduce((maxDiff, currentMap) => {
            return currentMap.difficulty_rating > maxDiff.difficulty_rating ? currentMap : maxDiff;
        }, mapsetData.beatmaps[0]);
    }

    createBeatmapDifficultyParamsString(beatmapData) {
        const {
            aim_difficulty, speed_difficulty, speed_note_count, slider_factor, overall_difficulty
        } = beatmapData.attributes;

        return [`Aim diff: ${aim_difficulty.toFixed(1)}`, `Speed diff: ${speed_difficulty.toFixed(1)}`, `Speed note count: ${speed_note_count.toFixed(1)}`, `Slider factor: ${slider_factor.toFixed(1)}`, `Overall diff: ${overall_difficulty.toFixed(1)}`,].join(', ');
    }
}

export default new LastDiffInfo();
