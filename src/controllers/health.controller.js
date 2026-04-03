const { success, error } = require('../utils/response');

exports.healthCheck = (req, res) => {
    return success(res, { status: 'Respuesta Correcta, Utils' });

};

exports.errorCheck = (req, res) => {


    return error(res, { status: 'Error, Utils' });
};


exports.middleCheck = (req, res, next) => {
    const err = new Error('Error, Middleware');
    err.status = 400;

    next(err);
};