const { success } = require('../utils/response');

exports.healthCheck = (req, res) => {
    return success(res, { status: 'ok' });
};
