// helpers/eventUtils.js
const axios = require('axios');
const Event = require('../models/Event');

const baseUrlTrento = 'https://www.comune.trento.it';
const defaultImage = '/img/default.webp';

//RECUPERO DATI EVENTO DAL DB
async function getLocalEvents(query = {}, sort = { createdAt: -1 }) {
    const events = await Event.find(query).sort(sort).exec();
    return events.map(e => ({
        id: e._id,
        title: e.title,
        description: e.description,
        images: e.images && e.images.length ? e.images : [e.imageUrl],
        source: 'local',
        date: new Date(e.date)
    }));
}

//RECUPERO DATI DALL'API
async function getTrentoEvents() {
    const res = await axios.get('https://www.comune.trento.it/api/opendata/v2/content/search/classes%20%27event%27');
    const dataAPI = res.data.searchHits || [];

    return dataAPI.map(e => {
        const itaData = e.data['ita-IT'];

        const imgUrl = itaData.virtual_image && itaData.virtual_image.length > 0
            ? baseUrlTrento + itaData.virtual_image[0].url
            : defaultImage;

        const place = itaData.virtual_takes_place_in?.[0] || {};

        const dateStr = itaData.time_interval?.input?.startDateTime || e.metadata.published || e.metadata.modified;

        return {
            id: e.metadata.id,
            title: itaData.event_title || 'Evento Comune di Trento',
            description: itaData.event_abstract ? itaData.event_abstract.replace(/<[^>]*>?/gm, '') : 'Descrizione non disponibile',
            images: [imgUrl],
            location: place.name || 'Trento',
            coordinates: {
                latitude: place.latitude ? parseFloat(place.latitude) : null,
                longitude: place.longitude ? parseFloat(place.longitude) : null
            },
            source: 'trento',
            date: dateStr ? new Date(dateStr) : new Date(0)
        };
    });
}

//FUNZIONE DI ORDINAMENTO E UNIONE EVENTI
async function getAllEvents({ sort = 'recent', query = {}, customSortFunction = null } = {}) {
    const [localEvents, trentoEvents] = await Promise.all([
        getLocalEvents(query),
        getTrentoEvents()
    ]);

    let combined = [...localEvents, ...trentoEvents];

    if (customSortFunction) {
        combined.sort(customSortFunction);
    } else {
        combined.sort((a, b) => b.date - a.date); // default: recenti prima
    }

    return {
        allEvents: combined,
        totalCount: localEvents.length + trentoEvents.length
    };
}

module.exports = {
    getLocalEvents,
    getTrentoEvents,
    getAllEvents
};
