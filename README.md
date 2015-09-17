RabbitMQ implementation in NodeJS
---------------------------------

1. [Install](#install)
2. [Setup NodeJS project](#setup-nodejs-project)
3. [Setup RabbitMQ manager](#setup-rabbitmq-manager)
4. [Setup command](#setup-command)
    1. [Producer](#producer)
    2. [Consumer](#consumer)

## Install

Install [NodeJS](https://nodejs.org/), then [RabbitMQ](http://www.rabbitmq.com/) using docker:

```
docker run -d -p 15672:15672 -p 5672:5672 --name rabbitmq rabbitmq:3-management
```

Using the [administration interface](http://192.168.99.100:15672/), create an exchange and a queue, and bind them.

## Setup NodeJS project

Init project & `package.json` file:

```
npm init
```

Install dependencies & save them into `package.json` file:

```
npm install easy-amqp winston commander --save
```

**Note: see [amqp documentation](https://www.npmjs.com/package/amqp) for more details.**

## Setup RabbitMQ manager

In this application, we will need to produce and consume a message. To do this, let's build a manager that do the stuff.

Create `lib/manager/RabbitMQManager.js` file:

```js
// Compatibility
"use strict";

// Import required libraries
// `easy-amqp` allows to connect to an server using AMQP protocol
// `winston` helps to create custom & multiple loggers
var amqp = require('easy-amqp'),
    winston = require('winston');

// Configure custom logger
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            level: 'debug'
        })
    ]
});

class RabbitMQManager {
    // Connect to RabbitMQ server
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

// Export class to be available at external
module.exports = RabbitMQManager;
```

## Setup command

This application doesn't need any route or controller, only a command to produce or consume a message. Let's create it.

Create a `app.js` file (it can be named as you want). Init modules:

```js
// Import required libraries
// `commander` helps to create NodeJS commands
// `RabbitMQManager` is the manager previously created
var commander = require('commander'),
    RabbitMQManager = require('./lib/manager/RabbitMQManager');

// Let's init our manager, precise RabbitMQ server url
// `amqp://<login>:<password>@<host>:<port>`
var rabbitMQManager = new RabbitMQManager('amqp://guest:guest@192.168.99.100:5672');

// We will develop commands here

// Parse process
commander.parse(process.argv);

// If no command is executed, show help (also available at `help` or using `--help` option)
if (!process.argv.slice(2).length) {
    commander.outputHelp();
}
```

[Commander](https://www.npmjs.com/package/commander) allows us to create commands using arguments & options.

By now, if you execute `node app.js`, or simply `node app`, it should show you default help:

```
  Usage: app [options]

  Options:

    -h, --help  output usage information
```

**Note: you can replace `app.js` or `app` in your command with your custom file name.**

In our example, we will need 2 commands:

1. _produce_: produce a message to RabbitMQ exchange list
2. _consume_: consume a message from RabbitMQ queue

### Producer

Add following command code in `app.js` file, line 13 (near comment `// We will develop commands here`):

```js
commander
    .command('produce <message>')
    .description('produce a message')
    .option('-e, --exchange <exchange>', 'exchange name', 'nodejs.exchange')
    .option('-r, --routing_key <routingKey>', 'routing key')
    .option('-t, --type <type>', 'RabbitMQ exchange type', /^(direct|fanout|topic|headers)$/, 'direct')
    .option('-d, --durable <durable>', 'RabbitMQ exchange durable', function (value) {
        return value === 'true' || value === true;
    }, false)
    .option('-a, --auto_delete <auto_delete>', 'RabbitMQ exchange auto_delete', function (value) {
        return value === 'true' || value === true;
    }, true)
    .action(function (message, options) {
        rabbitMQManager.produce(options.exchange, {
            type: options.type,
            durable: options.durable,
            autoDelete: options.auto_delete
        }, message, options.routing_key);
    })
    .on('--help', function(){
        console.log('  Examples:');
        console.log('');
        console.log('    $ node app produce "Hello World\\!"');
        console.log('    $ node app produce "Hello World\\!" -e foo.exchange');
        console.log('    $ node app produce "Hello World\\!" -e foo.exchange -r another_routing_key');
        console.log('    $ node app produce "Hello World\\!" -e foo.exchange -r another_routing_key -t fanout');
        console.log('    $ node app produce "Hello World\\!" -e foo.exchange -r another_routing_key -t fanout -d true');
        console.log('    $ node app produce "Hello World\\!" -e foo.exchange -r another_routing_key -t fanout -d true -a false');
        console.log('');
    });
```

This command requires a `message` argument, but you can also specify some options:

* `--exchange` (`-e`): exchange list name (default `nodejs.exchange`)
* `--routing_key` (`-r`): routing key
* `--type` (`-t`): exchange list type (direct, fanout, topic, headers)
* `--durable` (`-d`): durable (true/false)
* `--auto_delete` (`-a`): auto_delete (true/false)

**Note: look at [commander documentation](https://www.npmjs.com/package/commander) for more details.**

You can run this command as following (adapt options depending on your exchange list):

```
node app produce "Hello World\!" -e foo.exchange -r another_routing_key -t fanout -d true -a false
```

**Note: press `ctrl+c` to exit script.**

Full help is available at `npm app product -h`.

### Consumer

Then, add following command code in `app.js` file, just after the previous `producer` code:

```js
commander
    .command('consume')
    .description('consume messages')
    .option('-q, --queue <queue>', 'queue name', 'nodejs.queue')
    .option('-r, --routing_key <routingKey>', 'routing key')
    .option('-d, --durable <durable>', 'RabbitMQ exchange durable', function (value) {
        return value === 'true' || value === true;
    }, false)
    .option('-a, --auto_delete <auto_delete>', 'RabbitMQ exchange auto_delete', function (value) {
        return value === 'true' || value === true;
    }, true)
    .action(function (options) {
        rabbitMQManager.consume(options.queue, {
            durable: options.durable,
            autoDelete: options.auto_delete
        }, options.routing_key);
    })
    .on('--help', function(){
        console.log('  Examples:');
        console.log('');
        console.log('    $ node app consume');
        console.log('    $ node app consume -q foo.queue');
        console.log('    $ node app consume -q foo.queue -r another_routing_key');
        console.log('    $ node app consume -q foo.queue -r another_routing_key -d true');
        console.log('    $ node app consume -q foo.queue -r another_routing_key -d true -a false');
        console.log('');
    });
```

This command does not require any argument, but you can also specify some options:

* `--queue` (`-q`): queue name (default `nodejs.queue`)
* `--routing_key` (`-r`): routing key
* `--durable` (`-d`): durable (true/false)
* `--auto_delete` (`-a`): auto_delete (true/false)

You can run this command as following (adapt options depending on your queue):

```
node app consume -q foo.queue -r another_routing_key -d true -a false
```

**Note: press `ctrl+c` to exit script.**

Full help is available at `npm app consume -h`.
