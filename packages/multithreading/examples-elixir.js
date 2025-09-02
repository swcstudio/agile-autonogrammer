/**
 * Examples demonstrating Elixir/Phoenix-inspired features
 * in the enhanced @swcstudio/multithreading package
 */

const multithreading = require('./index');

// Example 1: Actor System with Message Passing
async function actorSystemExample() {
  console.log('\n=== Actor System Example ===\n');
  
  // Create an actor system
  const actorSystem = new multithreading.JsActorSystem();
  
  // Spawn multiple actors
  const actor1 = actorSystem.spawnActor('echo');
  const actor2 = actorSystem.spawnActor('echo');
  const actor3 = actorSystem.spawnActor('echo');
  
  console.log(`Spawned 3 actors. Total actors: ${actorSystem.actorCount()}`);
  
  // Register actors with names
  actorSystem.registerActor('worker1', actor1);
  actorSystem.registerActor('worker2', actor2);
  actorSystem.registerActor('worker3', actor3);
  
  // Look up actor by name
  const foundActor = actorSystem.whereis('worker1');
  console.log(`Found actor 'worker1': ${foundActor}`);
  
  // Send messages to actors
  const message = Buffer.from('Hello from JavaScript!');
  
  // Synchronous call (wait for response)
  const response = await actorSystem.callActor(actor1, message, 5000);
  console.log(`Response from actor1: ${response.toString()}`);
  
  // Asynchronous cast (fire and forget)
  await actorSystem.castActor(actor2, message);
  console.log('Sent async message to actor2');
  
  // Stop an actor
  actorSystem.stopActor(actor3);
  console.log(`Stopped actor3. Remaining actors: ${actorSystem.actorCount()}`);
}

// Example 2: GenServer Pattern
async function genServerExample() {
  console.log('\n=== GenServer Example ===\n');
  
  // Create a GenServer (counter example)
  const genServer = new multithreading.JsGenServer();
  
  // Start multiple counter servers
  const counter1 = await genServer.startCounter('counter1');
  const counter2 = await genServer.startCounter('counter2');
  
  console.log(`Started counter servers: ${counter1}, ${counter2}`);
  
  // Increment counters
  let count = await genServer.incrementCounter('counter1');
  console.log(`Counter1 after increment: ${count}`);
  
  count = await genServer.incrementCounter('counter1');
  console.log(`Counter1 after 2nd increment: ${count}`);
  
  count = await genServer.incrementCounter('counter2');
  console.log(`Counter2 after increment: ${count}`);
  
  // Get current count
  count = await genServer.getCounter('counter1');
  console.log(`Counter1 current value: ${count}`);
  
  // Reset counter
  await genServer.resetCounter('counter1');
  count = await genServer.getCounter('counter1');
  console.log(`Counter1 after reset: ${count}`);
}

// Example 3: Supervisor Trees for Fault Tolerance
async function supervisorExample() {
  console.log('\n=== Supervisor Example ===\n');
  
  const supervisor = new multithreading.JsSupervisor();
  
  // Create a supervisor with one-for-one restart strategy
  supervisor.create('my_supervisor', 'one_for_one', 3, 60);
  
  // Add worker children
  supervisor.addWorker('worker1', 'permanent');
  supervisor.addWorker('worker2', 'temporary');
  supervisor.addWorker('worker3', 'transient');
  
  // Start the supervisor
  const supervisorId = await supervisor.start();
  console.log(`Supervisor started with ID: ${supervisorId}`);
  
  // Check children
  const children = supervisor.whichChildren();
  console.log('Supervisor children:');
  children.forEach(child => console.log(`  - ${child}`));
  
  // Get child counts
  const counts = supervisor.countChildren();
  console.log(`Child counts: ${counts}`);
}

// Example 4: PubSub System
async function pubSubExample() {
  console.log('\n=== PubSub Example ===\n');
  
  const pubsub = new multithreading.JsPubSub('my_pubsub');
  
  // Subscribe to topics
  await pubsub.subscribe('news');
  await pubsub.subscribe('alerts');
  await pubsub.subscribePattern('events.*');
  
  console.log('Subscribed to topics: news, alerts, and pattern events.*');
  
  // Publish messages
  const message1 = Buffer.from(JSON.stringify({ title: 'Breaking News', content: 'Important update' }));
  const delivered1 = await pubsub.publish('news', 'article', message1);
  console.log(`Published to 'news', delivered to ${delivered1} subscribers`);
  
  const message2 = Buffer.from(JSON.stringify({ level: 'warning', message: 'System alert' }));
  const delivered2 = await pubsub.publish('alerts', 'system', message2);
  console.log(`Published to 'alerts', delivered to ${delivered2} subscribers`);
  
  const message3 = Buffer.from(JSON.stringify({ type: 'user_login', userId: 123 }));
  const delivered3 = await pubsub.publish('events.auth', 'login', message3);
  console.log(`Published to 'events.auth', delivered to ${delivered3} subscribers`);
  
  // Broadcast to all subscribers
  const broadcastMsg = Buffer.from('System maintenance in 5 minutes');
  const deliveredAll = await pubsub.broadcast('maintenance', broadcastMsg);
  console.log(`Broadcast delivered to ${deliveredAll} subscribers`);
  
  // Get metrics
  const metrics = pubsub.getMetrics();
  console.log('\nPubSub Metrics:');
  console.log(`  Messages: ${metrics.message_count}`);
  console.log(`  Subscriptions: ${metrics.subscription_count}`);
  console.log(`  Topics: ${metrics.topic_count}`);
  console.log(`  Subscribers: ${metrics.subscriber_count}`);
  
  // List topics
  const topics = pubsub.listTopics();
  console.log(`\nActive topics: ${topics.join(', ')}`);
  
  // Unsubscribe
  await pubsub.unsubscribe('news');
  console.log('Unsubscribed from news topic');
}

