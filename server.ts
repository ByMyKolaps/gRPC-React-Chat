import path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import {ProtoGrpcType} from './proto/chat'
import { ChatServiceHandlers } from './proto/chatPackage/ChatService'
import { listUsers, addUser, updateUser, getUser, addMessageToRoom, listMessagesInRoom } from './data'
import { User } from './proto/chatPackage/User'
import { Status } from './proto/chatPackage/Status'
import { StreamMessage } from './proto/chatPackage/StreamMessage'
import { StreamRequest, StreamRequest__Output } from './proto/chatPackage/StreamRequest'
import { UserStreamResponse } from './proto/chatPackage/UserStreamResponse'
import {emitMainChatRoomUpdate, emitMainUserUpdate, listenMainChatRoomUpdate, listenUserUpdate} from './pub-sub'

const PORT = 7169
const PROTO_FILE = './proto/chat.proto'

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType
const chatPackage = grpcObj.chatPackage

function main() {
  const server = getServer()

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(err)
      return
    }
    console.log(`Сервер запущен на порту ${port}`)
    server.start()
    setupPubSub()
  })
}

const messageStreamCallByUserId = new Map<number, grpc.ServerWritableStream<StreamRequest__Output, StreamMessage>>()
const userStreamCallByUserId = new Map<number, grpc.ServerWritableStream<StreamRequest__Output, UserStreamResponse>>()

function getServer() {
  const server = new grpc.Server()
  server.addService(chatPackage.ChatService.service, {
    ChatInitiate: (call, callback) => {
      const sessionUsername = call.request.username || ""
      const avatarUrl = call.request.avatarUrl || ""
      if (!sessionUsername || !avatarUrl) {
        return callback(new Error("Имя и аватарка обязательны"))
      }
      listUsers((err, users) => {
        if (err) {
          return callback(err)
        }
        const dbUser = users.find(u => u.name?.toLowerCase() === sessionUsername.toLowerCase())
        if (!dbUser) {
          const user: User = {
            id: Math.floor(Math.random() * 10000),
            status: Status.ONLINE,
            name: sessionUsername,
            avatarUrl: avatarUrl
          }
          addUser(user, (err) => {
            if (err) {
              return callback(err)
            }
            emitMainUserUpdate(user)
            return callback(null, {id: user.id})
          })
        }
        else {
          if (dbUser.status === Status.ONLINE) {
            return callback(new Error("Пользователь уже онлайн"))
          }
          dbUser.status = Status.ONLINE
          updateUser(dbUser, (err) => {
            if(err) return callback(err)
            emitMainUserUpdate(dbUser)
            return callback(null, {id: dbUser.id})
          })
        }
      })
    },
    SendMessage: (call, callback) => {
      const {id = -1, message = ''} = call.request
      if (!id || !message) {
        return callback(new Error("Неизветный пользователь или пустое сообщение"))
      }
      getUser(id, (err, user) => {
        if (err) {
          return callback(err)
        }
        const msg: StreamMessage = {
          userId: user.id,
          message: message,
          userAvatar: user.avatarUrl,
          userName: user.name
        }
        addMessageToRoom(msg, (err) => {
          if (err) {
            return callback(err)
          }
          emitMainChatRoomUpdate(msg)
          callback(null)
        })
      })
    },
    ChatStream: (call) => {
      const {id=-1} = call.request
      if (!id) {
        call.end()
      }
      getUser(id, (err, user) => {
        if (err) {
          call.end()
        }
        listMessagesInRoom((err, msgs) => {
          if (err) {
            call.end()
          }
          for (const msg of msgs) {
            call.write(msg)
          }
          messageStreamCallByUserId.set(id, call)
        })

        call.on("cancelled", () => {
          user.status = Status.OFFLINE
          updateUser(user, (err) => {
            if (err) {
              console.error(err)
            }
            messageStreamCallByUserId.delete(id)
            emitMainUserUpdate(user)
          })
        })
      })
    },
    UserStream: (call) => {
      const {id=-1} = call.request
      if (!id) {
        call.end()
      }
      getUser(id, (err) => {
        if (err) {
          call.end()
        }
        listUsers((err, users) => {
          if (err) {
            call.end()
          }
          call.write({users})
          userStreamCallByUserId.set(id, call)
        })

        call.on("cancelled", () => messageStreamCallByUserId.delete(id))
      })
    }
  } as ChatServiceHandlers) 
  return server
}

const setupPubSub = () => {
  listenUserUpdate(() => {
    listUsers((err, users) => {
      if (err) {
        console.log(err)
      }
      for (const [, userCall] of userStreamCallByUserId) {
        userCall.write({users})
      }
    })
  })
  listenMainChatRoomUpdate((msg, channel) => {
    console.log(channel)
    for (const [, userCall] of messageStreamCallByUserId) {
      userCall.write(msg)
    }
  })
}

main()