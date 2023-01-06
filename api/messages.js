export const MESSAGES = {
  GET_LOGGING: 'get-logging',
  SAVE_LOGGING: 'save-logging'
};

export class Message {
  type;
  value;

  constructor(type, value = null) {
    this.type = type;
    this.value = value;
  }
}

export default function m(type, value = null) {
  return new Message(type, value);
}
