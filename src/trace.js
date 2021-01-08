var initTracer = require('jaeger-client').initTracer;

exports.InitTracer = (config) => {
    return initTracer(config.trace.config, config.trace.options)
};
