Name: Bui Thanh Dat
This purpose of this project is to satisfy the interview test from Holistics: build a simple, stripped down version of a Redis server, named Ledis, together with a simple nodejs cli and a web cli.

# Assumptions/Limitations
* It is assumed that the total amount of data that is going to be stored is not large and be handled properly in memory by pure Javascript
* The CLIs were developed with minimal functions and satisfy the purpose of demonstrating the Ledis server
* For the details of each command that were not specified in the requirements, especially the special cases, I follow Redis to find the expected behaviours
* For requirements of SAVE and RESTORE, it is not clear what 'state' is, and the syntax of these commands are also different from those on Redis. Thus, I assume it is the whole current database

# Design
## Endpoint
The Ledis server has one important endpoint: `POST /`
This endpoint accepts the request body as plain text, which is supposed to be the command sent by the user. There are two custom headers:
* `passwd` a password string. This is just to prevent unwanted access to the server. The password is compared with a hard-coded string stored in `constants.js`
* `storename` the name of the store that needs to be accessed. This provides an isolation between different testing environments.

## Major classes
### Store
holds the data that the user wants to store
#### Attributes
* `name` the name to identify the store
* `data` an object which holds the data that the user wants to store. Each key indentifies a data entry, and its value is represented by a StoreValueObj
* `expiringKeys` an array holding the keys which has an expiration
* `expirer` the timer to check for expired keys
* `checkingKeys` a boolean indicating whether there is a key-checking loop running. This prevents concurrent conflicts
#### Behaviours
* passive expirer: whenever a key is get, the Store checks its time-to-live (`ttl`) and delete the key if `ttl` <= 0
* active expirer: when the Store is created, it starts a interval timer named `expirer`. This timer ticks every 100ms. In every tick, 20 random keys in `expiringKeys` are checked, if more than 5 keys are expired, it repeats from picking 20 new random keys.
### StoreValueObj
represents the value of a key
#### Attributes
* `value` the actual data value
* `type` indicates the type of the value, either "string","list", or "set"
* `expiredAt` the time in ms when the key expires
* `ttl` time-to-live: the time in seconds until the key expires, -1 if there is no expiration
### Command
#### Attributes
* `keyword` indentifies the Command
* `numArgs` number of arguments this command accepts
* `exactNumArgs` boolean indicates whether the number of args passed into method `execute()` must match `numArgs`
#### Behaviours
* when created, the Command adds itself to the `commands` object, with the key being its `keyword`
* each Command implements its own function to execute
* when `execute()`, a Command always validate the number of args passed in. If `exactNumArgs`=`false`, number of args passed in must be >= `numArgs`

## Static variables
### commands
an object storing all the commands. It uses their `keyword`s as the keys
### stores
an object storing all stores. It uses their `name` as the keys

## Processing
In order to process a command, the server follow the following steps. During each step, any any error occured would be thrown and sent to the client.
1. authorize user using the header `passwd`
2. find the Store that user wants to access using the header `storename`, if the Store with that name has not been created, create a new Store and add it to `stores`. If the header `storename` is not set or empty, use the name "common"
2. Parse command: split the command string into `keyword` and `args` using the first space character. The `args` string is then processed to an array using the regex `/((".*?")|('.*?')|([^ ]+)) /g`
3. look for the command in the `commands` obj using `keyword`
4. execute the command using its `execute()` with the parsed `args`, on the Store found in step 2
5. send the result to the client

# Thought process
1. After reading the requirements, I choose NodeJs because I am quite confident with it and believe Javascript objects and json are very suitable
2. For each required command, I read on Redis how it should function, and try it out on https://try.redis.io/
3. I addded the custom header `passwd` because I do not want my public server to be so public.
4. I created an ExpressJs project and started with the Command class. I noticed that the syntax of all commands is very similar. The main difference is in the number of arguments, so I added the validation of number of arguments. However, since I could not find the documentation on how Redis parses the arguments, I kept trying out on https://try.redis.io/, and came up with the regex `/((".*?")|('.*?')|([^ ]+)) /g`. It looks for all parts of the string that is trailed by a space AND either: 
    1. wrapped by a pair of double quotes
    2. wrapped by a pair of single quotes
    3. or contains no space
5. When I started implementing the list-related commands, I noticed that most of them need to validate if the existing key is a list or not, so I created the class ListCommand. I created the SetCommand later because of the same reason.
6. At first, if a command is accessing a key that was not set, Ledis would throw "Error: Key not found". However, after reading Redis documentation, I found out that Redis would return nil for GET, or empty list for list and set related commands, if the key has not been set. For LRANGE, Redis also return empty list when `start`>`stop`. Thus, since the requirement does not specify, I follow this behaviour. As I have not used Redis before, I cannot be certain, but I believe it behaves like that because of its use cases.
7. When I read about EXPIRE on Redis, I knew that I have to have attributes for a data entry to store its expiration. But then I forgot to do so at first. Then, since I implement 'set' using javascript array, when validating if a key holds a 'set', I realized I need an attribute to store the data type, and it reminded me of the class StoreValueObj that I planned from the beginning, so I implemented it. I should have completed the whole design first, but because of the time pressure and the amount of work I have to do on other stuff, I just wanted to finish the test early.
8. For all string and list commands, I was using Postman for testing. Then I think I could do it faster and more conveniently if I write my tests and run them in cli.js
9. Similar to StoreValueObj, I also forgot to create the Store class at first. I knew I should create that class when I read about active and passive expirer.
10. Since I invited my friend to test my Ledis, I added the `name` attribute to Store class and enable Ledis to create multiple stores to provide some sort of isolation between different testing environments. I believe this could also be useful for Holistics when evaluating/testing my work.
11. My friend noticed SINSTER was malfunctioning. I realized I had been thinking that it is a UNION function. Both my implementation and tests were for a UNION function at that moment. Thus, I fixed it.
12. I changed the path to store the snapshots from relative to absolute so that it is not affected by the process running Ledis.
