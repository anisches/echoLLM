export class SessionStore {
  constructor(maxMessages = 24) {
    this.maxMessages = maxMessages;
    this.sessions = new Map();
    this.selectedModels = new Map();
  }

  getHistory(sessionId) {
    return this.sessions.get(sessionId) ?? [];
  }

  append(sessionId, message) {
    const current = this.getHistory(sessionId);
    const next = [...current, message].slice(-this.maxMessages);
    this.sessions.set(sessionId, next);
    return next;
  }

  reset(sessionId) {
    this.sessions.delete(sessionId);
    this.selectedModels.delete(sessionId);
  }

  getSelectedModel(sessionId) {
    return this.selectedModels.get(sessionId) ?? null;
  }

  setSelectedModel(sessionId, modelName) {
    if (!modelName) {
      this.selectedModels.delete(sessionId);
      return null;
    }

    this.selectedModels.set(sessionId, modelName);
    return modelName;
  }
}
