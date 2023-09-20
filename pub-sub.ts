import { nrp } from './data'
import { StreamMessage } from './proto/chatPackage/StreamMessage'
import { User } from './proto/chatPackage/User'

const REDIS_CHANNELS = {
    mainRoom: "MAIN_ROOM",
    userChange: "USER_CHANGE"
}

export type listenFuncCallback<T> = (data: T, channel: string) => void

export const emitMainChatRoomUpdate = (msg: StreamMessage) => {
     nrp.emit(REDIS_CHANNELS.mainRoom, JSON.stringify(msg))
}

export const listenMainChatRoomUpdate = (func: listenFuncCallback<StreamMessage>) => {
    nrp.on(REDIS_CHANNELS.mainRoom, (data, channel) => {
        const msg = JSON.parse(data) as StreamMessage
        func(msg, channel)
    })
}

export const emitMainUserUpdate = (user: User) => {
    nrp.emit(REDIS_CHANNELS.userChange, JSON.stringify(user))
}

export const listenUserUpdate = (func: listenFuncCallback<User>) => {
   nrp.on(REDIS_CHANNELS.userChange, (data, channel) => {
       const user = JSON.parse(data) as User
       func(user, channel)
   })
}