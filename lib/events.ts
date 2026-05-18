export type DashboardEventMessage = {
  id?: string;
  event: string;
  data: unknown;
};

type EventSubscriber = (message: DashboardEventMessage) => void;

const subscribers = new Set<EventSubscriber>();

export function subscribe(subscriber: EventSubscriber): void {
  subscribers.add(subscriber);
}

export function unsubscribe(subscriber: EventSubscriber): void {
  subscribers.delete(subscriber);
}

export function broadcast(message: DashboardEventMessage): void {
  for (const subscriber of subscribers) {
    try {
      subscriber(message);
    } catch (error) {
      console.error("Failed to deliver dashboard event", error);
    }
  }
}
