// import chats from './chat';
import ChatService from './chat';
import MatrixService from './matrix';
//import messages from './message';
import MessagesService from './message';
// import users from './user';
import UserService from './user';
//import auth from './auth';
import AuthService from './auth';

const debug = require('debug')('rnm:services:external.js');

class ExternalService {
  // constructor(props) {
  //   this.matrixInstance = new MatrixService();
  //   this.userInstance = new UserService(this.matrixInstance);
  //   this.messagesInstance = new MessagesService(this.matrixInstance, this.userInstance);
  //   this.chatInstance = new ChatService(
  //     this.matrixInstance,
  //     this.userInstance,
  //     this.messagesInstance
  //   );
  //   this.authInstance = new AuthService(this.matrixInstance);
  // }

  /*************************************************
   * CLIENT METHODS
   *************************************************/

  async initMatrixInstance() {
    this.matrixInstance = new MatrixService();
    this.userInstance = new UserService(this.matrixInstance);
    this.messagesInstance = new MessagesService(this.matrixInstance, this.userInstance);
    this.chatInstance = new ChatService(
      this.matrixInstance,
      this.userInstance,
      this.messagesInstance
    );
    this.authInstance = new AuthService(this.matrixInstance);
  }

  async createClient(baseUrl, accessToken, userId, deviceId) {
    return this.matrixInstance.createClient(baseUrl, accessToken, userId, deviceId);
  }

  async start(useCrypto) {
    return this.matrixInstance.start(useCrypto);
  }

  async getHomeserverData(domain) {
    return this.matrixInstance.getHomeserverData(domain);
  }

  getClient() {
    return this.matrixInstance.getClient();
  }

  /*************************************************
   * AUTH METHODS
   *************************************************/

  initAuth() {
    return this.authInstance.init(this.matrixInstance);
  }

  loginWithPassword(username, password, homeserver, initCrypto = false) {
    return this.authInstance.loginWithPassword(username, password, homeserver, initCrypto);
  }

  logout() {
    return this.authInstance.logout();
  }

  /*************************************************
   * VALUES
   *************************************************/

  isReady$() {
    return this.matrixInstance.isReady$();
  }

  isSynced$() {
    return this.matrixInstance.isSynced$();
  }

  authIsLoaded$() {
    return this.authInstance.isLoaded$();
  }

  isLoggedIn$() {
    return this.authInstance.isLoggedIn$();
  }

  /*************************************************
   * USER METHODS
   *************************************************/

  getMyUser() {
    return this.userInstance.getMyUser();
  }

  /*************************************************
   * ROOM METHODS
   *************************************************/

  async createRoom(options = {}) {
    const defaults = {
      visibility: 'private',
      invite: [], // list of user IDs
      room_topic: '',
    };
    return this.chatInstance.createChat({ ...defaults, ...options });
  }

  async createEncryptedRoom(usersToInvite) {
    return this.chatInstance.createEncryptedChat(usersToInvite);
  }

  getRooms$(slim = false) {
    return this.chatInstance.getChats(slim);
  }

  getRoomsByType$(type) {
    return this.chatInstance.getListByType$(type);
  }

  getRoomById(roomId) {
    return this.chatInstance.getChatById(roomId);
  }

  joinRoom(roomIdOrAlias) {
    this.chatInstance.joinRoom(roomIdOrAlias);
  }

  leaveRoom(roomId) {
    this.chatInstance.leaveRoom(roomId);
  }

  rejectInvite(roomId) {
    this.chatInstance.leaveRoom(roomId);
  }

  getDirectChat(userId) {
    let directMessage = null;
    const joinedChats = this.chatInstance.getChats(false).getValue();
    for (let i = 0; i < joinedChats.length && !directMessage; i++) {
      const chat = joinedChats[i];
      const members = this.chatInstance.getMembers();
      const hasUser = members.find((member) => member.id === userId);
      if (members.length === 2 && hasUser) {
        directMessage = chat;
      }
    }
    return directMessage;
  }

  setRoomName(roomId, name) {
    const chat = this.chatInstance.getChatById(roomId);
    chat.setName(name);
  }

  /*************************************************
   * MESSAGE METHODS
   *************************************************/

  send(content, type, roomId, eventId = null) {
    this.messagesInstance.send(content, type, roomId, eventId);
  }

  sendReply(roomId, relatedMessage, messageText) {
    this.messagesInstance.sendReply(roomId, relatedMessage, messageText);
  }

  getMessageById(eventId, roomId, event = null) {
    return this.messagesInstance.getMessageById(eventId, roomId, event);
  }

  deleteMessage(message) {
    const { event } = message.getMatrixEvent();
    const eventId = event.event_id;
    const roomId = event.room_id;
    this.matrixInstance.getClient().redactEvent(roomId, eventId);
    message.update();
  }

  editMessage(roomId, messageId, newMessageContent) {
    this.messagesInstance.send(newMessageContent, 'm.edit', roomId, messageId);
  }

  /*************************************************
   * User Methods
   *************************************************/

  getKnownUsers() {
    return this.userInstance.getKnownUsers();
  }

  async searchUsers(searchTerm) {
    return await this.userInstance.searchUsers(searchTerm);
  }

  getUserById(userId) {
    return this.userInstance.getUserById(userId);
  }

  /*************************************************
   * HELPERS
   *************************************************/

  getHttpUrl(mxcUrl, width = null, height = null, resizeMethod = 'scale') {
    return this.matrixInstance.getHttpUrl(mxcUrl, width, height, resizeMethod);
  }
}

const external = new ExternalService();
export default external;
