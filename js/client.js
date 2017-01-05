import { RedisError, RedisNoAnswerError } from './errors'

export class RedisClient {

  _bridge = null;
  _uuid   = "";
  _addr   = "";
  _dbId   = (-1);

  _listeners = [];

  constructor(native, meta) {
    this._bridge = native.bridge;
    this._notify = native.notificationListeners;

    if (meta.uuid) {
      this._uuid = meta.uuid;
      this._addr = meta.address[0];
      this._dbId = meta.dbIndex;

      this._notify[this._uuid] = this._onNotification.bind(this);
    }
  }

  get uuid() {
    return this._uuid;
  }

  get address() {
    return this._addr;
  }

  get dbIndex() {
    return this._dbId;
  }

  _clear() {
    this._notify[this._uuid] = null;

    this._listeners.splice(0, this._listeners.length);

    this._uuid = "";
    this._addr = "";
    this._dbId = (-1);
  }

  _onNotification(notification) {
    let keySpaceMsg = this._keySpaceNotificationTransform(notification);

    if (keySpaceMsg) {
      notification = keySpaceMsg
    }

    this._listeners.forEach((listener) => {
      listener(notification);
    });
  }

  _keySpaceNotificationTransform(msg) {
    if (msg) {
      let eventName = msg.event || '';
      if (eventName.startsWith('__keyspace@')) {
        eventName   = eventName.slice('__keyspace@'.length);

        let dbName  = eventName.split(':')[0];
        let varName = eventName.split(':')[1];

        dbName = dbName[0];

        return {
          action: msg.message,
          target: varName,
          scope:  parseInt(dbName)
        }
      }
    }
  }

  destroy() {
    return new Promise((resolve, reject) => {
      this._bridge.destroy(this._uuid, answ => {
        if (!answ) {
          reject(new RedisNoAnswerError());
          return;
        }

        if (answ.error) {
          reject(new RedisError(answ.error));
          return;
        }

        this._clear();
        resolve(answ.result);
      });
    });
  }

  readObject(key) {
    return new Promise((resolve, reject) => {
      this._bridge.readObject(this._uuid, key, answ => {
        if (!answ) {
          reject(new RedisNoAnswerError());
          return;
        }

        if (answ.error) {
          reject(new RedisError(answ.error));
          return;
        }

        resolve(JSON.parse(answ.result || "null"));
      });
    });
  }

  saveObject(key, obj) {
    return new Promise((resolve, reject) => {
      this._bridge.saveObject(this._uuid, key, JSON.stringify(obj || '{}'), answ => {
        if (!answ) {
          reject(new RedisNoAnswerError());
          return;
        }

        if (answ.error) {
          reject(new RedisError(answ.error));
          return;
        }

        resolve(answ.result);
      });
    });
  }

  subscribe(topic) {
    return new Promise((resolve, reject) => {
      this._bridge.subscribe(this._uuid, topic, answ => {
        if (!answ) {
          reject(new RedisNoAnswerError());
          return;
        }

        if (answ.error) {
          reject(new RedisError(answ.error));
          return;
        }

        resolve(answ.result);
      });
    });
  }

  unsubscribe(topic) {
    return new Promise((resolve, reject) => {
      this._bridge.unsubscribe(this._uuid, topic, answ => {
        if (!answ) {
          reject(new RedisNoAnswerError());
          return;
        }

        if (answ.error) {
          reject(new RedisError(answ.error));
          return;
        }

        resolve(answ.result);
      });
    });
  }

}
