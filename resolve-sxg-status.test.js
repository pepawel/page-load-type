/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

// We need to dynamically import the module inside each test to get a fresh copy
let getPageLoadType;
let resolveSxgStatus;

describe('resolveSxgStatus', () => {
  let mockScriptLoader;

  const defaultConfig = {
    scriptPath: '/sxg/resolve-status.js',
    eventName: 'SxgStatusResolved',
    eventProperty: 'subresources'
  };

  // Setup before each test
  beforeEach(async () => {
    // Clear DOM event listeners
    jest.resetAllMocks();

    // Reset modules to get a fresh state
    jest.resetModules();

    // Create a mock script loader
    mockScriptLoader = jest.fn();

    // Reset DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Dynamically import the module to get a fresh instance for each test
    const module = await import('.');
    getPageLoadType = module.default;
    resolveSxgStatus = module.resolveSxgStatus;
  });

  test('resolves when subresources is true', async () => {
    const promise = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: defaultConfig
    });

    expect(mockScriptLoader).toHaveBeenCalledWith('/sxg/resolve-status.js');

    // Simulate the script loading and dispatching the event with true
    document.dispatchEvent(new CustomEvent('SxgStatusResolved', {
      detail: { subresources: true }
    }));

    await expect(promise).resolves.toBeUndefined();
  });

  test('rejects when subresources is false', async () => {
    const promise = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: defaultConfig
    });

    expect(mockScriptLoader).toHaveBeenCalledWith('/sxg/resolve-status.js');

    // Simulate the script loading and dispatching the event with false
    document.dispatchEvent(new CustomEvent('SxgStatusResolved', {
      detail: { subresources: false }
    }));

    await expect(promise).rejects.toBeUndefined();
  });

  test('scriptLoader is only called once even if resolveSxgStatus is called multiple times', async () => {
    // First call
    const promise1 = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: defaultConfig
    });

    // Second call before the first one is resolved
    const promise2 = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: defaultConfig
    });

    // Script loader should only be called once
    expect(mockScriptLoader).toHaveBeenCalledTimes(1);
  });

  test('handles multiple calls with delayed event dispatch properly', async () => {
    // First call
    const promise1 = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: defaultConfig
    });

    // Second call before the event is dispatched
    const promise2 = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: defaultConfig
    });

    // Simulate delayed event dispatch
    document.dispatchEvent(new CustomEvent('SxgStatusResolved', {
      detail: { subresources: true }
    }));

    // Both promises should resolve
    await expect(promise1).resolves.toBeUndefined();
    await expect(promise2).resolves.toBeUndefined();
  });

  test('event listener is only attached once and cached result is used on subsequent calls', async () => {
    // Spy on document.addEventListener to verify it's only called once
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

    // First call - this will set up the event listener
    const promise1 = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: defaultConfig
    });

    // Verify that the event listener was attached
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'SxgStatusResolved',
      expect.any(Function),
      { once: true }
    );

    // Trigger event and resolve
    document.dispatchEvent(new CustomEvent('SxgStatusResolved', {
      detail: { subresources: true }
    }));

    await expect(promise1).resolves.toBeUndefined();

    // Reset the spy to check if it's called again
    addEventListenerSpy.mockClear();

    // Second call after the event has been processed
    // This should use the cached result without attaching a new event listener
    const promise2 = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: defaultConfig
    });

    // Verify no new event listener was attached (using cached result)
    expect(addEventListenerSpy).not.toHaveBeenCalled();

    // This should immediately resolve without dispatching an event
    await expect(promise2).resolves.toBeUndefined();

    // Clean up the spy
    addEventListenerSpy.mockRestore();
  });

  test('handles custom event name and property', async () => {
    const customConfig = {
      scriptPath: '/custom/path.js',
      eventName: 'CustomEvent',
      eventProperty: 'customProperty'
    };

    const promise = resolveSxgStatus({
      scriptLoader: mockScriptLoader,
      sxgStatusConfig: customConfig
    });

    expect(mockScriptLoader).toHaveBeenCalledWith('/custom/path.js');

    // Simulate the script loading and dispatching the custom event
    document.dispatchEvent(new CustomEvent('CustomEvent', {
      detail: { customProperty: true }
    }));

    await expect(promise).resolves.toBeUndefined();
  });
});
