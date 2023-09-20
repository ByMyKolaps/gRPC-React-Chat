md \client\src\proto
protoc -I=. ./proto/chat.proto --js_out=import_style=commonjs:./chat-client/src --grpc-web_out=import_style=typescript,mode=grpcwebtext:./chat-client/src