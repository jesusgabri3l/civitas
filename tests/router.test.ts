// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { $appState, $targetStage, resetAppStateForTests, settleTransition } from '../src/state/appStore';
import { closeInfo, navigate, openInfo, parseLocation, startRouter, urlFor } from '../src/state/router';

const settle = () => {
  const state = $appState.get();
  if (state.kind === 'transitioning') settleTransition(state.to);
};

const popTo = (url: string) => {
  history.replaceState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

describe('parseLocation / urlFor', () => {
  it('maps paths to stages and back', () => {
    expect(parseLocation('/')).toEqual({ stage: 'globe', info: false });
    expect(parseLocation('/rome/')).toEqual({ stage: 'rome', info: false });
    expect(parseLocation('/paris', '#info')).toEqual({ stage: 'paris', info: true });
    expect(parseLocation('/unknown')).toEqual({ stage: 'globe', info: false });
    expect(parseLocation('/', '#info')).toEqual({ stage: 'globe', info: false });
    expect(urlFor('athens', true)).toBe('/athens#info');
    expect(urlFor('globe')).toBe('/');
  });
});

describe('router + store', () => {
  let stop: () => void;

  const boot = (url: string) => {
    history.replaceState(null, '', url);
    resetAppStateForTests();
    stop = startRouter();
  };

  beforeEach(() => boot('/'));
  afterEach(() => stop());

  it('deep link starts settled, no transition', () => {
    stop();
    boot('/athens');
    expect($appState.get()).toEqual({ kind: 'monument', city: 'athens' });
    stop();
    boot('/rome#info');
    expect($appState.get()).toEqual({ kind: 'info', city: 'rome' });
  });

  it('navigate pushes history and goes through transitioning', () => {
    const before = history.length;
    navigate('rome');
    expect(location.pathname).toBe('/rome');
    expect(history.length).toBe(before + 1);
    expect($appState.get()).toEqual({ kind: 'transitioning', to: 'rome', info: false });
    expect($targetStage.get()).toBe('rome');
    settle();
    expect($appState.get()).toEqual({ kind: 'monument', city: 'rome' });
  });

  it('navigating to the current place is a no-op', () => {
    const before = history.length;
    navigate('globe');
    expect(history.length).toBe(before);
    expect($appState.get()).toEqual({ kind: 'globe' });
  });

  it('popstate goes back and forward through the machine', () => {
    navigate('paris');
    settle();
    popTo('/');
    expect($appState.get()).toEqual({ kind: 'transitioning', to: 'globe', info: false });
    settle();
    expect($appState.get()).toEqual({ kind: 'globe' });
    popTo('/paris');
    expect($appState.get()).toMatchObject({ kind: 'transitioning', to: 'paris' });
  });

  it('a newer request replaces a pending transition; a stale settle is ignored', () => {
    navigate('rome');
    navigate('athens');
    expect($appState.get()).toEqual({ kind: 'transitioning', to: 'athens', info: false });
    settleTransition('rome');
    expect($appState.get().kind).toBe('transitioning');
    settleTransition('athens');
    expect($appState.get()).toEqual({ kind: 'monument', city: 'athens' });
  });

  it('info opens and closes without a stage transition, reflected as #info', () => {
    navigate('rome');
    settle();
    openInfo('rome');
    expect(location.hash).toBe('#info');
    expect($appState.get()).toEqual({ kind: 'info', city: 'rome' });
    popTo('/rome');
    expect($appState.get()).toEqual({ kind: 'monument', city: 'rome' });
    closeInfo('rome');
    expect($appState.get()).toEqual({ kind: 'monument', city: 'rome' });
    expect(location.hash).toBe('');
  });

  it('intercepts clicks on internal links and ignores external or modified ones', () => {
    document.body.innerHTML =
      '<a id="a" href="/paris">Paris</a><a id="b" href="https://example.com/">x</a><a id="c" href="/rome">r</a>';
    const click = (id: string, init: MouseEventInit = {}) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
      document.getElementById(id)!.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(click('a')).toBe(true);
    expect(location.pathname).toBe('/paris');
    expect(click('b')).toBe(false);
    expect(click('c', { ctrlKey: true })).toBe(false);
    expect(location.pathname).toBe('/paris');
  });
});
