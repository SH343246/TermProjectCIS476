// ui_mediator.js acts like a central hub where components can be modified
class UIMediator {
  constructor() {
    this.components = {};
    this.eventHandlers = {};
  }

  registerComponent(name, component) {
    this.components[name] = component;
    console.log(`Component ${name} registered.`);
  }

  // Removecomponents
  removeComponent(name) {
    delete this.components[name];
  }

  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }

  // Notify all subscribers for the an event
  notify(event, ...data) {
    console.log(`Event ${event} triggered with data:`, data);
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => callback(...data));
    }
  }

  getComponent(name) {
    return this.components[name];
  }
}

//a singleton instance.
const mediator = new UIMediator();
export default mediator;
