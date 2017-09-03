Name: Bui Thanh Dat
This purpose of this project is to satisfy the interview test from Holistics: build a simple, stripped down version of a Redis server, named Ledis, together with a simple cli.

# Design
## Endpoint
The Ledis server has one important endpoint: `POST /`
This endpoint accepts the request body as plain text, which is supposed to be the command sent by the user. There are two custom headers:
* `passwd` a password string. This is just to prevent unwanted access to the server. The password is compared with a hard-coded string stored in `constants.js`
* `storename` the name of the store that needs to be accessed. This provides an isolation between different testing environment.

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
