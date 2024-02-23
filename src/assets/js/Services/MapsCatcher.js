import OsuApi from './OsuApiHelper'

class MapsCatcher {
    constructor() {
        this.data = [];
    }

    initializeObserver() {
        const observer = new MutationObserver(() => {
            this.getMapsIds();
        });

        const targetNode = document.querySelector('.beatmapsets__items');

        if (targetNode) {
            observer.observe(targetNode, {childList: true});
        }
    }

    getMapsIds() {
        console.log('Вызванна функция getMapsIds');
        let elements = document.querySelectorAll('.beatmapset-panel__main-link.u-ellipsis-overflow');
        let elementsArray = Array.from(elements);
        let filteredElementsArray = elementsArray.filter((element, index) => index % 2 === 0);
        return filteredElementsArray.map(async element => {
            let id;
            let href = element.getAttribute('href');
            let match = href.match(/\/(\d+)$/);
            id = match ? match[1] : null;

            let mapsetData = await OsuApi.getMapsetData(id);
            let lastDiffStarRating = this.getLastMapsetDiffInfo(mapsetData).difficulty_rating;

            // let mapParams = `${}`;


            if (!element.innerHTML.includes('Id: ')) {
                element.innerHTML = element.innerHTML + ' Id: ' + id + '<br>' + lastDiffStarRating;
            }

            return id;
        });
    }

    getLastMapsetDiffInfo(mapsetData) {
        if (!mapsetData || !mapsetData.beatmaps || mapsetData.beatmaps.length === 0) {
            return null;
        }

        return mapsetData.beatmaps.reduce((maxDiff, currentMap) => {
            return currentMap.difficulty_rating > maxDiff.difficulty_rating ? currentMap : maxDiff;
        }, mapsetData.beatmaps[0]);
    }
}

export default new MapsCatcher();
