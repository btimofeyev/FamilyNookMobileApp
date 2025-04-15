// app/utils/authEvents.js
class AuthEventManager {
    constructor() {
      this.listeners = new Set();
    }
  
    /**
     * Subscribe to auth events
     * @param {Function} callback - Event handler function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
  
    /**
     * Emit an auth event to all subscribers
     * @param {Object} event - Event object
     */
    emit(event) {
      this.listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in auth event listener:', error);
        }
      });
    }
    clear() {
      this.listeners.clear();
    }
  }
  
  export default new AuthEventManager();