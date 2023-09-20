import * as redis from 'redis';
import NRP from 'node-redis-pubsub';
import { User } from './proto/chatPackage/User'
import { StreamMessage } from './proto/chatPackage/StreamMessage';

const client = redis.createClient()

client.on("error", console.error)
client.on("connect", console.log)

const REDIS_KEYS = {
    broadcastRoom: "room:0:messages",
    users: "users",
}

type ErrorCallback<T> = (err: Error | null, data: T) => void

export const addUser = (user: User, func?: ErrorCallback<number>) => {
    client.rpush(REDIS_KEYS.users, JSON.stringify(user), func)
  };

export const listUsers = (func: ErrorCallback<Array<User>>) => {
    client.lrange(REDIS_KEYS.users, 0, -1, (err, rows) => {
        if (err) return func(err, [])
        const users: Array<User> = [];
        for (const row of rows) {
            const user = JSON.parse(row) as User
            users.push(user)
        }
        func(err, users)
    })
}

export const updateUser = (user: User, func: ErrorCallback<unknown>) => {
    listUsers((err, users) => {
        if (err) return func(err, null)
        const i = users.findIndex(u => u.id === user.id)
        if (i === -1) return func(new Error("Пользователь не найден"), null)
        client.lset(REDIS_KEYS.users, i, JSON.stringify(user), func)
        
    })
}

export const getUser = (userId: number, func: ErrorCallback<User>) => {
    listUsers((err, users) => {
        if (err) return func(err, {})
        const id = users.findIndex(u => u.id === userId)
        if (id === -1) return func(new Error("Пользователь не найден"), {})
        return func(null, users[id])
    })
}

export const addMessageToRoom = (msg: StreamMessage, func: ErrorCallback<number>) => {
    client.rpush(REDIS_KEYS.broadcastRoom, JSON.stringify(msg), func)
}

export const listMessagesInRoom = (func: ErrorCallback<Array<StreamMessage>>) => {
    client.lrange(REDIS_KEYS.broadcastRoom, 0, -1, (err, rows) => {
        if (err) {
            return func(err, [])
        }
        const listOfMsgs: Array<StreamMessage> = []
        for (const row of rows) {
            const msg = JSON.parse(row) as StreamMessage
            listOfMsgs.push(msg)
        }
        return func(null, listOfMsgs)
    })
}

export const nrp = NRP({
    emitter: redis.createClient(),
    receiver: redis.createClient()
})
    