// Example 5: Parallel Processing with Actor Pools
async function parallelProcessingExample() {
  console.log('\n=== Parallel Processing Example ===\n');
  
  const actorSystem = new multithreading.JsActorSystem();
  
  // Create a pool of worker actors
  const poolSize = 4;
  const workers = [];
  
  for (let i = 0; i < poolSize; i++) {
    const workerId = actorSystem.spawnActor('echo');
    workers.push(workerId);
    actorSystem.registerActor(`worker_${i}`, workerId);
  }
  
  console.log(`Created worker pool with ${poolSize} actors`);
  
  // Distribute work across the pool
  const tasks = [];
  const numTasks = 10;
  
  for (let i = 0; i < numTasks; i++) {
    const workerIndex = i % poolSize;
    const workerId = workers[workerIndex];
    const data = Buffer.from(`Task ${i}`);
    
    tasks.push(
      actorSystem.callActor(workerId, data, 5000)
        .then(result => ({
          task: i,
          worker: workerIndex,
          result: result.toString()
        }))
    );
  }
  
  // Wait for all tasks to complete
  const results = await Promise.all(tasks);
  
  console.log('\nTask results:');
  results.forEach(({ task, worker, result }) => {
    console.log(`  Task ${task} processed by worker ${worker}: ${result}`);
  });
  
  // Clean up
  workers.forEach(workerId => actorSystem.stopActor(workerId));
  console.log('\nWorker pool shut down');
}

// Example 6: Phoenix-style Channels
async function channelExample() {
  console.log('\n=== Channel Example ===\n');
  
  // Create topic-based channels
  const chatChannel = await multithreading.createTopicChannel('chat:lobby');
  const notificationChannel = await multithreading.createTopicChannel('notifications:user123');
  
  console.log('Created channels for chat:lobby and notifications:user123');
  
  // Send messages through channels
  await chatChannel.send(Buffer.from(JSON.stringify({
    user: 'Alice',
    message: 'Hello everyone!'
  })));
  
  await notificationChannel.send(Buffer.from(JSON.stringify({
    type: 'friend_request',
    from: 'Bob'
  })));
  
  console.log('Messages sent through channels');
  
  // In a real application, you would have receivers listening to these channels
}

// Example 7: Complex State Machine with GenServer
async function stateMachineExample() {
  console.log('\n=== State Machine Example ===\n');
  
  // Create a custom GenServer for a simple traffic light state machine
  const trafficLight = await multithreading.createGenserver('traffic_light', Buffer.from('green'));
  
  console.log(`Traffic light GenServer created: ${trafficLight}`);
  
  // This would require custom implementation in Rust for the state machine logic
  // The example shows the pattern of how it would be used
}

// Example 8: Stress Test - Spawn Many Actors
async function stressTestExample() {
  console.log('\n=== Stress Test Example ===\n');
  
  const actorSystem = new multithreading.JsActorSystem();
  const startTime = Date.now();
  
  // Spawn many actors
  const numActors = 1000;
  const actors = [];
  
  for (let i = 0; i < numActors; i++) {
    actors.push(actorSystem.spawnActor('echo'));
  }
  
  const spawnTime = Date.now() - startTime;
  console.log(`Spawned ${numActors} actors in ${spawnTime}ms`);
  console.log(`Average spawn time: ${(spawnTime / numActors).toFixed(2)}ms per actor`);
  
  // Send a message to each actor
  const messageStart = Date.now();
  const messages = actors.map(actorId => 
    actorSystem.castActor(actorId, Buffer.from('test'))
  );
  
  await Promise.all(messages);
  const messageTime = Date.now() - messageStart;
  
  console.log(`Sent messages to ${numActors} actors in ${messageTime}ms`);
  console.log(`Average message time: ${(messageTime / numActors).toFixed(2)}ms per message`);
  
  // Clean up
  const cleanupStart = Date.now();
  actors.forEach(actorId => actorSystem.stopActor(actorId));
  const cleanupTime = Date.now() - cleanupStart;
  
  console.log(`Cleaned up ${numActors} actors in ${cleanupTime}ms`);
  console.log(`Total actors remaining: ${actorSystem.actorCount()}`);
}

// Run all examples
async function runExamples() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('  Enhanced Multithreading Package - Elixir/Phoenix Examples');
    console.log('='.repeat(60));
    
    await actorSystemExample();
    await genServerExample();
    await supervisorExample();
    await pubSubExample();
    await parallelProcessingExample();
    await channelExample();
    await stateMachineExample();
    await stressTestExample();
    
    console.log('\n' + '='.repeat(60));
    console.log('  All examples completed successfully!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

module.exports = {
  actorSystemExample,
  genServerExample,
  supervisorExample,
  pubSubExample,
  parallelProcessingExample,
  channelExample,
  stateMachineExample,
  stressTestExample
};