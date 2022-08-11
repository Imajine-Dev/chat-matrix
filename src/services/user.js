import { InteractionManager } from 'react-native';

//import matrix from './matrix';

import User from '../classes/User';

const debug = require('debug')('rnm:scenes:user:userService');

export default class UserService {
  constructor(matrixInstance) {
    this._myUser = null;
    this._users = {};
    this._syncList = {};
    this.matrixInstance = matrixInstance;
    this.matrixInstance?.isReady$().subscribe(isReady => {
      if (isReady) this._listen();
    });
  }

  //* *******************************************************************************
  // Data
  //* *******************************************************************************
  getMyUser() {
    if (!this._myUser) {
      try {
        console.log('this.matrixInstancegetMyUser',this.matrixInstance)
        const matrixUser = this.matrixInstance.getClient().getUser(this.matrixInstance.getClient().getUserId());
        const user = new User(matrixUser.userId, this.matrixInstance, matrixUser);
        this._users[matrixUser.userId] = user;
        this._myUser = user;
      } catch (e) {
        debug('Error in getMyUser', e);
      }
    }

    return this._myUser;
  }

  getUserById(userId) {
    console.log('this.matrixInstancegetUserById',this.matrixInstance)
    if (!this._users[userId]) {
      this._users[userId] = new User(userId, this.matrixInstance);
    }
    return this._users[userId];
  }

  _handleRoomStateEvent(event) {
    if (event.getType() === 'm.room.member') {
      const userId = event.getStateKey();
      const newContent = event.getContent();
      const prevContent = event.getPrevContent();
      if (newContent.avatar_url !== prevContent.avatar_url) {
        const matrixUser = this.matrixInstance.getClient().getUser(userId);

        // We need to update the avatar manually when the avatar has been removed
        // because somehow the sdk doesn't
        if (matrixUser.avatarUrl !== newContent.avatar_url) {
          matrixUser.setAvatarUrl(newContent.avatar_url);
        }

        this._syncList[userId] = true;
      } else if (newContent.displayname !== prevContent.displayname) {
        this._syncList[userId] = true;
      }
    }
  }

  _listen() {
    this.matrixInstance
      .getClient()
      .on('RoomState.events', (event, roomState) => this._handleRoomStateEvent(event));

      this.matrixInstance.getClient().on('sync', state => {
      if (['PREPARED', 'SYNCING'].includes(state)) {
        InteractionManager.runAfterInteractions(this._syncUsers.bind(this));
      }
    });
  }

  _syncUsers() {
    for (const userId of Object.keys(this._syncList)) {
      if (this._users[userId]) this._users[userId].update();
    }
    this._syncList = {};
  }

  //* *******************************************************************************
  // Helpers
  //* *******************************************************************************
  getAvatarUrl(url) {
    return this.matrixInstance.getImageUrl(url, 150, 150, 'crop');
  }

  getKnownUsers() {
    const knownUsers = [];

    for (const matrixUser of this.matrixInstance.getClient().getUsers()) {
      if (matrixUser.userId && matrixUser.userId !== this.matrixInstance.getClient().getUserId()) {
        knownUsers.push({
          id: matrixUser.userId,
          name: matrixUser.displayName,
          avatar: matrixUser.avatarUrl,
        });
      }
    }

    return knownUsers;
  }

  async searchUsers(searchText) {
    try {
      const { results: userList } = await this.matrixInstance.getClient().searchUserDirectory({
        term: searchText,
      });
      const cleanUserList = [];

      for (const user of userList) {
        // We need to remove duplicates and our own user
        if (
          user.user_id !== this.matrixInstance.getClient().getUserId() &&
          cleanUserList.findIndex(cleanUser => cleanUser.id === user.user_id) === -1
        ) {
          cleanUserList.push({
            id: user.user_id,
            name: user.display_name,
            avatar: user.avatar_url,
          });
        }
      }
      return cleanUserList;
    } catch (e) {
      debug('Error searching user directory', e);
    }
  }
}

// const userService = new UserService();
// export default userService;
