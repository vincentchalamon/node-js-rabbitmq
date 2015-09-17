var commander = require('commander'),
    RabbitMQManager = require('./lib/manager/RabbitMQManager');

var rabbitMQManager = new RabbitMQManager('amqp://guest:guest@192.168.99.100:5672');

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

commander.parse(process.argv);

if (!process.argv.slice(2).length) {
    commander.outputHelp();
}
