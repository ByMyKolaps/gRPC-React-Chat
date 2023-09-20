import { useEffect, useState } from 'react';
import './App.css';
import { InitiateRequest, MessageRequest, Status, StreamMessage, StreamRequest, User } from './proto/chat_pb'
import { ChatServiceClient } from './proto/ChatServiceClientPb'
import Greeting from './components/Greetings';
import Chat from './components/Chat';

const client = new ChatServiceClient("http://localhost:8080")

function App() {
  const [user, setUser] = useState<User.AsObject>()
  const [messages, setMessages] = useState<Array<StreamMessage.AsObject>>([])
  const [users, setUsers] = useState<Array<User.AsObject>>([])

  useEffect(() => {
    if (!user) return
    const request = new StreamRequest()
    request.setId(user.id)
    // for chat stream
    ;(() => {
      const stream = client.chatStream(request, {})
      stream.on("data", (response) => {
        const message = response.toObject()
        setMessages(prev => [...prev, message])
      })
    })()

    // for user stream
    ;(() => {
      const stream = client.userStream(request, {})
      stream.on("data", (response) => {
        const users = response.toObject().usersList
        setUsers(users)
      })
    })()

  
  }, [user])

  const handleUserSubmit = (name: string, avatar: string) => {
      if(!name || !avatar) return
      const req = new InitiateRequest()
      req.setUsername(name)
      req.setAvatarUrl(avatar)
      client.chatInitiate(req, {}, (err, resp) => {
        if (err) console.error(err)
        const respObj = resp.toObject()
        setUser({id: respObj.id, name: name, avatarUrl: avatar, status: Status.ONLINE})
      })
  }

  const handleMessageSubmit = (msg: string, onSuccess: () => void) => {
    if (!user || !msg.trim()) return
    const messageRequest = new MessageRequest()
    messageRequest.setId(user.id)
    messageRequest.setMessage(msg)
    client.sendMessage(messageRequest, {}, (err, resp) => {
      if (err) console.error(err)
      console.log(resp)
      onSuccess()
    })
  }

  return (
    <div className="App">
      <div className="App-container">
        {!user ? 
          <Greeting onUsernameEnter={handleUserSubmit}/> :
          <Chat user = {user} userList={users} messages={messages} onMessageSubmit={handleMessageSubmit} />}
      </div>
    </div>
  );
}

export default App;
