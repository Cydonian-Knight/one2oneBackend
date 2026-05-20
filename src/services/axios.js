// services/axios.js

const axios = require('axios');

const getGeoInfo = async (ip) => {
    try {
        const cleanIp = ip
            ?.replace(/^::ffff:/, '')
            ?.split(',')[0]
            ?.trim();



        const { data } = await axios.get(
            `http://ip-api.com/json/${cleanIp}`
        );


        return {
            country: data.country || null,
            region: data.regionName || null,
            city: data.city || null,
        };

    } catch (error) {
        console.error('GeoIP Error:', error.message);
        return null;
    }
};

module.exports = {
    getGeoInfo,
};