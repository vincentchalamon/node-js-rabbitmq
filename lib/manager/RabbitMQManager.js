"use strict";

var amqp = require('easy-amqp'),
    winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            level: 'debug'
        })
    ]
});

class RabbitMQManager {
    constructor(url) {
        this.connection = amqp.createConnection(url);
    }

    /**
     * Produce a message
     *
     * @param {String} exchange Exchange name
     * @param {Object} options Exchange options
     * @param message Message
     * @param {String} routingKey Routing key
     */
    produce(exchange, options, message, routingKey) {
        this.connection.exchange(exchange, options).publish(routingKey || '', message, {contentType: 'text/plain'});
    }

    /**
     * Consume messages
     *
     * @param {String} queue Queue name
     * @param options Queue options
     * @param {String} routingKey Routing key
     */
    consume(queue, options, routingKey) {
        this.connection.queue(queue, options).bind(routingKey || '#').subscribe(function (message) {
            logger.debug('Message downloaded: %s', message.data.toString());
        });
    }
}

module.exports = RabbitMQManager;
