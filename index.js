const { RequestyNode } = require('./dist/nodes/Requesty/Requesty.node');
const { RequestyApi } = require('./dist/credentials/RequestyApi.credentials');

module.exports = {
    nodes: [
        RequestyNode
    ],
    credentials: [
        RequestyApi
    ],
    version: require('./package.json').version,
};
