import { domainEvents, TENDER_EVENTS } from '../domainEvents';

describe('utils/domainEvents', () => {
  it('dispatches events and notifies registered listeners', () => {
    const listener = jest.fn();
    const eventName = 'TestEvent';
    const payload = { id: '123', status: 'active' };

    domainEvents.on(eventName, listener);
    domainEvents.dispatch(eventName, payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(payload);

    domainEvents.off(eventName, listener);
  });

  it('handles listener exceptions gracefully without throwing', () => {
    const errorListener = jest.fn().mockImplementation(() => {
      throw new Error('Listener failed');
    });
    const eventName = 'ErrorEvent';

    domainEvents.on(eventName, errorListener);
    expect(() => domainEvents.dispatch(eventName, { test: true })).not.toThrow();

    domainEvents.off(eventName, errorListener);
  });

  it('defines expected tender event constants', () => {
    expect(TENDER_EVENTS).toEqual({
      SUBMITTED: 'TenderSubmitted',
      APPROVED: 'TenderApproved',
      PUBLISHED: 'TenderPublished',
      CLOSED: 'TenderClosed',
      AWARDED: 'TenderAwarded',
    });
  });
});
