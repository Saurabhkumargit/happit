const AUTH_CHANNEL_NAME = "happit-auth";

export type AuthEvent = "LOGGED_OUT" | "ACCOUNT_DELETED";

export function createAuthChannel() {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(AUTH_CHANNEL_NAME);
}

export function broadcastAuthEvent(event: AuthEvent) {
  const channel = createAuthChannel();

  if (!channel) {
    return;
  }

  channel.postMessage(event);
  channel.close();
}